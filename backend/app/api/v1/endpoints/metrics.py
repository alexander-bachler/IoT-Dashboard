"""
Metric endpoints
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_metrics():
    """Get all metrics"""
    return {"message": "Metric endpoints - Coming soon"}
