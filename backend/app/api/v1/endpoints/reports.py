"""
Scheduled report endpoints.

CRUD for report definitions plus on-demand generation: for a 'metrics' report
the configured metrics are summarised (count/min/max/avg/sum) over a time range
and returned as structured sections + CSV. A report_history row is recorded.

NOT implemented (left as stubs): cron scheduling, PDF/Excel rendering and e-mail
delivery. `generate` returns the data and flags delivered=False.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Metric, Device, DataSource, Measurement
from app.models.report import ScheduledReport, ReportHistory
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportHistoryResponse,
    ReportGenerationResult,
    ReportSection,
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.report_generator import (
    REPORT_TYPES,
    REPORT_FORMATS,
    summarize_values,
    sections_to_csv,
)

router = APIRouter()


def _validate(report_type: Optional[str], report_format: Optional[str]) -> None:
    if report_type is not None and report_type not in REPORT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"type must be one of {sorted(REPORT_TYPES)}",
        )
    if report_format is not None and report_format not in REPORT_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"format must be one of {sorted(REPORT_FORMATS)}",
        )


async def _get_owned_report(db: AsyncSession, user: User, report_id: UUID) -> ScheduledReport:
    result = await db.execute(
        select(ScheduledReport).where(
            ScheduledReport.id == report_id,
            ScheduledReport.created_by == user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


async def _owned_metrics(
    db: AsyncSession, user: User, metric_ids: List[UUID]
) -> Dict[UUID, Tuple[str, Optional[str]]]:
    if not metric_ids:
        return {}
    result = await db.execute(
        select(Metric.id, Metric.name, Metric.unit)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(Metric.id.in_(metric_ids), DataSource.owner_id == user.id)
    )
    return {row[0]: (row[1], row[2]) for row in result.all()}


def _parse_uuids(values) -> List[UUID]:
    out: List[UUID] = []
    for v in values or []:
        try:
            out.append(UUID(str(v)))
        except (ValueError, TypeError):
            continue
    return out


# --------------------------------- CRUD ---------------------------------

@router.get("/", response_model=List[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScheduledReport)
        .where(ScheduledReport.created_by == current_user.id)
        .order_by(ScheduledReport.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_in: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _validate(report_in.type, report_in.format)
    report = ScheduledReport(**report_in.dict(), created_by=current_user.id)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_report(db, current_user, report_id)


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: UUID,
    report_in: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await _get_owned_report(db, current_user, report_id)
    data = report_in.dict(exclude_unset=True)
    _validate(data.get("type"), data.get("format"))
    for field, value in data.items():
        setattr(report, field, value)
    await db.commit()
    await db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await _get_owned_report(db, current_user, report_id)
    await db.delete(report)
    await db.commit()
    return None


# ------------------------------ Generation ------------------------------

@router.post("/{report_id}/generate", response_model=ReportGenerationResult)
async def generate_report(
    report_id: UUID,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate the report now (summary statistics per configured metric)."""
    report = await _get_owned_report(db, current_user, report_id)
    config = report.configuration or {}

    end = end_time or datetime.now(timezone.utc)
    start = start_time or (end - timedelta(days=7))

    metric_ids = _parse_uuids(config.get("metric_ids"))
    owned = await _owned_metrics(db, current_user, metric_ids)

    sections: List[ReportSection] = []
    for metric_id, (name, unit) in owned.items():
        rows = (
            await db.execute(
                select(Measurement.value).where(
                    Measurement.metric_id == metric_id,
                    Measurement.time >= start,
                    Measurement.time <= end,
                )
            )
        ).all()
        values = [float(v) for (v,) in rows]
        sections.append(
            ReportSection(
                metric_id=str(metric_id),
                metric_name=name,
                unit=unit,
                stats=summarize_values(values),
            )
        )

    csv_text = sections_to_csv([s.dict() for s in sections])
    now = datetime.now(timezone.utc)

    history = ReportHistory(
        report_id=report.id,
        status="completed",
        completed_at=now,
        file_size=str(len(csv_text)),
    )
    db.add(history)
    report.last_run = now
    await db.commit()

    return ReportGenerationResult(
        report_id=report.id,
        generated_at=now,
        type=report.type,
        format=report.format,
        sections=sections,
        csv=csv_text,
        delivered=False,
        note=(
            "Generated report data. Delivery (PDF/Excel rendering, e-mail) and "
            "cron scheduling are not implemented yet."
        ),
    )


@router.get("/{report_id}/history", response_model=List[ReportHistoryResponse])
async def report_history(
    report_id: UUID,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_report(db, current_user, report_id)  # ownership check
    result = await db.execute(
        select(ReportHistory)
        .where(ReportHistory.report_id == report_id)
        .order_by(ReportHistory.started_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
