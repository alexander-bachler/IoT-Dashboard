"""
LineMetrics Integration Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.linemetrics_service import (
    LineMetricsConfig,
    LineMetricsService,
    sync_linemetrics_devices,
    import_linemetrics_measurements,
)

router = APIRouter()


# Schemas
class LineMetricsConfigSchema(BaseModel):
    """LineMetrics configuration"""

    api_url: str = Field(default="https://api.linemetrics.com/v2")
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class LineMetricsTestResponse(BaseModel):
    """Connection test response"""

    success: bool
    message: str
    device_count: Optional[int] = None


class LineMetricsSyncRequest(BaseModel):
    """Sync devices request"""

    config: LineMetricsConfigSchema


class LineMetricsSyncResponse(BaseModel):
    """Sync devices response"""

    success: bool
    message: str
    devices_created: int
    devices_updated: int
    metrics_created: int
    errors: List[str] = []


class LineMetricsImportRequest(BaseModel):
    """Import measurements request"""

    config: LineMetricsConfigSchema
    stream_ids: List[str]
    from_time: datetime
    to_time: datetime
    aggregation: str = Field(default="none")
    interval: Optional[str] = None


class LineMetricsImportResponse(BaseModel):
    """Import measurements response"""

    success: bool
    message: str
    measurements_imported: int
    errors: List[str] = []


class LineMetricsDeviceResponse(BaseModel):
    """Device from LineMetrics"""

    id: str
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    stream_count: Optional[int] = None


class LineMetricsStreamResponse(BaseModel):
    """Stream from LineMetrics"""

    id: str
    name: str
    unit: Optional[str] = None
    data_type: Optional[str] = None
    description: Optional[str] = None


# Endpoints


@router.post("/test", response_model=LineMetricsTestResponse)
async def test_linemetrics_connection(
    config: LineMetricsConfigSchema,
    current_user: User = Depends(get_current_user),
):
    """
    Test connection to LineMetrics API

    Verifies that the provided credentials are valid and can connect to LineMetrics.
    """
    try:
        lm_config = LineMetricsConfig(
            api_url=config.api_url,
            api_key=config.api_key,
            username=config.username,
            password=config.password,
        )

        async with LineMetricsService(lm_config) as service:
            devices = await service.get_devices()

            return LineMetricsTestResponse(
                success=True,
                message="Connection successful",
                device_count=len(devices),
            )

    except Exception as e:
        return LineMetricsTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
            device_count=None,
        )


@router.post("/devices", response_model=List[LineMetricsDeviceResponse])
async def get_linemetrics_devices(
    config: LineMetricsConfigSchema,
    current_user: User = Depends(get_current_user),
):
    """
    Get all devices from LineMetrics

    Fetches the list of available devices from your LineMetrics account.
    """
    try:
        lm_config = LineMetricsConfig(
            api_url=config.api_url,
            api_key=config.api_key,
            username=config.username,
            password=config.password,
        )

        async with LineMetricsService(lm_config) as service:
            devices = await service.get_devices()

            return [
                LineMetricsDeviceResponse(
                    id=device.get("id"),
                    name=device.get("name", ""),
                    location=device.get("location"),
                    description=device.get("description"),
                    stream_count=len(device.get("streams", [])),
                )
                for device in devices
                if device.get("id")
            ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch devices: {str(e)}",
        )


@router.post("/devices/{device_id}/streams", response_model=List[LineMetricsStreamResponse])
async def get_linemetrics_device_streams(
    device_id: str,
    config: LineMetricsConfigSchema,
    current_user: User = Depends(get_current_user),
):
    """
    Get streams for a specific device

    Fetches all data streams (metrics) available for the specified device.
    """
    try:
        lm_config = LineMetricsConfig(
            api_url=config.api_url,
            api_key=config.api_key,
            username=config.username,
            password=config.password,
        )

        async with LineMetricsService(lm_config) as service:
            streams = await service.get_device_streams(device_id)

            return [
                LineMetricsStreamResponse(
                    id=stream.get("id"),
                    name=stream.get("name", ""),
                    unit=stream.get("unit"),
                    data_type=stream.get("dataType"),
                    description=stream.get("description"),
                )
                for stream in streams
                if stream.get("id")
            ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch streams: {str(e)}",
        )


@router.post("/sync", response_model=LineMetricsSyncResponse)
async def sync_linemetrics(
    request: LineMetricsSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sync devices from LineMetrics to database

    Imports all devices and their streams from LineMetrics and creates corresponding
    data sources, devices, and metrics in the database.
    """
    lm_config = LineMetricsConfig(
        api_url=request.config.api_url,
        api_key=request.config.api_key,
        username=request.config.username,
        password=request.config.password,
    )

    try:
        stats = await sync_linemetrics_devices(db, current_user, lm_config)

        success = len(stats["errors"]) == 0
        message = (
            "Sync completed successfully"
            if success
            else f"Sync completed with {len(stats['errors'])} errors"
        )

        return LineMetricsSyncResponse(
            success=success,
            message=message,
            devices_created=stats["devices_created"],
            devices_updated=stats["devices_updated"],
            metrics_created=stats["metrics_created"],
            errors=stats["errors"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}",
        )


@router.post("/import", response_model=LineMetricsImportResponse)
async def import_linemetrics_data(
    request: LineMetricsImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import historical measurements from LineMetrics

    Imports time-series data for the specified streams and time range.
    The data is stored in the database for analysis and visualization.
    """
    lm_config = LineMetricsConfig(
        api_url=request.config.api_url,
        api_key=request.config.api_key,
        username=request.config.username,
        password=request.config.password,
    )

    try:
        stats = await import_linemetrics_measurements(
            db=db,
            user=current_user,
            config=lm_config,
            stream_ids=request.stream_ids,
            from_time=request.from_time,
            to_time=request.to_time,
            aggregation=request.aggregation,
            interval=request.interval,
        )

        success = len(stats["errors"]) == 0
        message = (
            f"Imported {stats['measurements_imported']} measurements"
            if success
            else f"Import completed with {len(stats['errors'])} errors"
        )

        return LineMetricsImportResponse(
            success=success,
            message=message,
            measurements_imported=stats["measurements_imported"],
            errors=stats["errors"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}",
        )
