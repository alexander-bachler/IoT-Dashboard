"""
Chart annotation endpoints

Replaces the former Next.js mock route. Annotations are scoped to the
authenticated user (created_by) and backed by the chart_annotations table.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.annotation import ChartAnnotation
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class AnnotationCreate(BaseModel):
    title: str
    description: Optional[str] = None
    timestamp: datetime
    end_timestamp: Optional[datetime] = None
    type: str = "event"
    severity: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    tags: List[str] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None


class AnnotationResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    timestamp: datetime
    # serialised as camelCase for the chart component
    end_timestamp: Optional[datetime] = Field(default=None, serialization_alias="endTimestamp")
    type: str
    severity: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


@router.get("/", response_model=List[AnnotationResponse])
async def list_annotations(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's annotations, optionally filtered by time range/type."""
    stmt = select(ChartAnnotation).where(ChartAnnotation.created_by == current_user.id)
    if start_time:
        stmt = stmt.where(ChartAnnotation.timestamp >= start_time)
    if end_time:
        stmt = stmt.where(ChartAnnotation.timestamp <= end_time)
    if type:
        stmt = stmt.where(ChartAnnotation.type == type)
    stmt = stmt.order_by(ChartAnnotation.timestamp.asc())

    return (await db.execute(stmt)).scalars().all()


@router.post("/", response_model=AnnotationResponse, status_code=status.HTTP_201_CREATED)
async def create_annotation(
    annotation_in: AnnotationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create an annotation owned by the current user."""
    data = annotation_in.model_dump()
    meta = data.pop("metadata", None)

    annotation = ChartAnnotation(**data, created_by=current_user.id)
    if meta is not None:
        annotation.annotation_metadata = meta

    db.add(annotation)
    await db.commit()
    await db.refresh(annotation)

    return annotation
