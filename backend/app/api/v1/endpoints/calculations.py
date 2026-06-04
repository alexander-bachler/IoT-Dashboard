"""
Custom calculation endpoints.

CRUD for derived-metric definitions plus evaluation: a calculation's formula is
evaluated row-wise over the time-bucketed values of its source metrics (aligned
on common buckets) to produce a derived series.
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Set
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text, bindparam
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Metric, Device, DataSource
from app.models.calculation import CustomCalculation
from app.schemas.calculation import (
    AGGREGATION_TYPES,
    CalculationCreate,
    CalculationUpdate,
    CalculationResponse,
    CalculationPreview,
    CalculationResult,
)
from app.schemas.measurement import TimeSeriesDataPoint
from app.api.v1.endpoints.auth import get_current_user
from app.services.formula_evaluator import validate_formula, evaluate, FormulaError
from app.services.timeseries import to_pg_interval

router = APIRouter()


def _check_aggregation(agg_type: str) -> None:
    if agg_type not in AGGREGATION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"aggregation_type must be one of {sorted(AGGREGATION_TYPES)}",
        )


def _aggregate(agg_type: str, values: List[float]):
    if not values or agg_type in (None, "none", ""):
        return None
    if agg_type == "sum":
        return sum(values)
    if agg_type == "avg":
        return sum(values) / len(values)
    if agg_type == "min":
        return min(values)
    if agg_type == "max":
        return max(values)
    return None


async def _owned_metric_ids(db: AsyncSession, user: User, metric_ids: List[UUID]) -> Set[UUID]:
    if not metric_ids:
        return set()
    result = await db.execute(
        select(Metric.id)
        .join(Device, Device.id == Metric.device_id)
        .join(DataSource, DataSource.id == Device.data_source_id)
        .where(Metric.id.in_(metric_ids), DataSource.owner_id == user.id)
    )
    return {row[0] for row in result.all()}


async def _evaluate_series(
    db: AsyncSession,
    user: User,
    formula: str,
    source_metric_ids: Dict[str, UUID],
    start: datetime,
    end: datetime,
    interval: str | None,
    aggregation_type: str,
):
    """Validate, fetch source series, align on common buckets and evaluate."""
    try:
        variables = validate_formula(formula, allowed_vars=list(source_metric_ids.keys()))
    except FormulaError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Only the metrics actually referenced by the formula.
    var_metric: Dict[str, UUID] = {v: source_metric_ids[v] for v in variables}
    metric_ids = list(set(var_metric.values()))
    pg_interval = to_pg_interval(interval)

    if not metric_ids:
        return [], None, pg_interval

    owned = await _owned_metric_ids(db, user, metric_ids)
    if any(m not in owned for m in metric_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more source metrics not found",
        )

    stmt = text(
        """
        SELECT metric_id,
               time_bucket(CAST(:interval AS interval), time) AS bucket,
               AVG(value) AS value
        FROM measurements
        WHERE metric_id IN :ids AND time >= :start_time AND time <= :end_time
        GROUP BY metric_id, time_bucket(CAST(:interval AS interval), time)
        """
    ).bindparams(bindparam("ids", expanding=True))
    rows = (
        await db.execute(
            stmt,
            {"interval": pg_interval, "ids": metric_ids, "start_time": start, "end_time": end},
        )
    ).all()

    by_metric: Dict[UUID, Dict[datetime, float]] = defaultdict(dict)
    for metric_id, bucket, value in rows:
        if value is not None:
            by_metric[metric_id][bucket] = float(value)

    # Align on buckets present for every referenced metric (inner join on time).
    bucket_sets = [set(by_metric.get(m, {}).keys()) for m in metric_ids]
    common = set.intersection(*bucket_sets) if bucket_sets else set()

    data: List[TimeSeriesDataPoint] = []
    for bucket in sorted(common):
        vars_at = {v: by_metric[m][bucket] for v, m in var_metric.items()}
        try:
            result = evaluate(formula, vars_at)
        except (FormulaError, ZeroDivisionError, ValueError, OverflowError):
            continue
        data.append(TimeSeriesDataPoint(time=bucket.isoformat(), value=float(result)))

    aggregate = _aggregate(aggregation_type, [p.value for p in data])
    return data, aggregate, pg_interval


def _range(start: datetime | None, end: datetime | None):
    end = end or datetime.now(timezone.utc)
    start = start or (end - timedelta(days=7))
    return start, end


# --------------------------------- CRUD ---------------------------------

@router.get("/", response_model=List[CalculationResponse])
async def list_calculations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomCalculation)
        .where(CustomCalculation.created_by == current_user.id)
        .order_by(CustomCalculation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=CalculationResponse, status_code=status.HTTP_201_CREATED)
async def create_calculation(
    calc_in: CalculationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_aggregation(calc_in.aggregation_type)
    try:
        validate_formula(calc_in.formula, allowed_vars=list(calc_in.source_metric_ids.keys()))
    except FormulaError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    metric_ids = list(set(calc_in.source_metric_ids.values()))
    owned = await _owned_metric_ids(db, current_user, metric_ids)
    if any(m not in owned for m in metric_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more source metrics not found",
        )

    calc = CustomCalculation(
        name=calc_in.name,
        description=calc_in.description,
        formula=calc_in.formula,
        source_metric_ids={k: str(v) for k, v in calc_in.source_metric_ids.items()},
        unit=calc_in.unit,
        aggregation_type=calc_in.aggregation_type,
        created_by=current_user.id,
    )
    db.add(calc)
    await db.commit()
    await db.refresh(calc)
    return calc


async def _get_owned(db: AsyncSession, user: User, calc_id: UUID) -> CustomCalculation:
    result = await db.execute(
        select(CustomCalculation).where(
            CustomCalculation.id == calc_id,
            CustomCalculation.created_by == user.id,
        )
    )
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")
    return calc


@router.get("/{calc_id}", response_model=CalculationResponse)
async def get_calculation(
    calc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned(db, current_user, calc_id)


@router.put("/{calc_id}", response_model=CalculationResponse)
async def update_calculation(
    calc_id: UUID,
    calc_in: CalculationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    calc = await _get_owned(db, current_user, calc_id)
    data = calc_in.dict(exclude_unset=True)

    if "aggregation_type" in data and data["aggregation_type"] is not None:
        _check_aggregation(data["aggregation_type"])

    # Re-validate the formula against the (possibly updated) variable mapping.
    new_formula = data.get("formula", calc.formula)
    new_sources = data.get("source_metric_ids")
    source_keys = list(new_sources.keys()) if new_sources is not None else list(calc.source_metric_ids.keys())
    if "formula" in data or new_sources is not None:
        try:
            validate_formula(new_formula, allowed_vars=source_keys)
        except FormulaError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if new_sources is not None:
        metric_ids = list(set(new_sources.values()))
        owned = await _owned_metric_ids(db, current_user, metric_ids)
        if any(m not in owned for m in metric_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more source metrics not found",
            )
        data["source_metric_ids"] = {k: str(v) for k, v in new_sources.items()}

    for field, value in data.items():
        setattr(calc, field, value)
    await db.commit()
    await db.refresh(calc)
    return calc


@router.delete("/{calc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calculation(
    calc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    calc = await _get_owned(db, current_user, calc_id)
    await db.delete(calc)
    await db.commit()
    return None


# ------------------------------ Evaluation ------------------------------

@router.post("/preview", response_model=CalculationResult)
async def preview_calculation(
    preview: CalculationPreview,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate an ad-hoc (unsaved) calculation — useful for live editing."""
    _check_aggregation(preview.aggregation_type)
    start, end = _range(preview.start_time, preview.end_time)
    data, aggregate, pg_interval = await _evaluate_series(
        db, current_user, preview.formula, preview.source_metric_ids,
        start, end, preview.interval, preview.aggregation_type,
    )
    return CalculationResult(
        name=None, unit=None, interval=pg_interval,
        data=data, aggregate=aggregate, points=len(data),
    )


@router.post("/{calc_id}/evaluate", response_model=CalculationResult)
async def evaluate_calculation(
    calc_id: UUID,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    interval: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate a saved calculation over a time range."""
    calc = await _get_owned(db, current_user, calc_id)
    source = {k: UUID(str(v)) for k, v in calc.source_metric_ids.items()}
    start, end = _range(start_time, end_time)
    data, aggregate, pg_interval = await _evaluate_series(
        db, current_user, calc.formula, source,
        start, end, interval or "1 hour", calc.aggregation_type,
    )
    return CalculationResult(
        name=calc.name, unit=calc.unit, interval=pg_interval,
        data=data, aggregate=aggregate, points=len(data),
    )
