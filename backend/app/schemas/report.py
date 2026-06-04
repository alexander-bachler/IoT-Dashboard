"""Pydantic schemas for scheduled report endpoints."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime


class ReportBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    schedule: str = Field(..., min_length=1)  # cron expression
    type: str = "metrics"
    format: str = "json"
    recipients: List[str] = Field(default_factory=list)
    configuration: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule: Optional[str] = None
    type: Optional[str] = None
    format: Optional[str] = None
    recipients: Optional[List[str]] = None
    configuration: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ReportResponse(ReportBase):
    id: UUID
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportHistoryResponse(BaseModel):
    id: UUID
    report_id: UUID
    status: str
    file_path: Optional[str] = None
    file_size: Optional[str] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportSection(BaseModel):
    metric_id: str
    metric_name: Optional[str] = None
    unit: Optional[str] = None
    stats: Dict[str, Optional[float]]


class ReportGenerationResult(BaseModel):
    report_id: UUID
    generated_at: datetime
    type: str
    format: str
    sections: List[ReportSection]
    csv: str
    delivered: bool
    note: str
