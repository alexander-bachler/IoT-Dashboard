"""
Measurement endpoints
Time-series data queries
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Measurement, Metric, Device, DataSource
from app.schemas.measurement import (
    MeasurementCreate,
    MeasurementBatchCreate,
    MeasurementResponse,
    TimeSeriesQuery,
    TimeSeriesData,
    TimeSeriesDataPoint,
    MeasurementStats
)
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.post("/query", response_model=List[TimeSeriesData])
async def query_time_series(
    query: TimeSeriesQuery,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Query time-series data for multiple metrics"""
    # Verify metric ownership with optional data source filter
    stmt = (
        select(Metric.id)
        .join(Device)
        .join(DataSource)
        .where(
            Metric.id.in_(query.metric_ids),
            DataSource.owner_id == current_user.id
        )
    )

    # Apply data source filter if specified
    if query.data_source_ids:
        stmt = stmt.where(DataSource.id.in_(query.data_source_ids))

    result = await db.execute(stmt)
    owned_metric_ids = [row[0] for row in result.all()]

    if not owned_metric_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No metrics found"
        )

    time_series_data = []

    for metric_id in owned_metric_ids:
        # Get metric info
        metric_result = await db.execute(
            select(Metric).where(Metric.id == metric_id)
        )
        metric = metric_result.scalar_one()

        # Query measurements
        stmt = (
            select(Measurement)
            .where(
                Measurement.metric_id == metric_id,
                Measurement.timestamp >= query.start_time,
                Measurement.timestamp <= query.end_time
            )
            .order_by(Measurement.timestamp)
        )

        if query.limit:
            stmt = stmt.limit(query.limit)

        measurements_result = await db.execute(stmt)
        measurements = measurements_result.scalars().all()

        # Convert to data points
        data_points = [
            TimeSeriesDataPoint(
                time=m.timestamp.isoformat(),
                value=m.value,
                quality=m.quality
            )
            for m in measurements
        ]

        time_series_data.append(
            TimeSeriesData(
                metric_id=metric.id,
                metric_name=metric.name,
                metric_unit=metric.unit,
                data=data_points
            )
        )

    return time_series_data


@router.post("/", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(
    measurement_in: MeasurementCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a single measurement"""
    # Verify metric ownership
    result = await db.execute(
        select(Metric)
        .join(Device)
        .join(DataSource)
        .where(Metric.id == measurement_in.metric_id, DataSource.owner_id == current_user.id)
    )
    metric = result.scalar_one_or_none()

    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found"
        )

    measurement = Measurement(**measurement_in.dict())
    db.add(measurement)
    await db.commit()
    await db.refresh(measurement)

    return measurement


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_measurements_batch(
    batch: MeasurementBatchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create multiple measurements in batch"""
    # Get all unique metric IDs
    metric_ids = list(set(m.metric_id for m in batch.measurements))

    # Verify metric ownership
    result = await db.execute(
        select(Metric.id)
        .join(Device)
        .join(DataSource)
        .where(Metric.id.in_(metric_ids), DataSource.owner_id == current_user.id)
    )
    owned_metric_ids = set(row[0] for row in result.all())

    # Filter measurements to only owned metrics
    valid_measurements = [
        m for m in batch.measurements
        if m.metric_id in owned_metric_ids
    ]

    if not valid_measurements:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid metrics found"
        )

    # Bulk insert
    measurements = [Measurement(**m.dict()) for m in valid_measurements]
    db.add_all(measurements)
    await db.commit()

    return {"count": len(measurements), "message": "Measurements created successfully"}


@router.get("/stats", response_model=MeasurementStats)
async def get_measurement_stats(
    metric_id: int,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for measurements"""
    # Verify metric ownership
    result = await db.execute(
        select(Metric)
        .join(Device)
        .join(DataSource)
        .where(Metric.id == metric_id, DataSource.owner_id == current_user.id)
    )
    metric = result.scalar_one_or_none()

    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found"
        )

    # Build query
    query = select(
        func.count(Measurement.id).label("count"),
        func.min(Measurement.value).label("min"),
        func.max(Measurement.value).label("max"),
        func.avg(Measurement.value).label("avg"),
        func.sum(Measurement.value).label("sum"),
        func.min(Measurement.timestamp).label("first_timestamp"),
        func.max(Measurement.timestamp).label("last_timestamp"),
    ).where(Measurement.metric_id == metric_id)

    if start_time:
        query = query.where(Measurement.timestamp >= start_time)
    if end_time:
        query = query.where(Measurement.timestamp <= end_time)

    result = await db.execute(query)
    stats = result.one()

    return MeasurementStats(
        count=stats.count,
        min=stats.min,
        max=stats.max,
        avg=stats.avg,
        sum=stats.sum,
        first_timestamp=stats.first_timestamp,
        last_timestamp=stats.last_timestamp
    )
