"""
IoT models for devices, metrics, and measurements
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Text, Boolean, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.database import Base


class DataSourceType(str, enum.Enum):
    """Data source types"""
    API = "api"
    MQTT = "mqtt"
    DATABASE = "database"
    FILE = "file"


class DataSourceStatus(str, enum.Enum):
    """Data source status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class DataSource(Base):
    """Data source model"""
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    type = Column(SQLEnum(DataSourceType), nullable=False)
    status = Column(SQLEnum(DataSourceStatus), default=DataSourceStatus.ACTIVE, nullable=False)
    api_url = Column(String(500), nullable=True)
    api_token = Column(String(500), nullable=True)  # Encrypted
    config = Column(JSON, nullable=True)  # Additional configuration
    description = Column(Text, nullable=True)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="data_sources")
    devices = relationship("Device", back_populates="data_source", cascade="all, delete-orphan")


class Device(Base):
    """IoT Device model"""
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    metadata = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)

    # Relationships
    data_source = relationship("DataSource", back_populates="devices")
    metrics = relationship("Metric", back_populates="device", cascade="all, delete-orphan")


class Metric(Base):
    """Metric model"""
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    metric_id = Column(String(100), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    unit = Column(String(50), nullable=True)
    data_type = Column(String(50), nullable=True)  # float, int, boolean, string
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)

    # Composite unique constraint
    __table_args__ = (
        Index('idx_metric_device', 'metric_id', 'device_id', unique=True),
    )

    # Relationships
    device = relationship("Device", back_populates="metrics")
    measurements = relationship("Measurement", back_populates="metric", cascade="all, delete-orphan")


class Measurement(Base):
    """Time-series measurement model (TimescaleDB hypertable)"""
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float, nullable=False)
    quality = Column(Float, nullable=True)  # Data quality score 0-1
    tags = Column(JSON, nullable=True)  # Additional tags
    metric_id = Column(Integer, ForeignKey("metrics.id"), nullable=False, index=True)

    # Composite index for time-series queries
    __table_args__ = (
        Index('idx_measurement_metric_time', 'metric_id', 'timestamp'),
        Index('idx_measurement_time', 'timestamp'),
    )

    # Relationships
    metric = relationship("Metric", back_populates="measurements")
