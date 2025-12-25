"""
Pydantic schemas for Anomaly endpoints
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID


class AnomalyBase(BaseModel):
    """Base anomaly schema"""
    timestamp: datetime
    value: float
    expected_value: Optional[float] = None
    z_score: Optional[float] = None
    severity: str = "low"  # low, medium, high, critical
    type: str = "statistical"  # statistical, threshold, pattern, ml
    description: Optional[str] = None


class AnomalyCreate(AnomalyBase):
    """Schema for creating an anomaly"""
    metric_id: UUID
    device_id: UUID


class AnomalyUpdate(BaseModel):
    """Schema for updating an anomaly"""
    acknowledged: Optional[bool] = None
    acknowledged_by: Optional[UUID] = None


class AnomalyResponse(AnomalyBase):
    """Schema for anomaly response"""
    id: UUID
    metric_id: UUID
    device_id: UUID
    acknowledged: bool
    acknowledged_by: Optional[UUID] = None
    acknowledged_at: Optional[datetime] = None
    detected_at: datetime
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AnomalyQuery(BaseModel):
    """Schema for querying anomalies"""
    metric_ids: Optional[List[UUID]] = None
    severity: Optional[List[str]] = None
    acknowledged: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(50, le=1000)
    offset: int = Field(0, ge=0)


class AnomalyStatistics(BaseModel):
    """Anomaly statistics"""
    total: int
    by_severity: Dict[str, int] = {}
    by_acknowledged: Dict[str, int] = {}
    recent_count: int = 0  # Last 24 hours
