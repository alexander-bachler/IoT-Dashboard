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
import re

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


# ---------------------------------------------------------------------------
# Read endpoints used by the frontend measurements client
# (time-series / downsample / latest / statistics / range)
# ---------------------------------------------------------------------------

_INTERVAL_RE = re.compile(r"^\s*(\d+)\s*([a-zA-Z]+)\s*$")
_UNIT_ALIASES = {
    "s": "seconds", "sec": "seconds", "secs": "seconds", "second": "seconds", "seconds": "seconds",
    "m": "minutes", "min": "minutes", "mins": "minutes", "minute": "minutes", "minutes": "minutes",
    "h": "hours", "hr": "hours", "hrs": "hours", "hour": "hours", "hours": "hours",
    "d": "days", "day": "days", "days": "days",
    "w": "weeks", "week": "weeks", "weeks": "weeks",
}
# Whitelist of aggregation functions -> SQL (prevents injection via the function name)
_AGG_FUNCS = {
    "avg": "AVG", "average": "AVG", "mean": "AVG",
    "sum": "SUM", "min": "MIN", "max": "MAX", "count": "COUNT",
}


def _to_pg_interval(value: Optional[str], default: str = "1 hour") -> str:
    """Normalise a short/ISO interval (e.g. '15m', 'PT15M', '1h', 'P1D') to a
    safe Postgres interval literal such as '15 minutes'."""
    if not value:
        return default
    v = value.strip()

    # ISO-8601 duration: PT15M, PT1H, PT6H, P1D, PT30S, PT168H
    m = re.fullmatch(r"P(T?)(\d+)([SMHDW])", v, re.IGNORECASE)
    if m:
        after_t, num, unit = m.group(1).upper(), int(m.group(2)), m.group(3).upper()
        if unit == "M":
            word = "minutes" if after_t == "T" else None  # ignore ISO months
        else:
            word = {"S": "seconds", "H": "hours", "D": "days", "W": "weeks"}.get(unit)
        if word:
            return f"{num} {word}"

    # Short form like '15m', '1h', '30s', '1d'
    m = _INTERVAL_RE.fullmatch(v)
    if m:
        num, unit = int(m.group(1)), m.group(2).lower()
        word = _UNIT_ALIASES.get(unit)
        if word:
            return f"{num} {word}"

    # Already a plain Postgres interval ('15 minutes')
    if re.fullmatch(r"\d+\s+(seconds|minutes|hours|days|weeks)", v.lower()):
        return v.lower()

    return default


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
    """Aggregate measurements into time buckets via TimescaleDB time_bucket()."""
    agg = _AGG_FUNCS.get((aggregation or "avg").lower(), "AVG")
    pg_interval = _to_pg_interval(interval)

    stmt = text(
        f"""
        SELECT metric_id,
               time_bucket(CAST(:interval AS interval), time) AS bucket,
               {agg}(value) AS value
        FROM measurements
        WHERE metric_id IN :ids
          AND time >= :start_time AND time <= :end_time
        GROUP BY metric_id, bucket
        ORDER BY bucket ASC
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Time-series for one or more metrics; aggregated when an interval is given."""
    owned = await _owned_metrics(db, current_user, _parse_uuid_csv(metric_ids))
    if not owned:
        return []

    if interval:
        return await _bucketed_series(db, owned, start_time, end_time, interval, aggregation)

    # Raw points (no aggregation)
    stmt = (
        select(Measurement)
        .where(
            Measurement.metric_id.in_(list(owned.keys())),
            Measurement.time >= start_time,
            Measurement.time <= end_time,
        )
        .order_by(Measurement.time.asc())
    )
    if limit:
        stmt = stmt.limit(limit)

    rows = (await db.execute(stmt)).scalars().all()
    series: Dict[UUID, TimeSeriesData] = {}
    for mrow in rows:
        name, unit, _ = owned[mrow.metric_id]
        s = series.get(mrow.metric_id)
        if s is None:
            s = TimeSeriesData(metric_id=mrow.metric_id, metric_name=name, metric_unit=unit, data=[])
            series[mrow.metric_id] = s
        s.data.append(
            TimeSeriesDataPoint(time=mrow.time.isoformat(), value=float(mrow.value), quality=mrow.quality)
        )
    return list(series.values())


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
