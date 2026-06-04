"""
Dashboard endpoints
CRUD operations for dashboards and charts
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.dashboard import Dashboard, Chart
from app.schemas.dashboard import DashboardCreate, DashboardUpdate, DashboardResponse, ChartCreate, ChartUpdate, ChartResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[DashboardResponse])
async def get_dashboards(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all dashboards for current user"""
    result = await db.execute(
        select(Dashboard)
        .where(Dashboard.owner_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    dashboards = result.scalars().all()
    return dashboards


@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific dashboard"""
    result = await db.execute(
        select(Dashboard).where(
            Dashboard.id == dashboard_id,
            Dashboard.owner_id == current_user.id
        )
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )

    return dashboard


@router.post("/", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    dashboard_in: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new dashboard"""
    dashboard = Dashboard(
        **dashboard_in.dict(),
        owner_id=current_user.id
    )

    db.add(dashboard)
    await db.commit()
    await db.refresh(dashboard)

    return dashboard


@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: UUID,
    dashboard_in: DashboardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a dashboard"""
    result = await db.execute(
        select(Dashboard).where(
            Dashboard.id == dashboard_id,
            Dashboard.owner_id == current_user.id
        )
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )

    # Update fields
    update_data = dashboard_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dashboard, field, value)

    await db.commit()
    await db.refresh(dashboard)

    return dashboard


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a dashboard"""
    result = await db.execute(
        select(Dashboard).where(
            Dashboard.id == dashboard_id,
            Dashboard.owner_id == current_user.id
        )
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )

    await db.delete(dashboard)
    await db.commit()

    return None
