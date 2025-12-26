"""
Device endpoints
CRUD operations for IoT devices
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.models.iot import Device, DataSource, Metric
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, MetricResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[DeviceResponse])
async def get_devices(
    data_source_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all devices, optionally filtered by data source"""
    query = select(Device).join(DataSource).where(DataSource.owner_id == current_user.id)

    if data_source_id:
        query = query.where(Device.data_source_id == data_source_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    devices = result.scalars().all()

    return devices


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific device"""
    result = await db.execute(
        select(Device)
        .join(DataSource)
        .where(Device.id == device_id, DataSource.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    return device


@router.get("/{device_id}/metrics", response_model=List[MetricResponse])
async def get_device_metrics(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all metrics for a specific device"""
    # Verify device ownership
    result = await db.execute(
        select(Device)
        .join(DataSource)
        .where(Device.id == device_id, DataSource.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    # Get metrics for this device
    metrics_result = await db.execute(
        select(Metric).where(Metric.device_id == device_id)
    )
    metrics = metrics_result.scalars().all()

    return metrics


@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    device_in: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new device"""
    # Verify data source ownership
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == device_in.data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Check if device_id already exists
    existing = await db.execute(
        select(Device).where(Device.device_id == device_in.device_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device ID already exists"
        )

    device = Device(**device_in.dict())
    db.add(device)
    await db.commit()
    await db.refresh(device)

    return device


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    device_in: DeviceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a device"""
    result = await db.execute(
        select(Device)
        .join(DataSource)
        .where(Device.id == device_id, DataSource.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    update_data = device_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)

    await db.commit()
    await db.refresh(device)

    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a device"""
    result = await db.execute(
        select(Device)
        .join(DataSource)
        .where(Device.id == device_id, DataSource.owner_id == current_user.id)
    )
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    await db.delete(device)
    await db.commit()

    return None
