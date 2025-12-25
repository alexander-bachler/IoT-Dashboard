"""
LineMetrics Integration Service

Handles synchronization and data import from LineMetrics API
"""

import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.iot import DataSource, Device, Metric, Measurement
from app.models.user import User


class LineMetricsConfig:
    """Configuration for LineMetrics API"""

    def __init__(
        self,
        api_url: str = "https://api.linemetrics.com/v2",
        api_key: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.username = username
        self.password = password
        self.access_token: Optional[str] = None


class LineMetricsService:
    """Service for interacting with LineMetrics API"""

    def __init__(self, config: LineMetricsConfig):
        self.config = config
        self.client = httpx.AsyncClient(
            base_url=config.api_url,
            timeout=30.0,
            headers={"Content-Type": "application/json"},
        )

    async def __aenter__(self):
        await self.authenticate()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def authenticate(self) -> None:
        """Authenticate with LineMetrics API"""
        if self.config.api_key:
            # Use API key authentication
            self.client.headers["X-API-Key"] = self.config.api_key
        elif self.config.username and self.config.password:
            # Use username/password authentication
            response = await self.client.post(
                "/auth/login",
                json={
                    "username": self.config.username,
                    "password": self.config.password,
                },
            )
            response.raise_for_status()
            data = response.json()
            self.config.access_token = data.get("access_token") or data.get("token")
            self.client.headers["Authorization"] = f"Bearer {self.config.access_token}"

    async def get_devices(self) -> List[Dict[str, Any]]:
        """Fetch all devices from LineMetrics"""
        response = await self.client.get("/devices")
        response.raise_for_status()
        data = response.json()
        return data.get("devices", data)

    async def get_device_streams(self, device_id: str) -> List[Dict[str, Any]]:
        """Fetch streams for a specific device"""
        response = await self.client.get(f"/devices/{device_id}/streams")
        response.raise_for_status()
        data = response.json()
        return data.get("streams", data)

    async def query_measurements(
        self,
        stream_ids: List[str],
        from_time: datetime,
        to_time: datetime,
        aggregation: str = "none",
        interval: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query measurements from LineMetrics"""
        response = await self.client.post(
            "/measurements/query",
            json={
                "stream_ids": stream_ids,
                "from": from_time.isoformat(),
                "to": to_time.isoformat(),
                "aggregation": aggregation,
                "interval": interval,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("data", data)


async def sync_linemetrics_devices(
    db: AsyncSession,
    user: User,
    config: LineMetricsConfig,
) -> Dict[str, Any]:
    """
    Sync devices from LineMetrics to database

    Args:
        db: Database session
        user: Current user
        config: LineMetrics configuration

    Returns:
        Sync statistics
    """
    stats = {
        "devices_created": 0,
        "devices_updated": 0,
        "metrics_created": 0,
        "errors": [],
    }

    async with LineMetricsService(config) as lm_service:
        # Get or create LineMetrics data source
        result = await db.execute(
            select(DataSource).where(
                DataSource.type == "linemetrics",
                DataSource.user_id == user.id,
            )
        )
        data_source = result.scalar_one_or_none()

        if not data_source:
            data_source = DataSource(
                name="LineMetrics",
                type="linemetrics",
                status="active",
                api_url=config.api_url,
                user_id=user.id,
            )
            db.add(data_source)
            await db.flush()

        # Fetch devices from LineMetrics
        try:
            lm_devices = await lm_service.get_devices()
        except Exception as e:
            stats["errors"].append(f"Failed to fetch devices: {str(e)}")
            return stats

        # Process each device
        for lm_device in lm_devices:
            device_id = lm_device.get("id")
            if not device_id:
                continue

            # Check if device exists
            result = await db.execute(
                select(Device).where(
                    Device.external_id == device_id,
                    Device.source_id == data_source.id,
                )
            )
            device = result.scalar_one_or_none()

            if device:
                # Update existing device
                device.name = lm_device.get("name", device.name)
                device.description = lm_device.get("description")
                device.location = lm_device.get("location")
                device.status = "active"
                stats["devices_updated"] += 1
            else:
                # Create new device
                device = Device(
                    source_id=data_source.id,
                    external_id=device_id,
                    name=lm_device.get("name", f"Device {device_id}"),
                    description=lm_device.get("description"),
                    location=lm_device.get("location"),
                    status="active",
                )
                db.add(device)
                stats["devices_created"] += 1

            await db.flush()

            # Fetch and process streams (metrics)
            try:
                streams = await lm_service.get_device_streams(device_id)

                for stream in streams:
                    stream_id = stream.get("id")
                    if not stream_id:
                        continue

                    # Check if metric exists
                    result = await db.execute(
                        select(Metric).where(
                            Metric.external_id == stream_id,
                            Metric.device_id == device.id,
                        )
                    )
                    metric = result.scalar_one_or_none()

                    if not metric:
                        # Create new metric
                        metric = Metric(
                            device_id=device.id,
                            external_id=stream_id,
                            name=stream.get("name", f"Metric {stream_id}"),
                            unit=stream.get("unit"),
                            data_type=stream.get("dataType", "number"),
                            description=stream.get("description"),
                        )
                        db.add(metric)
                        stats["metrics_created"] += 1

                await db.flush()

            except Exception as e:
                stats["errors"].append(
                    f"Failed to fetch streams for device {device_id}: {str(e)}"
                )

        # Update data source last sync time
        data_source.last_sync = datetime.utcnow()
        await db.commit()

    return stats


async def import_linemetrics_measurements(
    db: AsyncSession,
    user: User,
    config: LineMetricsConfig,
    stream_ids: List[str],
    from_time: datetime,
    to_time: datetime,
    aggregation: str = "none",
    interval: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Import measurements from LineMetrics

    Args:
        db: Database session
        user: Current user
        config: LineMetrics configuration
        stream_ids: List of stream IDs to import
        from_time: Start time
        to_time: End time
        aggregation: Aggregation method
        interval: Aggregation interval

    Returns:
        Import statistics
    """
    stats = {
        "measurements_imported": 0,
        "errors": [],
    }

    async with LineMetricsService(config) as lm_service:
        try:
            # Fetch measurements from LineMetrics
            time_series = await lm_service.query_measurements(
                stream_ids=stream_ids,
                from_time=from_time,
                to_time=to_time,
                aggregation=aggregation,
                interval=interval,
            )

            # Process each time series
            for series in time_series:
                stream_id = series.get("stream_id") or series.get("streamId")
                if not stream_id:
                    continue

                # Find corresponding metric in database
                result = await db.execute(
                    select(Metric)
                    .join(Device)
                    .join(DataSource)
                    .where(
                        Metric.external_id == stream_id,
                        DataSource.user_id == user.id,
                    )
                )
                metric = result.scalar_one_or_none()

                if not metric:
                    stats["errors"].append(f"Metric not found for stream {stream_id}")
                    continue

                # Import measurements
                data_points = series.get("data", [])
                for point in data_points:
                    timestamp_str = point.get("timestamp") or point.get("time") or point.get("t")
                    value = point.get("value") or point.get("v")
                    quality = point.get("quality") or point.get("q")

                    if timestamp_str is None or value is None:
                        continue

                    # Parse timestamp
                    if isinstance(timestamp_str, str):
                        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    else:
                        timestamp = datetime.fromtimestamp(timestamp_str / 1000)

                    # Create measurement
                    measurement = Measurement(
                        time=timestamp,
                        metric_id=metric.id,
                        value=float(value),
                        quality=quality,
                    )
                    db.add(measurement)
                    stats["measurements_imported"] += 1

            await db.commit()

        except Exception as e:
            stats["errors"].append(f"Failed to import measurements: {str(e)}")
            await db.rollback()

    return stats
