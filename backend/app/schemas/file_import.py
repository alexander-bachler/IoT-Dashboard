"""
File Import Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class FileImportRequest(BaseModel):
    """Request to import file data into database"""

    time_column: str = Field(description="Name of timestamp column in file")
    value_column: str = Field(description="Name of value column in file")
    device_column: Optional[str] = Field(None, description="Optional column containing device identifier")
    metric_name: str = Field(default="value", description="Name for the metric")
    device_name: Optional[str] = Field(None, description="Fixed device name if device_column not specified")


class FileImportResponse(BaseModel):
    """Response from file import"""

    success: bool
    message: str
    devices_created: int
    metrics_created: int
    measurements_imported: int
    errors: List[str] = []
