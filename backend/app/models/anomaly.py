"""
Anomaly detection models
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.database import Base


class AnomalySeverity(str, enum.Enum):
    """Anomaly severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnomalyStatus(str, enum.Enum):
    """Anomaly status"""
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class Anomaly(Base):
    """Anomaly detection model"""
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=True)
    z_score = Column(Float, nullable=True)
    severity = Column(SQLEnum(AnomalySeverity), default=AnomalySeverity.MEDIUM, nullable=False)
    status = Column(SQLEnum(AnomalyStatus), default=AnomalyStatus.NEW, nullable=False)
    description = Column(Text, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    metric_id = Column(Integer, ForeignKey("metrics.id"), nullable=False, index=True)

    # Composite index for filtering
    __table_args__ = (
        Index('idx_anomaly_severity_status', 'severity', 'status'),
        Index('idx_anomaly_metric_time', 'metric_id', 'timestamp'),
    )

    # Relationships
    metric = relationship("Metric")
