"""
Main API router
Includes all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, dashboards, data_sources, devices, metrics, measurements, anomalies

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["Data Sources"])
api_router.include_router(devices.router, prefix="/devices", tags=["Devices"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
api_router.include_router(measurements.router, prefix="/measurements", tags=["Measurements"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies"])
