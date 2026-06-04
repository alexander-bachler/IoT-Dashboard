"""
Measurement endpoints
Time-series data queries
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, delete, bindparam
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timezone, timedelta
from uuid import UUID

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
from app.services.timeseries import (
    AGG_FUNCS as _AGG_FUNCS,
    CAGG_VALUE_EXPR as _CAGG_VALUE_EXPR,
    to_pg_interval as _to_pg_interval,
    continuous_aggregate_for as _continuous_aggregate_for,
    lttb_indices as _lttb_indices,
)

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
                Measurement.time >= query.start_time,
                Measurement.time <= query.end_time
            )
            .order_by(Measurement.time)
        )

        if query.limit:
            stmt = stmt.limit(query.limit)

        measurements_result = await db.execute(stmt)
        measurements = measurements_result.scalars().all()

        # Convert to data points
        data_points = [
            TimeSeriesDataPoint(
                time=m.time.isoformat(),
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
    metric_id: UUID,
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
        func.count(Measurement.time).label("count"),
        func.min(Measurement.value).label("min"),
        func.max(Measurement.value).label("max"),
        func.avg(Measurement.value).label("avg"),
        func.sum(Measurement.value).label("sum"),
        func.min(Measurement.time).label("first_timestamp"),
        func.max(Measurement.time).label("last_timestamp"),
    ).where(Measurement.metric_id == metric_id)

    if start_time:
        query = query.where(Measurement.time >= start_time)
    if end_time:
        query = query.where(Measurement.time <= end_time)

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


# ---------------------------------------------------------------------------
# Read endpoints used by the frontend measurements client
# (time-series / downsample / latest / statistics / range)
# ---------------------------------------------------------------------------

# Pure helpers (interval normalisation, continuous-aggregate selection, LTTB)
# live in app.services.timeseries and are imported at the top of this module.


def _parse_uuid_csv(value: Optional[str]) -> List[UUID]:
    """Parse a comma-separated list of UUIDs, skipping invalid entries."""
    ids: List[UUID] = []
    for part in (value or "").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(UUID(part))
        except ValueError:
            continue
    return ids


async def _owned_metrics(
    db: AsyncSession, user: User, metric_ids: List[UUID]
) -> Dict[UUID, Tuple[str, Optional[str], UUID]]:
    """Return {metric_id: (name, unit, device_id)} for metrics owned by the user."""
    if not metric_ids:
        return {}
    result = await db.execute(
        select(Metric.id, Metric.name, Metric.unit, Metric.device_id)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(Metric.id.in_(metric_ids), DataSource.owner_id == user.id)
    )
    return {row[0]: (row[1], row[2], row[3]) for row in result.all()}


async def _bucketed_series(
    db: AsyncSession,
    owned: Dict[UUID, Tuple[str, Optional[str], UUID]],
    start_time: datetime,
    end_time: datetime,
    interval: Optional[str],
    aggregation: Optional[str],
) -> List[TimeSeriesData]:
    """Aggregate measurements into time buckets via TimescaleDB time_bucket().

    For coarse intervals (whole hours/days) the query is served from the
    pre-materialized continuous aggregates instead of the raw hypertable, which
    avoids scanning every raw row over long time ranges. Finer/odd intervals
    fall back to the raw `measurements` table. The view name and aggregation
    expression come from internal whitelists, and the interval is normalised, so
    the f-string interpolation below is not user-controlled.
    """
    agg = _AGG_FUNCS.get((aggregation or "avg").lower(), "AVG")
    pg_interval = _to_pg_interval(interval)
    view = _continuous_aggregate_for(pg_interval)

    if view:
        value_expr = _CAGG_VALUE_EXPR[agg]
        stmt = text(
            f"""
            SELECT metric_id,
                   time_bucket(CAST(:interval AS interval), bucket) AS b,
                   {value_expr} AS value
            FROM {view}
            WHERE metric_id IN :ids
              AND bucket >= :start_time AND bucket <= :end_time
            GROUP BY metric_id, time_bucket(CAST(:interval AS interval), bucket)
            ORDER BY b ASC
            """
        ).bindparams(bindparam("ids", expanding=True))
    else:
        stmt = text(
            f"""
            SELECT metric_id,
                   time_bucket(CAST(:interval AS interval), time) AS b,
                   {agg}(value) AS value
            FROM measurements
            WHERE metric_id IN :ids
              AND time >= :start_time AND time <= :end_time
            GROUP BY metric_id, time_bucket(CAST(:interval AS interval), time)
            ORDER BY b ASC
            """
        ).bindparams(bindparam("ids", expanding=True))

    result = await db.execute(
        stmt,
        {
            "interval": pg_interval,
            "ids": list(owned.keys()),
            "start_time": start_time,
            "end_time": end_time,
        },
    )

    series: Dict[UUID, TimeSeriesData] = {}
    for metric_id, bucket, value in result.all():
        name, unit, _ = owned[metric_id]
        s = series.get(metric_id)
        if s is None:
            s = TimeSeriesData(metric_id=metric_id, metric_name=name, metric_unit=unit, data=[])
            series[metric_id] = s
        s.data.append(
            TimeSeriesDataPoint(
                time=bucket.isoformat() if bucket else "",
                value=float(value) if value is not None else 0.0,
            )
        )
    return list(series.values())


@router.get("/time-series", response_model=List[TimeSeriesData])
async def get_time_series(
    metric_ids: str,
    start_time: datetime,
    end_time: datetime,
    interval: Optional[str] = None,
    aggregation: Optional[str] = None,
    limit: Optional[int] = 10000,
    max_points: Optional[int] = 2000,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Time-series for one or more metrics.

    When an `interval` is given the data is aggregated (served from the
    continuous aggregates where possible). Otherwise raw points are returned,
    reduced per-metric to `max_points` via LTTB so large ranges stay responsive
    without losing the shape of the signal.
    """
    owned = await _owned_metrics(db, current_user, _parse_uuid_csv(metric_ids))
    if not owned:
        return []

    if interval:
        return await _bucketed_series(db, owned, start_time, end_time, interval, aggregation)

    # Raw points (no aggregation). Query per metric so both the row cap (`limit`)
    # and LTTB reduction apply per series — a single shared query with a global
    # LIMIT would truncate every metric at the same global cut-off, dropping the
    # tail of all series. Sequential awaits keep the AsyncSession safe.
    series: List[TimeSeriesData] = []
    for metric_id, (name, unit, _device) in owned.items():
        stmt = (
            select(Measurement)
            .where(
                Measurement.metric_id == metric_id,
                Measurement.time >= start_time,
                Measurement.time <= end_time,
            )
            .order_by(Measurement.time.asc())
        )
        if limit:
            stmt = stmt.limit(limit)

        mrows = (await db.execute(stmt)).scalars().all()
        if not mrows:
            continue

        # Visually-lossless point reduction for large raw series (LTTB).
        if max_points and len(mrows) > max_points:
            xs = [m.time.timestamp() for m in mrows]
            ys = [float(m.value) for m in mrows]
            mrows = [mrows[k] for k in _lttb_indices(xs, ys, max_points)]

        series.append(
            TimeSeriesData(
                metric_id=metric_id,
                metric_name=name,
                metric_unit=unit,
                data=[
                    TimeSeriesDataPoint(
                        time=m.time.isoformat(), value=float(m.value), quality=m.quality
                    )
                    for m in mrows
                ],
            )
        )
    return series


@router.get("/downsample", response_model=List[TimeSeriesData])
async def get_downsampled(
    metric_ids: str,
    bucket_size: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    aggregation: Optional[str] = "avg",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Downsampled time-series for visualization (always bucketed)."""
    owned = await _owned_metrics(db, current_user, _parse_uuid_csv(metric_ids))
    if not owned:
        return []
    end = end_time or datetime.now(timezone.utc)
    start = start_time or (end - timedelta(days=1))
    return await _bucketed_series(db, owned, start, end, bucket_size, aggregation)


@router.get("/latest", response_model=List[MeasurementResponse])
async def get_latest(
    metric_ids: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Most recent measurement per metric."""
    owned = await _owned_metrics(db, current_user, _parse_uuid_csv(metric_ids))
    if not owned:
        return []
    stmt = (
        select(Measurement)
        .where(Measurement.metric_id.in_(list(owned.keys())))
        .distinct(Measurement.metric_id)
        .order_by(Measurement.metric_id, Measurement.time.desc())
    )
    return (await db.execute(stmt)).scalars().all()


@router.get("/statistics")
async def get_statistics(
    metric_id: UUID,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate statistics (avg/min/max/sum/count/std_dev) for a single metric."""
    owned = await _owned_metrics(db, current_user, [metric_id])
    if not owned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metric not found")

    conditions = [Measurement.metric_id == metric_id]
    if start_time:
        conditions.append(Measurement.time >= start_time)
    if end_time:
        conditions.append(Measurement.time <= end_time)

    row = (
        await db.execute(
            select(
                func.count(Measurement.value),
                func.min(Measurement.value),
                func.max(Measurement.value),
                func.avg(Measurement.value),
                func.sum(Measurement.value),
                func.stddev_samp(Measurement.value),
            ).where(*conditions)
        )
    ).one()

    return {
        "count": row[0] or 0,
        "min": row[1],
        "max": row[2],
        "avg": row[3],
        "sum": row[4],
        "std_dev": row[5],
    }


@router.delete("/range")
async def delete_range(
    metric_id: UUID,
    start_time: datetime,
    end_time: datetime,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete measurements of a metric within a time range."""
    owned = await _owned_metrics(db, current_user, [metric_id])
    if not owned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metric not found")

    result = await db.execute(
        delete(Measurement).where(
            Measurement.metric_id == metric_id,
            Measurement.time >= start_time,
            Measurement.time <= end_time,
        )
    )
    await db.commit()
    return {"count": result.rowcount or 0}
