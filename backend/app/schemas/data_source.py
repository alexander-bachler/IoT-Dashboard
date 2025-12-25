"""
Pydantic schemas for Data Source endpoints
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class DataSourceBase(BaseModel):
    """Base data source schema"""
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., min_length=1, max_length=50)  # api, mqtt, database, file
    api_url: str
    api_token: str
    client_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class DataSourceCreate(DataSourceBase):
    """Schema for creating a data source"""
    pass


class DataSourceUpdate(BaseModel):
    """Schema for updating a data source"""
    name: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None
    api_url: Optional[str] = None
    api_token: Optional[str] = None
    client_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class DataSourceResponse(DataSourceBase):
    """Schema for data source response"""
    id: UUID
    is_active: bool
    last_sync: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class DataSourceStats(BaseModel):
    """Data source statistics"""
    device_count: int = 0
    metric_count: int = 0
    measurement_count: int = 0
