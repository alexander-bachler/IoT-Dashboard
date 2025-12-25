"""
Data Source endpoints
CRUD operations for data sources
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
import os
import aiofiles
from pathlib import Path
import pandas as pd
from datetime import datetime

from app.db.database import get_db
from app.models.user import User
from app.models.iot import DataSource, Device, Metric, Measurement
from app.schemas.data_source import DataSourceCreate, DataSourceUpdate, DataSourceResponse, DataSourceStats
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# Configure upload directory
UPLOAD_DIR = Path("/home/user/IoT-Dashboard/backend/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.json', '.parquet'}


@router.get("/", response_model=List[DataSourceResponse])
async def get_data_sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all data sources for current user"""
    skip = (page - 1) * page_size
    result = await db.execute(
        select(DataSource)
        .where(DataSource.owner_id == current_user.id)
        .offset(skip)
        .limit(page_size)
    )
    data_sources = result.scalars().all()
    return data_sources


@router.get("/{data_source_id}", response_model=DataSourceResponse)
async def get_data_source(
    data_source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    return data_source


@router.post("/", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_data_source(
    data_source_in: DataSourceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new data source"""
    data_source = DataSource(
        **data_source_in.dict(),
        owner_id=current_user.id
    )

    db.add(data_source)
    await db.commit()
    await db.refresh(data_source)

    return data_source


@router.put("/{data_source_id}", response_model=DataSourceResponse)
async def update_data_source(
    data_source_id: UUID,
    data_source_in: DataSourceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Update fields
    update_data = data_source_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(data_source, field, value)

    await db.commit()
    await db.refresh(data_source)

    return data_source


@router.delete("/{data_source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_source(
    data_source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    await db.delete(data_source)
    await db.commit()

    return None


@router.get("/{data_source_id}/stats", response_model=DataSourceStats)
async def get_data_source_stats(
    data_source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a data source"""
    # Verify ownership
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Count devices
    device_count_result = await db.execute(
        select(func.count(Device.id)).where(Device.data_source_id == data_source_id)
    )
    device_count = device_count_result.scalar() or 0

    # Count metrics
    metric_count_result = await db.execute(
        select(func.count(Metric.id))
        .join(Device, Device.id == Metric.device_id)
        .where(Device.data_source_id == data_source_id)
    )
    metric_count = metric_count_result.scalar() or 0

    # Count measurements
    measurement_count_result = await db.execute(
        select(func.count(Measurement.id))
        .join(Metric, Metric.id == Measurement.metric_id)
        .join(Device, Device.id == Metric.device_id)
        .where(Device.data_source_id == data_source_id)
    )
    measurement_count = measurement_count_result.scalar() or 0

    return DataSourceStats(
        device_count=device_count,
        metric_count=metric_count,
        measurement_count=measurement_count
    )


@router.post("/{data_source_id}/sync", response_model=DataSourceResponse)
async def sync_data_source(
    data_source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger a sync for a data source"""
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Update last_sync timestamp
    data_source.last_sync = datetime.utcnow()

    await db.commit()
    await db.refresh(data_source)

    return data_source


@router.post("/{data_source_id}/upload")
async def upload_file_to_datasource(
    data_source_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a file to a file-based data source"""
    # Verify data source exists and is owned by user
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data source not found"
        )

    # Verify it's a file type data source
    if data_source.type != "file":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data source must be of type 'file' to upload files"
        )

    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Create user-specific subdirectory
    user_upload_dir = UPLOAD_DIR / str(current_user.id) / str(data_source_id)
    user_upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = user_upload_dir / safe_filename

    # Save file
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Try to parse file and get basic stats
    file_stats = {
        "filename": safe_filename,
        "original_filename": file.filename,
        "size_bytes": len(content),
        "file_path": str(file_path),
        "uploaded_at": timestamp
    }

    try:
        if file_ext == '.csv':
            df = pd.read_csv(file_path)
            file_stats["rows"] = len(df)
            file_stats["columns"] = len(df.columns)
            file_stats["column_names"] = df.columns.tolist()
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
            file_stats["rows"] = len(df)
            file_stats["columns"] = len(df.columns)
            file_stats["column_names"] = df.columns.tolist()
        elif file_ext == '.json':
            df = pd.read_json(file_path)
            file_stats["rows"] = len(df)
            file_stats["columns"] = len(df.columns)
            file_stats["column_names"] = df.columns.tolist()
        elif file_ext == '.parquet':
            df = pd.read_parquet(file_path)
            file_stats["rows"] = len(df)
            file_stats["columns"] = len(df.columns)
            file_stats["column_names"] = df.columns.tolist()
    except Exception as e:
        file_stats["parse_error"] = str(e)

    # Update data source with file path
    data_source.api_url = str(file_path)
    data_source.last_sync = datetime.utcnow()
    data_source.is_active = True

    await db.commit()
    await db.refresh(data_source)

    return {
        "message": "File uploaded successfully",
        "data_source_id": str(data_source_id),
        "file_stats": file_stats
    }


@router.get("/{data_source_id}/files")
async def list_files(
    data_source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all files uploaded to a file-based data source"""
    # Verify data source exists and is owned by user
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id,
            DataSource.type == "file"
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File data source not found"
        )

    # List files in directory
    user_upload_dir = UPLOAD_DIR / str(current_user.id) / str(data_source_id)

    if not user_upload_dir.exists():
        return {"files": []}

    files = []
    for file_path in user_upload_dir.iterdir():
        if file_path.is_file():
            stat = file_path.stat()
            files.append({
                "filename": file_path.name,
                "size_bytes": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })

    return {"files": files}


@router.get("/{data_source_id}/file-columns")
async def get_file_columns(
    data_source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get column names from uploaded file"""
    # Verify data source exists and is file type
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id,
            DataSource.type == "file"
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File data source not found"
        )

    if not data_source.api_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded to this data source"
        )

    file_path = Path(data_source.api_url)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file not found"
        )

    # Read file and extract column names
    file_ext = file_path.suffix.lower()
    try:
        if file_ext == '.csv':
            df = pd.read_csv(file_path, nrows=0)  # Just read headers
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path, nrows=0)
        elif file_ext == '.json':
            df = pd.read_json(file_path, nrows=0)
        elif file_ext == '.parquet':
            df = pd.read_parquet(file_path)
            # Parquet doesn't have nrows param, but reading metadata is fast
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_ext}"
            )

        return {
            "columns": df.columns.tolist(),
            "column_count": len(df.columns)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file columns: {str(e)}"
        )


@router.post("/{data_source_id}/import-file")
async def import_file_to_database(
    data_source_id: UUID,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import file data into database (devices, metrics, measurements)
    
    Request body:
    - time_column: Name of timestamp column in file
    - value_column: Name of value column in file  
    - device_column: Optional - column containing device identifier
    - metric_name: Name for the metric (default: "value")
    - device_name: Fixed device name if device_column not specified
    """
    time_column = request.get("time_column")
    value_column = request.get("value_column")
    device_column = request.get("device_column")
    metric_name = request.get("metric_name", "value")
    device_name = request.get("device_name")
    
    if not time_column or not value_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="time_column and value_column are required"
        )
    
    # Verify data source exists and is file type
    result = await db.execute(
        select(DataSource).where(
            DataSource.id == data_source_id,
            DataSource.owner_id == current_user.id,
            DataSource.type == "file"
        )
    )
    data_source = result.scalar_one_or_none()

    if not data_source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File data source not found"
        )

    if not data_source.api_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded to this data source"
        )

    file_path = Path(data_source.api_url)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file not found"
        )

    # Read file based on extension
    file_ext = file_path.suffix.lower()
    try:
        if file_ext == '.csv':
            df = pd.read_csv(file_path)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif file_ext == '.json':
            df = pd.read_json(file_path)
        elif file_ext == '.parquet':
            df = pd.read_parquet(file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_ext}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )

    # Validate columns exist
    if time_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time column '{time_column}' not found. Available: {', '.join(df.columns)}"
        )

    if value_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Value column '{value_column}' not found"
        )

    if device_column and device_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device column '{device_column}' not found"
        )

    # Statistics
    stats = {
        "devices_created": 0,
        "metrics_created": 0,
        "measurements_imported": 0,
        "errors": []
    }

    # Get or create devices
    device_map = {}

    if device_column:
        # Multiple devices from column
        unique_devices = df[device_column].unique()
        for device_name_val in unique_devices:
            device_name_str = str(device_name_val)
            external_id = f"file_{data_source_id}_{device_name_str}"

            # Check if device exists
            device_result = await db.execute(
                select(Device).where(
                    Device.external_id == external_id,
                    Device.data_source_id == data_source_id
                )
            )
            device = device_result.scalar_one_or_none()

            if not device:
                device = Device(
                    external_id=external_id,
                    name=device_name_str,
                    data_source_id=data_source_id,
                    is_active=True
                )
                db.add(device)
                await db.flush()
                stats["devices_created"] += 1

            device_map[device_name_str] = device
    else:
        # Single device
        device_name_str = device_name or f"FileDevice_{file_path.stem}"
        external_id = f"file_{data_source_id}_default"

        device_result = await db.execute(
            select(Device).where(
                Device.external_id == external_id,
                Device.data_source_id == data_source_id
            )
        )
        device = device_result.scalar_one_or_none()

        if not device:
            device = Device(
                external_id=external_id,
                name=device_name_str,
                data_source_id=data_source_id,
                is_active=True
            )
            db.add(device)
            await db.flush()
            stats["devices_created"] += 1

        device_map["default"] = device

    # Create metrics
    metric_map = {}

    for device_key, device in device_map.items():
        external_metric_id = f"{device.external_id}_{metric_name}"

        metric_result = await db.execute(
            select(Metric).where(
                Metric.external_id == external_metric_id,
                Metric.device_id == device.id
            )
        )
        metric = metric_result.scalar_one_or_none()

        if not metric:
            metric = Metric(
                external_id=external_metric_id,
                name=metric_name,
                device_id=device.id,
                metric_type="float",
                is_active=True
            )
            db.add(metric)
            await db.flush()
            stats["metrics_created"] += 1

        metric_map[(str(device.id), metric_name)] = metric

    # Import measurements
    for idx, row in df.iterrows():
        try:
            timestamp = pd.to_datetime(row[time_column])
            value = float(row[value_column])

            if device_column:
                device_key = str(row[device_column])
                device = device_map.get(device_key)
            else:
                device = device_map["default"]

            if not device:
                stats["errors"].append(f"Row {idx}: Device not found")
                continue

            metric = metric_map.get((str(device.id), metric_name))
            if not metric:
                stats["errors"].append(f"Row {idx}: Metric not found")
                continue

            measurement = Measurement(
                time=timestamp,
                value=value,
                metric_id=metric.id,
                device_id=device.id
            )
            db.add(measurement)
            stats["measurements_imported"] += 1

        except Exception as e:
            stats["errors"].append(f"Row {idx}: {str(e)}")

    await db.commit()

    return {
        "success": True,
        "message": f"Imported {stats['measurements_imported']} measurements",
        **stats
    }
