"""
Anomaly endpoints
Anomaly detection and management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Metric, Device, DataSource
from app.models.anomaly import Anomaly, AnomalySeverity, AnomalyStatus
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
        .join(Metric)
        .join(Device)
        .join(DataSource)
        .where(DataSource.owner_id == current_user.id)
    )

    # Apply filters
    if query.metric_ids:
        stmt = stmt.where(Anomaly.metric_id.in_(query.metric_ids))

    if query.severity:
        stmt = stmt.where(Anomaly.severity.in_(query.severity))

    if query.status:
        stmt = stmt.where(Anomaly.status.in_(query.status))

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
        .join(Metric)
        .join(Device)
        .join(DataSource)
        .where(DataSource.owner_id == current_user.id)
    )
    total = total_result.scalar() or 0

    # Count by severity
    severity_result = await db.execute(
        select(Anomaly.severity, func.count(Anomaly.id))
        .join(Metric)
        .join(Device)
        .join(DataSource)
        .where(DataSource.owner_id == current_user.id)
        .group_by(Anomaly.severity)
    )
    by_severity = {row[0].value: row[1] for row in severity_result.all()}

    # Count by status
    status_result = await db.execute(
        select(Anomaly.status, func.count(Anomaly.id))
        .join(Metric)
        .join(Device)
        .join(DataSource)
        .where(DataSource.owner_id == current_user.id)
        .group_by(Anomaly.status)
    )
    by_status = {row[0].value: row[1] for row in status_result.all()}

    # Recent count (last 24 hours)
    from datetime import datetime, timedelta
    recent_time = datetime.utcnow() - timedelta(days=1)
    recent_result = await db.execute(
        select(func.count(Anomaly.id))
        .join(Metric)
        .join(Device)
        .join(DataSource)
        .where(
            DataSource.owner_id == current_user.id,
            Anomaly.timestamp >= recent_time
        )
    )
    recent_count = recent_result.scalar() or 0

    return AnomalyStatistics(
        total=total,
        by_severity=by_severity,
        by_status=by_status,
        recent_count=recent_count
    )


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
        .join(Device)
        .join(DataSource)
        .where(Metric.id == anomaly_in.metric_id, DataSource.owner_id == current_user.id)
    )
    metric = result.scalar_one_or_none()

    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found"
        )

    anomaly = Anomaly(**anomaly_in.dict())
    db.add(anomaly)
    await db.commit()
    await db.refresh(anomaly)

    return anomaly


@router.put("/{anomaly_id}", response_model=AnomalyResponse)
async def update_anomaly(
    anomaly_id: int,
    anomaly_in: AnomalyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an anomaly (e.g., acknowledge)"""
    result = await db.execute(
        select(Anomaly)
        .join(Metric)
        .join(Device)
        .join(DataSource)
        .where(Anomaly.id == anomaly_id, DataSource.owner_id == current_user.id)
    )
    anomaly = result.scalar_one_or_none()

    if not anomaly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anomaly not found"
        )

    update_data = anomaly_in.dict(exclude_unset=True)

    # Set acknowledged timestamp if acknowledging
    if "status" in update_data and update_data["status"] == AnomalyStatus.ACKNOWLEDGED:
        from datetime import datetime
        anomaly.acknowledged_at = datetime.utcnow()

    for field, value in update_data.items():
        setattr(anomaly, field, value)

    await db.commit()
    await db.refresh(anomaly)

    return anomaly
