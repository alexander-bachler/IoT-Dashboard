"""
Pydantic schemas for Anomaly endpoints
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.models.anomaly import AnomalySeverity, AnomalyStatus


class AnomalyBase(BaseModel):
    """Base anomaly schema"""
    timestamp: datetime
    value: float
    expected_value: Optional[float] = None
    z_score: Optional[float] = None
    severity: AnomalySeverity = AnomalySeverity.MEDIUM
    description: Optional[str] = None


class AnomalyCreate(AnomalyBase):
    """Schema for creating an anomaly"""
    metric_id: int


class AnomalyUpdate(BaseModel):
    """Schema for updating an anomaly"""
    status: Optional[AnomalyStatus] = None
    acknowledged_by: Optional[str] = None


class AnomalyResponse(AnomalyBase):
    """Schema for anomaly response"""
    id: int
    metric_id: int
    status: AnomalyStatus
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalyQuery(BaseModel):
    """Schema for querying anomalies"""
    metric_ids: Optional[List[int]] = None
    severity: Optional[List[AnomalySeverity]] = None
    status: Optional[List[AnomalyStatus]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(50, le=1000)
    offset: int = Field(0, ge=0)


class AnomalyStatistics(BaseModel):
    """Anomaly statistics"""
    total: int
    by_severity: Dict[str, int] = {}
    by_status: Dict[str, int] = {}
    recent_count: int = 0  # Last 24 hours


from typing import Dict
