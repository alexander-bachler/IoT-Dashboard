"""
LineMetrics Integration Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.iot import DataSource
from app.api.v1.endpoints.auth import get_current_user
from app.services.linemetrics_service import (
    LineMetricsConfig,
    LineMetricsService,
    sync_linemetrics_devices,
    import_linemetrics_measurements,
)

router = APIRouter()


# Schemas
class LineMetricsConfigSchema(BaseModel):
    """LineMetrics configuration for OAuth2 (for creating DataSource)"""

    name: str = Field(description="Name for this LineMetrics connection")
    api_url: str = Field(default="https://rest-api.linemetrics.com")
    client_id: str = Field(description="OAuth2 Client ID")
    client_secret: str = Field(description="OAuth2 Client Secret")


# Helper function to get LineMetrics config from DataSource
async def get_linemetrics_config_from_datasource(
    datasource_id: UUID,
    current_user: User,
    db: AsyncSession
) -> tuple[DataSource, LineMetricsConfig]:
    """Get DataSource and create LineMetricsConfig from it"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == datasource_id,
            DataSource.owner_id == current_user.id,
            DataSource.type == "linemetrics"
        )
    )
    datasource = result.scalar_one_or_none()

    if not datasource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LineMetrics data source not found"
        )

    config = LineMetricsConfig(
        api_url=datasource.api_url,
        client_id=datasource.client_id or "",
        client_secret=datasource.api_token or "",  # api_token stores the client_secret
    )

    return datasource, config


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


@router.post("/datasource", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_linemetrics_datasource(
    config: LineMetricsConfigSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new LineMetrics data source

    Creates a DataSource entry with the provided LineMetrics credentials.
    Also tests the connection to verify credentials are valid.
    """
    try:
        # Test connection first
        lm_config = LineMetricsConfig(
            api_url=config.api_url,
            client_id=config.client_id,
            client_secret=config.client_secret,
        )

        async with LineMetricsService(lm_config) as service:
            devices = await service.get_devices()
            device_count = len(devices) if isinstance(devices, dict) else 0

        # Connection successful, create DataSource
        datasource = DataSource(
            name=config.name,
            type="linemetrics",
            api_url=config.api_url,
            client_id=config.client_id,
            api_token=config.client_secret,  # Store client_secret in api_token field
            is_active=True,
            owner_id=current_user.id,
        )

        db.add(datasource)
        await db.commit()
        await db.refresh(datasource)

        return {
            "id": str(datasource.id),
            "name": datasource.name,
            "type": datasource.type,
            "device_count": device_count,
            "message": "LineMetrics data source created successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create LineMetrics data source: {str(e)}"
        )


@router.post("/{datasource_id}/test", response_model=LineMetricsTestResponse)
async def test_linemetrics_connection(
    datasource_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test connection to LineMetrics API using existing DataSource

    Verifies that the stored credentials are still valid.
    """
    try:
        datasource, lm_config = await get_linemetrics_config_from_datasource(
            datasource_id, current_user, db
        )

        async with LineMetricsService(lm_config) as service:
            devices = await service.get_devices()
            device_count = len(devices) if isinstance(devices, dict) else 0

            return LineMetricsTestResponse(
                success=True,
                message="Connection successful",
                device_count=device_count,
            )

    except HTTPException:
        raise
    except Exception as e:
        return LineMetricsTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
            device_count=None,
        )


@router.get("/{datasource_id}/devices", response_model=List[LineMetricsDeviceResponse])
async def get_linemetrics_devices(
    datasource_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all devices from LineMetrics using existing DataSource

    Fetches the list of available devices from the connected LineMetrics account.
    """
    try:
        datasource, lm_config = await get_linemetrics_config_from_datasource(
            datasource_id, current_user, db
        )

        async with LineMetricsService(lm_config) as service:
            devices_dict = await service.get_devices()

            # Convert dict to list and return
            return [
                LineMetricsDeviceResponse(
                    id=device_id,
                    name=device_data.get("title") or device_data.get("name", ""),
                    location=device_data.get("location"),
                    description=device_data.get("description"),
                    stream_count=0,  # Will be fetched separately per device
                )
                for device_id, device_data in devices_dict.items()
            ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch devices: {str(e)}",
        )


@router.get("/{datasource_id}/devices/{device_id}/streams", response_model=List[LineMetricsStreamResponse])
async def get_linemetrics_device_streams(
    datasource_id: UUID,
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get streams (inputs) for a specific device

    Fetches all data streams (metrics) available for the specified device.
    """
    try:
        datasource, lm_config = await get_linemetrics_config_from_datasource(
            datasource_id, current_user, db
        )

        async with LineMetricsService(lm_config) as service:
            streams = await service.get_device_streams(device_id)

            return [
                LineMetricsStreamResponse(
                    id=stream.get("id"),
                    name=stream.get("name", ""),
                    unit=stream.get("unit"),
                    data_type=stream.get("dataType"),
                    description=stream.get("alias") or stream.get("description"),
                )
                for stream in streams
                if stream.get("id")
            ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch streams: {str(e)}",
        )


@router.post("/{datasource_id}/sync", response_model=LineMetricsSyncResponse)
async def sync_linemetrics(
    datasource_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sync devices from LineMetrics to database

    Imports all devices and their streams from the connected LineMetrics account
    and creates corresponding devices and metrics in the database.
    """
    try:
        datasource, lm_config = await get_linemetrics_config_from_datasource(
            datasource_id, current_user, db
        )

        # Pass the datasource directly to sync function
        stats = await sync_linemetrics_devices(db, current_user, lm_config, datasource)

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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}",
        )


class LineMetricsImportRequestNew(BaseModel):
    """Import measurements request (without config)"""

    stream_ids: List[str]
    from_time: datetime
    to_time: datetime
    aggregation: str = Field(default="avg")
    interval: Optional[str] = "PT15M"


@router.post("/{datasource_id}/import", response_model=LineMetricsImportResponse)
async def import_linemetrics_data(
    datasource_id: UUID,
    request: LineMetricsImportRequestNew,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import historical measurements from LineMetrics

    Imports time-series data for the specified input streams and time range.
    The data is stored in the database for analysis and visualization.
    """
    try:
        datasource, lm_config = await get_linemetrics_config_from_datasource(
            datasource_id, current_user, db
        )

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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}",
        )
