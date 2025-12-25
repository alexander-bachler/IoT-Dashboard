"""
Anomaly detection models
"""
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Boolean, Index, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class AnomalySeverity(str, enum.Enum):
    """Anomaly severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnomalyStatus(str, enum.Enum):
    """Anomaly status (derived from acknowledged field)"""
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class Anomaly(Base):
    """Anomaly detection model"""
    __tablename__ = "anomalies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id"), nullable=False, index=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=True)
    z_score = Column(Float, nullable=True)
    severity = Column(String(20), default='low', nullable=False)  # low, medium, high, critical
    type = Column(String(50), default='statistical', nullable=False)  # statistical, threshold, pattern, ml
    description = Column(Text, nullable=True)
    acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_by = Column(UUID(as_uuid=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    anomaly_metadata = Column("metadata", JSON, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    metric = relationship("Metric")
    device = relationship("Device")
