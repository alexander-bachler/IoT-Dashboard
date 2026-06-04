"""Pydantic schemas for custom calculation endpoints."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from uuid import UUID
from datetime import datetime

from app.schemas.measurement import TimeSeriesDataPoint

AGGREGATION_TYPES = {"none", "sum", "avg", "min", "max"}


class CalculationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    formula: str = Field(..., min_length=1)
    # variable name -> source metric id
    source_metric_ids: Dict[str, UUID]
    unit: Optional[str] = None
    aggregation_type: str = "none"


class CalculationCreate(CalculationBase):
    pass


class CalculationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    formula: Optional[str] = None
    source_metric_ids: Optional[Dict[str, UUID]] = None
    unit: Optional[str] = None
    aggregation_type: Optional[str] = None


class CalculationResponse(CalculationBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalculationPreview(BaseModel):
    """Evaluate an ad-hoc (unsaved) calculation."""
    formula: str = Field(..., min_length=1)
    source_metric_ids: Dict[str, UUID]
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    interval: Optional[str] = "1 hour"
    aggregation_type: str = "none"


class CalculationResult(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    interval: str
    data: List[TimeSeriesDataPoint]
    aggregate: Optional[float] = None
    points: int
