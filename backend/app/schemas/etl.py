"""
Pydantic schemas for ETL Pipeline endpoints
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import UUID


class ETLNode(BaseModel):
    """ETL Pipeline Node"""
    id: str
    type: str
    data: Dict[str, Any]
    position: Dict[str, float]


class ETLEdge(BaseModel):
    """ETL Pipeline Edge"""
    id: str
    source: str
    target: str
    type: Optional[str] = None


class ETLPipeline(BaseModel):
    """ETL Pipeline Definition"""
    name: str
    description: Optional[str] = None
    nodes: List[ETLNode]
    edges: List[ETLEdge]


class ETLExecutionRequest(BaseModel):
    """Request to execute an ETL pipeline"""
    pipeline: ETLPipeline
    preview_only: bool = False
    preview_limit: int = 100


class ETLExecutionResult(BaseModel):
    """Result of ETL pipeline execution"""
    success: bool
    message: str
    rows_processed: int
    execution_time_ms: float
    preview_data: Optional[List[Dict[str, Any]]] = None
    errors: List[str] = []
