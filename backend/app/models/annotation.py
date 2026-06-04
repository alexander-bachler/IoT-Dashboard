"""
Chart annotation model

Maps the existing `chart_annotations` table (created via the Drizzle SQL
migrations) so annotations can be served/persisted through FastAPI.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


class ChartAnnotation(Base):
    """User-defined event marker shown on charts."""
    __tablename__ = "chart_annotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    end_timestamp = Column(DateTime(timezone=True), nullable=True)  # for range annotations
    type = Column(String(50), nullable=False, default="event")  # event, deployment, incident, maintenance
    severity = Column(String(20), nullable=True)  # info, warning, critical
    color = Column(String(20), nullable=True, default="#3b82f6")
    tags = Column(JSON, nullable=True, default=list)
    annotation_metadata = Column("metadata", JSON, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
