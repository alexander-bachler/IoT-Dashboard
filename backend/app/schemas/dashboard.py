"""
Pydantic schemas for Dashboard endpoints
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any, Dict


class DashboardBase(BaseModel):
    """Base dashboard schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    config: Dict[str, Any]
    is_favorite: bool = False
    is_public: bool = False


class DashboardCreate(DashboardBase):
    """Schema for creating a dashboard"""
    pass


class DashboardUpdate(BaseModel):
    """Schema for updating a dashboard"""
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_favorite: Optional[bool] = None
    is_public: Optional[bool] = None


class DashboardResponse(DashboardBase):
    """Schema for dashboard response"""
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChartBase(BaseModel):
    """Base chart schema"""
    name: str = Field(..., min_length=1, max_length=255)
    type: str
    config: Dict[str, Any]
    position: Optional[Dict[str, Any]] = None


class ChartCreate(ChartBase):
    """Schema for creating a chart"""
    dashboard_id: int


class ChartUpdate(BaseModel):
    """Schema for updating a chart"""
    name: Optional[str] = None
    type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None


class ChartResponse(ChartBase):
    """Schema for chart response"""
    id: int
    dashboard_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
