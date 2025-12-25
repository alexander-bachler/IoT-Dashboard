"""
Measurement endpoints
Time-series data queries
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_measurements():
    """Get time-series measurements"""
    return {"message": "Measurement endpoints - Coming soon"}
