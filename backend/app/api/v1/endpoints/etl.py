"""
ETL Pipeline endpoints
Execute and manage ETL pipelines
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from app.schemas.etl import ETLExecutionRequest, ETLExecutionResult
from app.services.etl_executor import ETLExecutor

router = APIRouter()


@router.post("/execute", response_model=ETLExecutionResult)
async def execute_pipeline(
    request: ETLExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Execute an ETL pipeline"""
    try:
        executor = ETLExecutor(db, str(current_user.id))
        result = await executor.execute_pipeline(
            pipeline=request.pipeline,
            preview_only=request.preview_only,
            preview_limit=request.preview_limit
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute pipeline: {str(e)}"
        )
