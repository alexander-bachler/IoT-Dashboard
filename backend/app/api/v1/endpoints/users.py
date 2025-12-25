"""
User management endpoints
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_users():
    """Get all users (admin only)"""
    return {"message": "User endpoints - Coming soon"}
