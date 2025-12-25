"""
Data Source endpoints
CRUD operations for data sources
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.models.iot import DataSource, Device, Metric, Measurement
from app.schemas.data_source import DataSourceCreate, DataSourceUpdate, DataSourceResponse, DataSourceStats
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[DataSourceResponse])
async def get_data_sources(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all data sources for current user"""
    result = await db.execute(
        select(DataSource)
        .where(DataSource.owner_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    data_sources = result.scalars().all()
    return data_sources


@router.get("/{data_source_id}", response_model=DataSourceResponse)
async def get_data_source(
    data_source_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    return data_source


@router.post("/", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_data_source(
    data_source_in: DataSourceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new data source"""
    data_source = DataSource(
        **data_source_in.dict(),
        owner_id=current_user.id
    )

    db.add(data_source)
    await db.commit()
    await db.refresh(data_source)

    return data_source


@router.put("/{data_source_id}", response_model=DataSourceResponse)
async def update_data_source(
    data_source_id: int,
    data_source_in: DataSourceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Update fields
    update_data = data_source_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(data_source, field, value)

    await db.commit()
    await db.refresh(data_source)

    return data_source


@router.delete("/{data_source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_source(
    data_source_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    await db.delete(data_source)
    await db.commit()

    return None


@router.get("/{data_source_id}/stats", response_model=DataSourceStats)
async def get_data_source_stats(
    data_source_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a data source"""
    # Verify ownership
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Count devices
    device_count_result = await db.execute(
        select(func.count(Device.id)).where(Device.data_source_id == data_source_id)
    )
    device_count = device_count_result.scalar() or 0

    # Count metrics
    metric_count_result = await db.execute(
        select(func.count(Metric.id))
        .join(Device, Device.id == Metric.device_id)
        .where(Device.data_source_id == data_source_id)
    )
    metric_count = metric_count_result.scalar() or 0

    # Count measurements
    measurement_count_result = await db.execute(
        select(func.count(Measurement.id))
        .join(Metric, Metric.id == Measurement.metric_id)
        .join(Device, Device.id == Metric.device_id)
        .where(Device.data_source_id == data_source_id)
    )
    measurement_count = measurement_count_result.scalar() or 0

    return DataSourceStats(
        device_count=device_count,
        metric_count=metric_count,
        measurement_count=measurement_count
    )


@router.post("/{data_source_id}/sync", response_model=DataSourceResponse)
async def sync_data_source(
    data_source_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger a sync for a data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Update last_sync timestamp
    from datetime import datetime
    data_source.last_sync = datetime.utcnow()

    await db.commit()
    await db.refresh(data_source)

    return data_source
