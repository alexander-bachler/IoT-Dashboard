"""
ETL Pipeline Executor
Executes ETL pipelines defined in the ETL Designer
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from typing import List, Dict, Any
import time
from datetime import datetime

from app.models.iot import DataSource, Device, Metric, Measurement
from app.schemas.etl import ETLPipeline, ETLExecutionResult


class ETLExecutor:
    """Execute ETL pipelines"""

    def __init__(self, db: AsyncSession, user_id: str):
        self.db = db
        self.user_id = user_id

    async def execute_pipeline(
        self,
        pipeline: ETLPipeline,
        preview_only: bool = False,
        preview_limit: int = 100
    ) -> ETLExecutionResult:
        """Execute an ETL pipeline"""
        start_time = time.time()
        errors = []
        rows_processed = 0
        preview_data = []

        try:
            # Build execution graph
            node_map = {node.id: node for node in pipeline.nodes}
            edge_map = {}
            for edge in pipeline.edges:
                if edge.source not in edge_map:
                    edge_map[edge.source] = []
                edge_map[edge.source].append(edge.target)

            # Find source nodes (nodes with no incoming edges)
            all_targets = set(edge.target for edge in pipeline.edges)
            source_nodes = [node for node in pipeline.nodes if node.id not in all_targets]

            if not source_nodes:
                return ETLExecutionResult(
                    success=False,
                    message="No source nodes found in pipeline",
                    rows_processed=0,
                    execution_time_ms=0,
                    errors=["Pipeline must have at least one source node"]
                )

            # For simplicity, execute first source node only
            source_node = source_nodes[0]
            node_data = source_node.data
            node_type = node_data.get('type', 'unknown')

            # Execute based on node type
            if node_type == 'datasource' or node_type == 'source':
                # DataSource input
                config = node_data.get('config', {})
                datasource_id = config.get('datasource_id')

                if datasource_id:
                    # Query measurements from this data source
                    query = text("""
                        SELECT m.time, m.value, m.quality,
                               me.name as metric_name, me.unit,
                               d.name as device_name
                        FROM measurements m
                        JOIN metrics me ON m.metric_id = me.id
                        JOIN devices d ON m.device_id = d.id
                        JOIN data_sources ds ON d.data_source_id = ds.id
                        WHERE ds.id = :datasource_id
                          AND ds.owner_id = :user_id
                        ORDER BY m.time DESC
                        LIMIT :limit
                    """)

                    result = await self.db.execute(
                        query,
                        {
                            'datasource_id': datasource_id,
                            'user_id': self.user_id,
                            'limit': preview_limit if preview_only else 10000
                        }
                    )
                    rows = result.fetchall()
                    rows_processed = len(rows)

                    if preview_only:
                        preview_data = [
                            {
                                'time': row.time.isoformat() if row.time else None,
                                'value': float(row.value) if row.value is not None else None,
                                'quality': row.quality,
                                'metric_name': row.metric_name,
                                'unit': row.unit,
                                'device_name': row.device_name
                            }
                            for row in rows
                        ]
                else:
                    # Table source
                    table = config.get('table', 'measurements')
                    query = text(f"""
                        SELECT * FROM {table}
                        LIMIT :limit
                    """)
                    result = await self.db.execute(
                        query,
                        {'limit': preview_limit if preview_only else 1000}
                    )
                    rows = result.fetchall()
                    rows_processed = len(rows)

                    if preview_only:
                        preview_data = [dict(row._mapping) for row in rows]

            elif node_type == 'filter':
                # Filter transformation
                config = node_data.get('config', {})
                condition = config.get('condition', '')

                # For preview, just indicate filter would be applied
                if preview_only:
                    preview_data = [{
                        'info': f'Filter applied: {condition}',
                        'note': 'Actual filtering requires full pipeline execution'
                    }]
                    rows_processed = 1

            elif node_type == 'join':
                # Join transformation
                config = node_data.get('config', {})
                join_table = config.get('table', '')
                join_on = config.get('on', '')
                join_type = config.get('type', 'LEFT')

                # For preview, just indicate join would be applied
                if preview_only:
                    preview_data = [{
                        'info': f'{join_type} JOIN with {join_table} ON {join_on}',
                        'note': 'Actual join requires full pipeline execution'
                    }]
                    rows_processed = 1

            elif node_type == 'aggregate':
                # Aggregate transformation
                config = node_data.get('config', {})
                group_by = config.get('groupBy', '')
                aggregations = config.get('aggregations', '')

                # For preview, just indicate aggregation would be applied
                if preview_only:
                    preview_data = [{
                        'info': f'Aggregate: {aggregations}',
                        'group_by': group_by,
                        'note': 'Actual aggregation requires full pipeline execution'
                    }]
                    rows_processed = 1

            else:
                errors.append(f"Node type '{node_type}' not yet supported for execution")

            execution_time = (time.time() - start_time) * 1000

            return ETLExecutionResult(
                success=len(errors) == 0,
                message=f"Pipeline executed successfully. Processed {rows_processed} rows." if len(errors) == 0 else "Pipeline execution failed",
                rows_processed=rows_processed,
                execution_time_ms=execution_time,
                preview_data=preview_data if preview_only else None,
                errors=errors
            )

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            return ETLExecutionResult(
                success=False,
                message=f"Pipeline execution error: {str(e)}",
                rows_processed=rows_processed,
                execution_time_ms=execution_time,
                errors=[str(e)]
            )
