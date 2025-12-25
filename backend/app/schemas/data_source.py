"""
Pydantic schemas for Data Source endpoints
"""
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.iot import DataSourceType, DataSourceStatus


class DataSourceBase(BaseModel):
    """Base data source schema"""
    name: str = Field(..., min_length=1, max_length=255)
    type: DataSourceType
    api_url: Optional[str] = None
    api_token: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    description: Optional[str] = None


class DataSourceCreate(DataSourceBase):
    """Schema for creating a data source"""
    pass


class DataSourceUpdate(BaseModel):
    """Schema for updating a data source"""
    name: Optional[str] = None
    type: Optional[DataSourceType] = None
    status: Optional[DataSourceStatus] = None
    api_url: Optional[str] = None
    api_token: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    description: Optional[str] = None


class DataSourceResponse(DataSourceBase):
    """Schema for data source response"""
    id: int
    status: DataSourceStatus
    last_sync: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner_id: int

    class Config:
        from_attributes = True


class DataSourceStats(BaseModel):
    """Data source statistics"""
    device_count: int = 0
    metric_count: int = 0
    measurement_count: int = 0
