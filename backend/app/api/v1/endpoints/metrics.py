"""
Metric endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Metric, Device, DataSource
from app.schemas.device import MetricCreate, MetricUpdate, MetricResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[MetricResponse])
async def get_metrics(
    device_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all metrics, optionally filtered by device"""
    query = (
        select(Metric)
        .join(Device)
        .join(DataSource)
        .where(DataSource.owner_id == current_user.id)
    )

    if device_id:
        query = query.where(Metric.device_id == device_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    metrics = result.scalars().all()

    return metrics


@router.post("/", response_model=MetricResponse, status_code=status.HTTP_201_CREATED)
async def create_metric(
    metric_in: MetricCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new metric"""
    # Verify device ownership
    result = await db.execute(
        select(Device)
        .join(DataSource)
        .where(Device.id == metric_in.device_id, DataSource.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    metric = Metric(**metric_in.dict())
    db.add(metric)
    await db.commit()
    await db.refresh(metric)

    return metric


@router.put("/{metric_id}", response_model=MetricResponse)
async def update_metric(
    metric_id: int,
    metric_in: MetricUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a metric"""
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

    update_data = metric_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(metric, field, value)

    await db.commit()
    await db.refresh(metric)

    return metric


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric(
    metric_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a metric"""
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

    await db.delete(metric)
    await db.commit()

    return None
