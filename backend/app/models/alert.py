"""
Alert models: threshold-based rules and the events they trigger.

Maps the alert_rules / alert_events tables (db/schema-alerts.ts). These tables
are created by the app's metadata create_all on startup.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=True)

    condition = Column(Text, nullable=False)  # greater_than, less_than, equal_to, not_equal_to, ...
    threshold = Column(Float, nullable=False)

    duration = Column(Text, nullable=True)  # e.g. '5 minutes' (sustained breach) — not yet enforced
    severity = Column(Text, nullable=False)  # info, warning, critical

    notification_channels = Column(JSON, nullable=True)  # ['email', 'webhook', ...]
    notification_config = Column(JSON, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    last_triggered = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    alert_rule_id = Column(UUID(as_uuid=True), ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False, index=True)

    triggered_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    measurement_value = Column(Float, nullable=False)
    measurement_time = Column(DateTime(timezone=True), nullable=False)

    status = Column(Text, nullable=False)  # active, resolved, acknowledged
    acknowledged_by = Column(Text, nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)

    alert_metadata = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
