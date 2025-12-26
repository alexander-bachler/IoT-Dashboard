"""
Pydantic schemas for Measurement endpoints
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID


class MeasurementCreate(BaseModel):
    """Schema for creating a measurement"""
    metric_id: UUID
    device_id: UUID
    time: datetime
    value: float
    quality: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MeasurementBatchCreate(BaseModel):
    """Schema for batch creating measurements"""
    measurements: List[MeasurementCreate]


class MeasurementResponse(BaseModel):
    """Schema for measurement response"""
    time: datetime
    metric_id: UUID
    device_id: UUID
    value: float
    quality: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class TimeSeriesQuery(BaseModel):
    """Schema for time-series query"""
    metric_ids: List[UUID]
    start_time: datetime
    end_time: datetime
    interval: Optional[str] = None  # e.g., "1h", "15m", "1d"
    aggregation: Optional[Literal["avg", "sum", "min", "max", "count"]] = None
    limit: Optional[int] = Field(None, le=10000)
    data_source_ids: Optional[List[UUID]] = None  # Filter by data sources


class TimeSeriesDataPoint(BaseModel):
    """Single time-series data point"""
    time: str
    value: float
    quality: Optional[str] = None


class TimeSeriesData(BaseModel):
    """Time-series data for a metric"""
    metric_id: UUID
    metric_name: str
    metric_unit: Optional[str] = None
    data: List[TimeSeriesDataPoint]


class MeasurementStats(BaseModel):
    """Measurement statistics"""
    count: int
    min: Optional[float] = None
    max: Optional[float] = None
    avg: Optional[float] = None
    sum: Optional[float] = None
    first_timestamp: Optional[datetime] = None
    last_timestamp: Optional[datetime] = None
