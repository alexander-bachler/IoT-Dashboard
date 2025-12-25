"""
Anomaly endpoints
Anomaly detection and management
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_anomalies():
    """Get anomalies"""
    return {"message": "Anomaly endpoints - Coming soon"}
