"""
Device endpoints
CRUD operations for IoT devices
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_devices():
    """Get all devices"""
    return {"message": "Device endpoints - Coming soon"}
