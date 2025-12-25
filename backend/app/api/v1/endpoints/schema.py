"""
Schema endpoints
Dynamic schema generation for Data Navigator
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.iot import DataSource, Device, Metric, Measurement
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/nodes")
async def get_schema_nodes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dynamic schema nodes for ReactFlow visualization
    Includes both database tables and user's data sources
    """
    nodes = []
    edges = []

    # Static database schema nodes (from database tables)
    static_nodes = [
        {
            "id": "measurements",
            "type": "table",
            "position": {"x": 500, "y": 700},
            "data": {
                "label": "measurements",
                "columns": [
                    {"name": "time", "type": "TIMESTAMPTZ", "isPrimary": True},
                    {"name": "metric_id", "type": "UUID", "isPrimary": True, "isForeign": True},
                    {"name": "value", "type": "DOUBLE", "isRequired": True},
                    {"name": "quality", "type": "INTEGER"},
                ],
                "recordCount": "~10M",
                "isHypertable": True,
            },
        },
        {
            "id": "metrics",
            "type": "table",
            "position": {"x": 500, "y": 400},
            "data": {
                "label": "metrics",
                "columns": [
                    {"name": "id", "type": "UUID", "isPrimary": True},
                    {"name": "device_id", "type": "UUID", "isForeign": True},
                    {"name": "external_id", "type": "TEXT", "isRequired": True},
                    {"name": "name", "type": "TEXT", "isRequired": True},
                    {"name": "unit", "type": "TEXT"},
                    {"name": "data_type", "type": "TEXT"},
                    {"name": "created_at", "type": "TIMESTAMP"},
                ],
                "recordCount": "~500",
            },
        },
        {
            "id": "devices",
            "type": "table",
            "position": {"x": 100, "y": 400},
            "data": {
                "label": "devices",
                "columns": [
                    {"name": "id", "type": "UUID", "isPrimary": True},
                    {"name": "data_source_id", "type": "UUID", "isForeign": True},
                    {"name": "external_id", "type": "TEXT", "isRequired": True},
                    {"name": "name", "type": "TEXT", "isRequired": True},
                    {"name": "description", "type": "TEXT"},
                    {"name": "location", "type": "TEXT"},
                    {"name": "created_at", "type": "TIMESTAMP"},
                ],
                "recordCount": "~150",
            },
        },
        {
            "id": "anomalies",
            "type": "table",
            "position": {"x": 900, "y": 500},
            "data": {
                "label": "anomalies",
                "columns": [
                    {"name": "id", "type": "UUID", "isPrimary": True},
                    {"name": "metric_id", "type": "UUID", "isForeign": True},
                    {"name": "device_id", "type": "UUID", "isForeign": True},
                    {"name": "timestamp", "type": "TIMESTAMPTZ"},
                    {"name": "value", "type": "DOUBLE"},
                    {"name": "z_score", "type": "DOUBLE"},
                    {"name": "severity", "type": "TEXT"},
                ],
                "recordCount": "~2K",
            },
        },
        {
            "id": "dashboards",
            "type": "table",
            "position": {"x": 100, "y": 800},
            "data": {
                "label": "dashboards",
                "columns": [
                    {"name": "id", "type": "UUID", "isPrimary": True},
                    {"name": "name", "type": "TEXT", "isRequired": True},
                    {"name": "description", "type": "TEXT"},
                    {"name": "layout", "type": "JSONB"},
                    {"name": "created_at", "type": "TIMESTAMP"},
                ],
                "recordCount": "~25",
            },
        },
    ]

    # Load user's data sources
    result = await db.execute(
        select(DataSource).where(DataSource.owner_id == current_user.id)
    )
    data_sources = result.scalars().all()

    # Add data source nodes dynamically
    datasource_nodes = []
    # Start DataSource nodes to the left of devices, offset vertically
    datasource_x = 100
    datasource_y_start = 250  # Below data_sources_table
    for idx, ds in enumerate(data_sources):
        # Get stats for this data source
        device_count_result = await db.execute(
            select(func.count(Device.id)).where(Device.data_source_id == ds.id)
        )
        device_count = device_count_result.scalar() or 0

        metric_count_result = await db.execute(
            select(func.count(Metric.id))
            .join(Device, Device.id == Metric.device_id)
            .where(Device.data_source_id == ds.id)
        )
        metric_count = metric_count_result.scalar() or 0

        datasource_nodes.append({
            "id": f"datasource_{ds.id}",
            "type": "table",
            "position": {"x": datasource_x, "y": datasource_y_start + (idx * 180)},
            "data": {
                "label": f"DataSource: {ds.name}",
                "columns": [
                    {"name": "id", "type": "UUID", "isPrimary": True},
                    {"name": "name", "type": "TEXT", "isRequired": True},
                    {"name": "type", "type": "TEXT", "isRequired": True, "value": ds.type},
                    {"name": "api_url", "type": "TEXT", "value": ds.api_url},
                    {"name": "is_active", "type": "BOOLEAN", "value": ds.is_active},
                ],
                "recordCount": f"{device_count} devices, {metric_count} metrics",
                "isDataSource": True,
                "dataSourceType": ds.type,
                "dataSourceId": str(ds.id),
            },
        })

        # Add edge from data source to devices table
        edges.append({
            "id": f"e-datasource-{ds.id}-devices",
            "source": f"datasource_{ds.id}",
            "target": "devices",
            "sourceHandle": "id",
            "targetHandle": "data_source_id",
            "label": "1:N",
            "type": "smoothstep",
            "animated": True,
            "style": {"stroke": "#10b981"},
        })

    # Add static nodes
    nodes.extend(datasource_nodes)
    nodes.append({
        "id": "data_sources_table",
        "type": "table",
        "position": {"x": 100, "y": 100},
        "data": {
            "label": "data_sources (table)",
            "columns": [
                {"name": "id", "type": "UUID", "isPrimary": True},
                {"name": "name", "type": "TEXT", "isRequired": True},
                {"name": "type", "type": "TEXT", "isRequired": True},
                {"name": "api_url", "type": "TEXT"},
                {"name": "api_token", "type": "TEXT"},
                {"name": "client_id", "type": "TEXT"},
                {"name": "created_at", "type": "TIMESTAMP"},
            ],
            "recordCount": f"~{len(data_sources)}",
        },
    })
    nodes.extend(static_nodes)

    # Add static edges
    static_edges = [
        {
            "id": "e-datasource-table-device",
            "source": "data_sources_table",
            "target": "devices",
            "sourceHandle": "id",
            "targetHandle": "data_source_id",
            "label": "1:N",
            "type": "smoothstep",
            "animated": True,
            "style": {"stroke": "#3b82f6"},
        },
        {
            "id": "e-device-metric",
            "source": "devices",
            "target": "metrics",
            "sourceHandle": "id",
            "targetHandle": "device_id",
            "label": "1:N",
            "type": "smoothstep",
            "animated": True,
            "style": {"stroke": "#3b82f6"},
        },
        {
            "id": "e-metric-measurement",
            "source": "metrics",
            "target": "measurements",
            "sourceHandle": "id",
            "targetHandle": "metric_id",
            "label": "1:N",
            "type": "smoothstep",
            "animated": True,
            "style": {"stroke": "#3b82f6"},
        },
        {
            "id": "e-metric-anomaly",
            "source": "metrics",
            "target": "anomalies",
            "sourceHandle": "id",
            "targetHandle": "metric_id",
            "label": "1:N",
            "type": "smoothstep",
            "style": {"stroke": "#ef4444"},
        },
        {
            "id": "e-device-anomaly",
            "source": "devices",
            "target": "anomalies",
            "sourceHandle": "id",
            "targetHandle": "device_id",
            "label": "1:N",
            "type": "smoothstep",
            "style": {"stroke": "#ef4444"},
        },
    ]
    edges.extend(static_edges)

    return {
        "nodes": nodes,
        "edges": edges,
        "data_source_count": len(data_sources)
    }


@router.get("/datasources/summary")
async def get_datasources_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get summary of all data sources for ETL designer"""
    result = await db.execute(
        select(DataSource).where(DataSource.owner_id == current_user.id)
    )
    data_sources = result.scalars().all()

    summary = []
    for ds in data_sources:
        # Get stats
        device_count_result = await db.execute(
            select(func.count(Device.id)).where(Device.data_source_id == ds.id)
        )
        device_count = device_count_result.scalar() or 0

        metric_count_result = await db.execute(
            select(func.count(Metric.id))
            .join(Device, Device.id == Metric.device_id)
            .where(Device.data_source_id == ds.id)
        )
        metric_count = metric_count_result.scalar() or 0

        summary.append({
            "id": str(ds.id),
            "name": ds.name,
            "type": ds.type,
            "is_active": ds.is_active,
            "device_count": device_count,
            "metric_count": metric_count,
            "created_at": ds.created_at.isoformat() if ds.created_at else None,
            "last_sync": ds.last_sync.isoformat() if ds.last_sync else None,
        })

    return {"data_sources": summary}
