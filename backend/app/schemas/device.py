"""
Pydantic schemas for Device endpoints
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any


class DeviceBase(BaseModel):
    """Base device schema"""
    device_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    type: Optional[str] = None
    location: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DeviceCreate(DeviceBase):
    """Schema for creating a device"""
    data_source_id: int


class DeviceUpdate(BaseModel):
    """Schema for updating a device"""
    name: Optional[str] = None
    type: Optional[str] = None
    location: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class DeviceResponse(DeviceBase):
    """Schema for device response"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    data_source_id: int

    class Config:
        from_attributes = True


class MetricBase(BaseModel):
    """Base metric schema"""
    metric_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    unit: Optional[str] = None
    data_type: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: Optional[str] = None


class MetricCreate(MetricBase):
    """Schema for creating a metric"""
    device_id: int


class MetricUpdate(BaseModel):
    """Schema for updating a metric"""
    name: Optional[str] = None
    unit: Optional[str] = None
    data_type: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: Optional[str] = None


class MetricResponse(MetricBase):
    """Schema for metric response"""
    id: int
    created_at: datetime
    device_id: int

    class Config:
        from_attributes = True
