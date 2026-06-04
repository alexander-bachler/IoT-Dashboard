"""Pydantic schemas for alert rule / event endpoints."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class AlertRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    metric_id: UUID
    device_id: Optional[UUID] = None
    condition: str
    threshold: float
    duration: Optional[str] = None
    severity: str = "warning"
    notification_channels: Optional[List[str]] = None
    notification_config: Optional[Dict[str, Any]] = None
    is_active: bool = True


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    notification_channels: Optional[List[str]] = None
    notification_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AlertRuleResponse(AlertRuleBase):
    id: UUID
    last_triggered: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertEventResponse(BaseModel):
    id: UUID
    alert_rule_id: UUID
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    measurement_value: float
    measurement_time: datetime
    status: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertEvaluationResult(BaseModel):
    rule_id: UUID
    evaluated_points: int
    breaches: int
    events: List[AlertEventResponse]
