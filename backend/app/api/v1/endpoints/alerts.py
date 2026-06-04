"""
Alert endpoints: threshold rules + the events they trigger.

Rules are owner-scoped through their metric (metric -> device -> data source ->
owner). `evaluate` checks recent measurements against a rule and records an
AlertEvent per breach. Notification *delivery* is intentionally a stub (the
chosen channels are stored on the rule; actual sending is future work).
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Metric, Device, DataSource, Measurement
from app.models.alert import AlertRule, AlertEvent
from app.schemas.alert import (
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertRuleResponse,
    AlertEventResponse,
    AlertEvaluationResult,
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.alert_rules import ALERT_CONDITIONS, ALERT_SEVERITIES, find_breaches

logger = logging.getLogger(__name__)
router = APIRouter()

# Cap how many events a single evaluation may create, to avoid flooding.
_MAX_EVENTS_PER_EVALUATION = 100


def _validate_rule_fields(condition: Optional[str], severity: Optional[str]) -> None:
    if condition is not None and condition not in ALERT_CONDITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"condition must be one of {sorted(ALERT_CONDITIONS)}",
        )
    if severity is not None and severity not in ALERT_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"severity must be one of {sorted(ALERT_SEVERITIES)}",
        )


async def _owns_metric(db: AsyncSession, user: User, metric_id: UUID) -> bool:
    result = await db.execute(
        select(Metric.id)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(Metric.id == metric_id, DataSource.owner_id == user.id)
    )
    return result.scalar_one_or_none() is not None


def _owned_rules_query(user: User):
    return (
        select(AlertRule)
        .join(Metric, Metric.id == AlertRule.metric_id)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(DataSource.owner_id == user.id)
    )


async def _get_owned_rule(db: AsyncSession, user: User, rule_id: UUID) -> AlertRule:
    result = await db.execute(_owned_rules_query(user).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    return rule


def _dispatch_notifications(rule: AlertRule, events: List[AlertEvent]) -> None:
    """STUB: real channel delivery (email/webhook/sms) is not implemented yet."""
    if events and rule.notification_channels:
        logger.info(
            "Alert rule %s triggered %d event(s); channels=%s (delivery not implemented)",
            rule.id, len(events), rule.notification_channels,
        )


# --------------------------------- Rules ---------------------------------

@router.get("/rules", response_model=List[AlertRuleResponse])
async def list_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(_owned_rules_query(current_user).order_by(AlertRule.created_at.desc()))
    return result.scalars().all()


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule_in: AlertRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_rule_fields(rule_in.condition, rule_in.severity)
    if not await _owns_metric(db, current_user, rule_in.metric_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metric not found")

    rule = AlertRule(**rule_in.dict())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/rules/{rule_id}", response_model=AlertRuleResponse)
async def get_rule(
    rule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_rule(db, current_user, rule_id)


@router.put("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(
    rule_id: UUID,
    rule_in: AlertRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = await _get_owned_rule(db, current_user, rule_id)
    data = rule_in.dict(exclude_unset=True)
    _validate_rule_fields(data.get("condition"), data.get("severity"))
    for field, value in data.items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = await _get_owned_rule(db, current_user, rule_id)
    await db.delete(rule)
    await db.commit()
    return None


@router.post("/rules/{rule_id}/evaluate", response_model=AlertEvaluationResult)
async def evaluate_rule(
    rule_id: UUID,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check the rule's metric over a time range and record an event per breach."""
    rule = await _get_owned_rule(db, current_user, rule_id)
    end = end_time or datetime.now(timezone.utc)
    start = start_time or (end - timedelta(days=1))

    rows = (
        await db.execute(
            select(Measurement.time, Measurement.value)
            .where(
                Measurement.metric_id == rule.metric_id,
                Measurement.time >= start,
                Measurement.time <= end,
            )
            .order_by(Measurement.time.asc())
            .limit(5000)
        )
    ).all()
    points = [(t, float(v)) for (t, v) in rows]

    breaches = find_breaches(points, rule.condition, rule.threshold)[:_MAX_EVENTS_PER_EVALUATION]

    now = datetime.now(timezone.utc)
    created: List[AlertEvent] = []
    for mtime, mvalue in breaches:
        event = AlertEvent(
            alert_rule_id=rule.id,
            triggered_at=now,
            measurement_value=mvalue,
            measurement_time=mtime,
            status="active",
        )
        db.add(event)
        created.append(event)

    if created:
        rule.last_triggered = now

    await db.commit()
    for event in created:
        await db.refresh(event)

    _dispatch_notifications(rule, created)

    return AlertEvaluationResult(
        rule_id=rule.id,
        evaluated_points=len(points),
        breaches=len(breaches),
        events=created,
    )


# --------------------------------- Events ---------------------------------

@router.get("/events", response_model=List[AlertEventResponse])
async def list_events(
    status_filter: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(AlertEvent)
        .join(AlertRule, AlertRule.id == AlertEvent.alert_rule_id)
        .join(Metric, Metric.id == AlertRule.metric_id)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(DataSource.owner_id == current_user.id)
    )
    if status_filter:
        query = query.where(AlertEvent.status == status_filter)
    query = query.order_by(AlertEvent.triggered_at.desc()).limit(limit)
    return (await db.execute(query)).scalars().all()


@router.post("/events/{event_id}/acknowledge", response_model=AlertEventResponse)
async def acknowledge_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertEvent)
        .join(AlertRule, AlertRule.id == AlertEvent.alert_rule_id)
        .join(Metric, Metric.id == AlertRule.metric_id)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(AlertEvent.id == event_id, DataSource.owner_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert event not found")

    event.status = "acknowledged"
    event.acknowledged_by = current_user.username or current_user.email
    event.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(event)
    return event
