"""
Report models: scheduled report definitions and their run history.

Maps scheduled_reports / report_history (db/schema-reports.ts). Created via the
app's metadata create_all on startup.
"""
from sqlalchemy import Column, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    schedule = Column(Text, nullable=False)  # cron expression (scheduler not implemented)
    type = Column(Text, nullable=False, default="dashboard")  # dashboard, metrics, alerts
    format = Column(Text, nullable=False, default="pdf")  # pdf, excel, json
    recipients = Column(JSON, nullable=False)  # list[str] of email addresses
    configuration = Column(JSON, nullable=False)  # metric_ids, time range, dashboard id, ...
    is_active = Column(Boolean, nullable=False, default=True)
    last_run = Column(DateTime(timezone=True), nullable=True)
    next_run = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("scheduled_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Text, nullable=False, default="pending")  # pending, running, completed, failed
    file_path = Column(Text, nullable=True)
    file_size = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
