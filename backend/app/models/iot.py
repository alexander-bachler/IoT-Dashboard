"""
IoT models for devices, metrics, and measurements
"""
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Text, Boolean, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class DataSourceType(str, enum.Enum):
    """Data source types"""
    API = "api"
    MQTT = "mqtt"
    DATABASE = "database"
    FILE = "file"
    LINEMETRICS = "linemetrics"


class DataSource(Base):
    """Data source model"""
    __tablename__ = "data_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # api, mqtt, database, file
    api_url = Column(String(500), nullable=False)
    api_token = Column(String(500), nullable=False)
    client_id = Column(String(255), nullable=True)
    config = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # nullable for migration compatibility

    # Relationships
    owner = relationship("User", back_populates="data_sources")
    devices = relationship("Device", back_populates="data_source", cascade="all, delete-orphan")


class Device(Base):
    """IoT Device model"""
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    external_id = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    device_metadata = Column("metadata", JSON, nullable=True)  # renamed to avoid SQLAlchemy reserved name
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)

    # Relationships
    data_source = relationship("DataSource", back_populates="devices")
    metrics = relationship("Metric", back_populates="device", cascade="all, delete-orphan")


class Metric(Base):
    """Metric model"""
    __tablename__ = "metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    external_id = Column(String(100), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    unit = Column(String(50), nullable=True)
    metric_type = Column(String(50), nullable=True)  # float, int, boolean, string
    description = Column(Text, nullable=True)
    metric_metadata = Column("metadata", JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)

    # Composite unique constraint
    __table_args__ = (
        Index('idx_metric_device', 'external_id', 'device_id', unique=True),
    )

    # Relationships
    device = relationship("Device", back_populates="metrics")


class Measurement(Base):
    """Time-series measurement model (TimescaleDB hypertable)"""
    __tablename__ = "measurements"
    __table_args__ = {'extend_existing': True}  # Use existing hypertable

    time = Column(DateTime(timezone=True), primary_key=True, nullable=False, index=True)
    value = Column(Float, nullable=False)
    metric_id = Column(UUID(as_uuid=True), ForeignKey("metrics.id"), primary_key=True, nullable=False, index=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    quality = Column(String(50), nullable=True)
    measurement_metadata = Column("metadata", JSON, nullable=True)
