"""
Anomaly endpoints
Anomaly detection and management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Metric, Device, DataSource
from app.models.anomaly import Anomaly
from app.schemas.anomaly import AnomalyCreate, AnomalyUpdate, AnomalyResponse, AnomalyQuery, AnomalyStatistics
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.post("/query", response_model=List[AnomalyResponse])
async def query_anomalies(
    query: AnomalyQuery,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Query anomalies with filters"""
    # Build base query
    stmt = (
        select(Anomaly)
        .join(Metric, Metric.id == Anomaly.metric_id)
        .join(Device, Device.id == Anomaly.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(DataSource.owner_id == current_user.id)
    )

    # Apply filters
    if query.metric_ids:
        stmt = stmt.where(Anomaly.metric_id.in_(query.metric_ids))

    if query.severity:
        stmt = stmt.where(Anomaly.severity.in_(query.severity))

    if query.acknowledged is not None:
        stmt = stmt.where(Anomaly.acknowledged == query.acknowledged)

    if query.start_time:
        stmt = stmt.where(Anomaly.timestamp >= query.start_time)

    if query.end_time:
        stmt = stmt.where(Anomaly.timestamp <= query.end_time)

    stmt = stmt.order_by(Anomaly.timestamp.desc()).offset(query.offset).limit(query.limit)

    result = await db.execute(stmt)
    anomalies = result.scalars().all()

    return anomalies


@router.get("/stats", response_model=AnomalyStatistics)
async def get_anomaly_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get anomaly statistics"""
    # Total count
    total_result = await db.execute(
        select(func.count(Anomaly.id))
        .join(Metric, Metric.id == Anomaly.metric_id)
        .join(Device, Device.id == Anomaly.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(DataSource.owner_id == current_user.id)
    )
    total = total_result.scalar() or 0

    # Count by severity
    severity_result = await db.execute(
        select(Anomaly.severity, func.count(Anomaly.id))
        .join(Metric, Metric.id == Anomaly.metric_id)
        .join(Device, Device.id == Anomaly.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(DataSource.owner_id == current_user.id)
        .group_by(Anomaly.severity)
    )
    by_severity = {str(row[0]): row[1] for row in severity_result.all()}

    # Count by acknowledged
    ack_result = await db.execute(
        select(Anomaly.acknowledged, func.count(Anomaly.id))
        .join(Metric, Metric.id == Anomaly.metric_id)
        .join(Device, Device.id == Anomaly.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(DataSource.owner_id == current_user.id)
        .group_by(Anomaly.acknowledged)
    )
    by_acknowledged = {str(row[0]): row[1] for row in ack_result.all()}

    # Recent count (last 24 hours)
    recent_time = datetime.utcnow() - timedelta(days=1)
    recent_result = await db.execute(
        select(func.count(Anomaly.id))
        .join(Metric, Metric.id == Anomaly.metric_id)
        .join(Device, Device.id == Anomaly.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(
            DataSource.owner_id == current_user.id,
            Anomaly.timestamp >= recent_time
        )
    )
    recent_count = recent_result.scalar() or 0

    return AnomalyStatistics(
        total=total,
        by_severity=by_severity,
        by_acknowledged=by_acknowledged,
        recent_count=recent_count
    )


@router.get("/recent", response_model=List[AnomalyResponse])
async def get_recent_anomalies(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get recent anomalies (last 24 hours)"""
    recent_time = datetime.utcnow() - timedelta(days=1)
    
    result = await db.execute(
        select(Anomaly)
        .join(Metric, Metric.id == Anomaly.metric_id)
        .join(Device, Device.id == Anomaly.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(
            DataSource.owner_id == current_user.id,
            Anomaly.timestamp >= recent_time
        )
        .order_by(Anomaly.timestamp.desc())
        .limit(limit)
    )
    anomalies = result.scalars().all()
    
    return anomalies


@router.post("/", response_model=AnomalyResponse, status_code=status.HTTP_201_CREATED)
async def create_anomaly(
    anomaly_in: AnomalyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new anomaly"""
    # Verify metric ownership
    result = await db.execute(
        select(Metric)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(Metric.id == anomaly_in.metric_id, DataSource.owner_id == current_user.id)
    )
    metric = result.scalar_one_or_none()

    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found"
        )

    anomaly = Anomaly(**anomaly_in.model_dump())
    db.add(anomaly)
    await db.commit()
    await db.refresh(anomaly)

    return anomaly


@router.put("/{anomaly_id}", response_model=AnomalyResponse)
async def update_anomaly(
    anomaly_id: UUID,
    anomaly_in: AnomalyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an anomaly (e.g., acknowledge)"""
    result = await db.execute(
        select(Anomaly)
        .join(Metric, Metric.id == Anomaly.metric_id)
        .join(Device, Device.id == Anomaly.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(Anomaly.id == anomaly_id, DataSource.owner_id == current_user.id)
    )
    anomaly = result.scalar_one_or_none()

    if not anomaly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anomaly not found"
        )

    update_data = anomaly_in.model_dump(exclude_unset=True)

    # acknowledged_by is authoritative from the authenticated user, never the client
    update_data.pop("acknowledged_by", None)

    # Set acknowledged metadata from the auth context when acknowledging
    if update_data.get("acknowledged"):
        anomaly.acknowledged_at = datetime.utcnow()
        anomaly.acknowledged_by = current_user.id

    for field, value in update_data.items():
        setattr(anomaly, field, value)

    await db.commit()
    await db.refresh(anomaly)

    return anomaly
