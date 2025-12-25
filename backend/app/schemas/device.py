"""
Pydantic schemas for Device endpoints
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class DeviceBase(BaseModel):
    """Base device schema"""
    external_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DeviceCreate(DeviceBase):
    """Schema for creating a device"""
    data_source_id: UUID


class DeviceUpdate(BaseModel):
    """Schema for updating a device"""
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class DeviceResponse(DeviceBase):
    """Schema for device response"""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    data_source_id: UUID

    class Config:
        from_attributes = True


class MetricBase(BaseModel):
    """Base metric schema"""
    external_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    unit: Optional[str] = None
    metric_type: Optional[str] = None
    description: Optional[str] = None


class MetricCreate(MetricBase):
    """Schema for creating a metric"""
    device_id: UUID


class MetricUpdate(BaseModel):
    """Schema for updating a metric"""
    name: Optional[str] = None
    unit: Optional[str] = None
    metric_type: Optional[str] = None
    description: Optional[str] = None


class MetricResponse(MetricBase):
    """Schema for metric response"""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    device_id: UUID

    class Config:
        from_attributes = True
