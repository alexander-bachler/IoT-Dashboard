"""
Schema endpoints
Dynamic schema generation for Data Navigator
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
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


@router.get("/tables")
async def get_database_tables(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of database tables with metadata"""
    query = text("""
        SELECT
            t.table_name,
            t.table_schema,
            obj_description((t.table_schema || '.' || t.table_name)::regclass, 'pg_class') as table_description,
            COUNT(c.column_name) as column_count
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c
            ON t.table_name = c.table_name
            AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name, t.table_schema, table_description
        ORDER BY t.table_name
    """)

    result = await db.execute(query)
    tables = result.fetchall()

    return [
        {
            "name": row.table_name,
            "schema": row.table_schema,
            "description": row.table_description or f"Table {row.table_name}",
            "display_name": _format_display_name(row.table_name),
            "column_count": row.column_count
        }
        for row in tables
    ]


@router.get("/tables/{table_name}/columns")
async def get_table_columns(
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get columns for a specific table"""
    query = text("""
        SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.ordinal_position,
            col_description((c.table_schema || '.' || c.table_name)::regclass, c.ordinal_position) as column_description
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
            AND c.table_name = :table_name
        ORDER BY c.ordinal_position
    """)

    result = await db.execute(query, {"table_name": table_name})
    columns = result.fetchall()

    if not columns:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table {table_name} not found"
        )

    return [
        {
            "name": row.column_name,
            "original_name": row.column_name,
            "data_type": _format_data_type(row.data_type, row.character_maximum_length, row.numeric_precision, row.numeric_scale),
            "original_data_type": row.data_type,
            "nullable": row.is_nullable == "YES",
            "default_value": row.column_default,
            "description": row.column_description or f"Column {row.column_name}",
            "display_name": _format_display_name(row.column_name),
            "is_modified": False
        }
        for row in columns
    ]


@router.get("/tables/{table_name}/preview")
async def preview_table_data(
    table_name: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get preview data from a table (limited to allowed tables)"""
    # Whitelist of allowed tables for security
    allowed_tables = ["measurements", "devices", "metrics", "data_sources", "dashboards", "anomalies"]
    if table_name not in allowed_tables:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Table {table_name} not allowed for preview"
        )

    # Get column names first
    columns_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = :table_name
        ORDER BY ordinal_position
    """)

    columns_result = await db.execute(columns_query, {"table_name": table_name})
    columns = [row.column_name for row in columns_result.fetchall()]

    if not columns:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table {table_name} not found"
        )

    # Get preview data using parameterized query
    # Note: table name cannot be parameterized, but we validated it above
    data_query = text(f"SELECT * FROM {table_name} LIMIT :limit")

    data_result = await db.execute(data_query, {"limit": limit})
    rows = data_result.fetchall()

    # Convert rows to dictionaries
    data = []
    for row in rows:
        row_dict = {}
        for i, col in enumerate(columns):
            value = row[i]
            # Convert non-serializable types to strings
            if hasattr(value, 'isoformat'):
                row_dict[col] = value.isoformat()
            else:
                row_dict[col] = str(value) if value is not None else None
        data.append(row_dict)

    return {
        "columns": columns,
        "data": data,
        "row_count": len(data)
    }


def _format_display_name(name: str) -> str:
    """Convert snake_case to Title Case"""
    return ' '.join(word.capitalize() for word in name.replace('_', ' ').split())


def _format_data_type(data_type: str, max_length: int | None, precision: int | None, scale: int | None) -> str:
    """Format data type with length/precision"""
    if data_type == "character varying" and max_length:
        return f"VARCHAR({max_length})"
    elif data_type == "numeric" and precision:
        if scale:
            return f"NUMERIC({precision},{scale})"
        return f"NUMERIC({precision})"
    elif data_type == "timestamp with time zone":
        return "TIMESTAMPTZ"
    elif data_type == "timestamp without time zone":
        return "TIMESTAMP"
    elif data_type == "double precision":
        return "DOUBLE PRECISION"
    elif data_type == "character":
        return "CHAR"
    elif data_type == "text":
        return "TEXT"
    elif data_type == "integer":
        return "INTEGER"
    elif data_type == "bigint":
        return "BIGINT"
    elif data_type == "boolean":
        return "BOOLEAN"
    elif data_type == "uuid":
        return "UUID"
    elif data_type == "jsonb":
        return "JSONB"
    elif data_type == "json":
        return "JSON"
    else:
        return data_type.upper()
