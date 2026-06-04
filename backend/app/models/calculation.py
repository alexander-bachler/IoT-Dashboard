"""
Custom calculation model.

Maps the existing `custom_calculations` table (created via the Drizzle SQL
migrations). A calculation is a derived metric defined by a safe arithmetic
formula over a set of source metrics.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


class CustomCalculation(Base):
    __tablename__ = "custom_calculations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    formula = Column(Text, nullable=False)
    # variable name -> source metric id (UUID as string), e.g. {"a": "...", "b": "..."}
    source_metric_ids = Column(JSON, nullable=False)
    unit = Column(Text, nullable=True)
    aggregation_type = Column(String(20), nullable=False, default="none")  # none, sum, avg, min, max
    calculation_metadata = Column("metadata", JSON, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
