"""
LineMetrics Integration Service

Handles synchronization and data import from LineMetrics API v2
Authentication: OAuth2 Client Credentials
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
    """Configuration for LineMetrics API v2 with OAuth2"""

    def __init__(
        self,
        api_url: str = "https://rest-api.linemetrics.com",
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        **kwargs,  # Accept but ignore old parameters
    ):
        self.api_url = api_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None


class LineMetricsService:
    """Service for interacting with LineMetrics API v2"""

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
        """Authenticate with LineMetrics API using OAuth2 client credentials"""
        if not self.config.client_id or not self.config.client_secret:
            raise ValueError("Client ID and Client Secret are required")

        # Check if token is still valid
        if self.config.access_token and self.config.token_expiry:
            if datetime.utcnow() < self.config.token_expiry:
                self.client.headers["Authorization"] = f"Bearer {self.config.access_token}"
                return

        # Request new access token
        response = await self.client.post(
            "/oauth/access_token",
            json={
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "grant_type": "client_credentials",
            },
        )
        response.raise_for_status()
        data = response.json()

        self.config.access_token = data.get("access_token")
        # Token typically expires in 1 hour, set expiry to 55 minutes
        self.config.token_expiry = datetime.utcnow() + timedelta(minutes=55)

        self.client.headers["Authorization"] = f"Bearer {self.config.access_token}"

    async def get_account(self) -> Dict[str, Any]:
        """Get account information"""
        response = await self.client.get("/v2/account")
        response.raise_for_status()
        return response.json()

    async def get_devices(self) -> Dict[str, Dict[str, Any]]:
        """
        Fetch all devices from LineMetrics
        Returns a dictionary mapping device IDs to device objects
        """
        response = await self.client.get("/v2/devices/all")
        response.raise_for_status()
        return response.json()

    async def get_device_by_id(self, device_id: str) -> Dict[str, Any]:
        """Fetch device detail by ID"""
        response = await self.client.get("/v2/devices", params={"id": device_id})
        response.raise_for_status()
        return response.json()

    async def get_device_streams(self, device_id: str) -> List[Dict[str, Any]]:
        """
        Fetch inputs (streams) for a specific device
        Returns list of inputs with their metadata
        """
        # Get device detail
        device_detail = await self.get_device_by_id(device_id)

        # Extract device data
        device_data = device_detail.get("data", [])
        if not device_data:
            return []

        device = device_data[0]
        inputs_data = device.get("relationships", {}).get("inputs", {}).get("data", [])
        included = device_detail.get("included", [])

        # Extract input details
        streams = []
        for input_data in inputs_data:
            input_id = input_data.get("id")
            data_source_id = input_data.get("dataSourceId")
            input_type = input_data.get("type")

            # Find input metadata in included
            details = next(
                (inc for inc in included if inc.get("id") == input_id),
                None,
            )

            if details:
                streams.append(
                    {
                        "id": input_id,
                        "dataSourceId": data_source_id,
                        "type": input_type,
                        "name": details.get("attributes", {}).get("title", ""),
                        "alias": details.get("attributes", {}).get("alias", ""),
                        "unit": details.get("attributes", {}).get("unit"),
                        "dataType": "number",  # LineMetrics inputs are typically numeric
                    }
                )

        return streams

    async def get_input_data(
        self,
        input_id: str,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
        granularity: Optional[str] = None,
        function: Optional[str] = None,
        time_zone: str = "Europe/Vienna",
    ) -> List[Dict[str, Any]]:
        """
        Query measurements for a device input

        Args:
            input_id: Device input ID
            from_time: Start time (datetime)
            to_time: End time (datetime)
            granularity: PT1M, PT5M, PT15M, PT1H, PT6H, PT24H, PT168H
            function: last_value, avg, min, max, sum
            time_zone: Time zone for aggregation

        Returns:
            List of data points with ts (timestamp in ms) and val (value)
        """
        params = {}
        if from_time:
            params["time_from"] = int(from_time.timestamp() * 1000)
        if to_time:
            params["time_to"] = int(to_time.timestamp() * 1000)
        if granularity:
            params["granularity"] = granularity
        if function:
            params["function"] = function
        if time_zone:
            params["time_zone"] = time_zone

        response = await self.client.get(
            f"/v2/device-inputs/{input_id}/data",
            params=params,
        )
        response.raise_for_status()
        return response.json()

    async def query_measurements(
        self,
        stream_ids: List[str],
        from_time: datetime,
        to_time: datetime,
        aggregation: str = "avg",
        interval: Optional[str] = "PT15M",
    ) -> List[Dict[str, Any]]:
        """
        Query measurements from multiple input streams

        Args:
            stream_ids: List of device input IDs
            from_time: Start time
            to_time: End time
            aggregation: avg, min, max, sum, last_value
            interval: PT1M, PT5M, PT15M, PT1H, PT6H, PT24H, PT168H

        Returns:
            List of time series data per stream
        """
        results = []

        # Map aggregation names
        function_map = {
            "none": "last_value",
            "avg": "avg",
            "average": "avg",
            "min": "min",
            "minimum": "min",
            "max": "max",
            "maximum": "max",
            "sum": "sum",
            "total": "sum",
            "last": "last_value",
            "last_value": "last_value",
        }
        function = function_map.get(aggregation.lower(), "avg")

        for stream_id in stream_ids:
            try:
                data = await self.get_input_data(
                    input_id=stream_id,
                    from_time=from_time,
                    to_time=to_time,
                    granularity=interval,
                    function=function,
                )

                results.append(
                    {
                        "streamId": stream_id,
                        "stream_id": stream_id,
                        "data": data,
                    }
                )
            except Exception as e:
                # Continue with other streams if one fails
                results.append(
                    {
                        "streamId": stream_id,
                        "stream_id": stream_id,
                        "data": [],
                        "error": str(e),
                    }
                )

        return results


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
            lm_devices_dict = await lm_service.get_devices()
        except Exception as e:
            stats["errors"].append(f"Failed to fetch devices: {str(e)}")
            return stats

        # Convert dict to list for processing
        lm_devices = []
        for device_id, device_data in lm_devices_dict.items():
            device_data["id"] = device_id  # Ensure ID is in the device object
            lm_devices.append(device_data)

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
                device.name = lm_device.get("title") or lm_device.get("name", device.name)
                device.description = lm_device.get("description")
                device.status = "active"
                stats["devices_updated"] += 1
            else:
                # Create new device
                device = Device(
                    source_id=data_source.id,
                    external_id=device_id,
                    name=lm_device.get("title") or lm_device.get("name", f"Device {device_id}"),
                    description=lm_device.get("description"),
                    status="active",
                )
                db.add(device)
                stats["devices_created"] += 1

            await db.flush()

            # Fetch and process streams (device inputs)
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
                            name=stream.get("name", f"Input {stream_id}"),
                            unit=stream.get("unit"),
                            data_type=stream.get("dataType", "number"),
                            description=stream.get("alias") or stream.get("description"),
                        )
                        db.add(metric)
                        stats["metrics_created"] += 1

                await db.flush()

            except Exception as e:
                stats["errors"].append(
                    f"Failed to fetch inputs for device {device_id}: {str(e)}"
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
    aggregation: str = "avg",
    interval: Optional[str] = "PT15M",
) -> Dict[str, Any]:
    """
    Import measurements from LineMetrics

    Args:
        db: Database session
        user: Current user
        config: LineMetrics configuration
        stream_ids: List of device input IDs to import
        from_time: Start time
        to_time: End time
        aggregation: Aggregation method (avg, min, max, sum, last_value)
        interval: Granularity (PT1M, PT5M, PT15M, PT1H, PT6H, PT24H, PT168H)

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

                # Check for errors in this series
                if "error" in series:
                    stats["errors"].append(f"Stream {stream_id}: {series['error']}")
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
                    stats["errors"].append(f"Metric not found for input {stream_id}")
                    continue

                # Import measurements
                data_points = series.get("data", [])
                for point in data_points:
                    # LineMetrics returns { ts: unix_ms, val: value, min?, max? }
                    timestamp_ms = point.get("ts")
                    value = point.get("val")

                    if timestamp_ms is None or value is None:
                        continue

                    # Convert Unix milliseconds to datetime
                    timestamp = datetime.fromtimestamp(timestamp_ms / 1000.0)

                    # Create measurement
                    measurement = Measurement(
                        time=timestamp,
                        metric_id=metric.id,
                        value=float(value),
                        quality=1.0,  # LineMetrics doesn't provide quality
                    )
                    db.add(measurement)
                    stats["measurements_imported"] += 1

            await db.commit()

        except Exception as e:
            stats["errors"].append(f"Failed to import measurements: {str(e)}")
            await db.rollback()

    return stats
