// ============================================
// Data Source Types
// ============================================

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'mqtt' | 'database' | 'file';
  status: 'active' | 'inactive' | 'error';
  api_url?: string;
  api_token?: string;
  description?: string;
  last_sync?: string;
  created_at: string;
  updated_at?: string;
  device_count?: number;
  metric_count?: number;
}

export interface CreateDataSourceDto {
  name: string;
  type: 'api' | 'mqtt' | 'database' | 'file';
  api_url?: string;
  api_token?: string;
  description?: string;
}

export interface UpdateDataSourceDto extends Partial<CreateDataSourceDto> {
  status?: 'active' | 'inactive' | 'error';
}

// ============================================
// Device Types
// ============================================

export interface Device {
  id: string;
  source_id: string;
  external_id: string;
  name: string;
  description?: string;
  location?: string;
  status?: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at?: string;
  metric_count?: number;
}

export interface CreateDeviceDto {
  source_id: string;
  external_id: string;
  name: string;
  description?: string;
  location?: string;
}

// ============================================
// Metric Types
// ============================================

export interface Metric {
  id: string;
  device_id: string;
  external_id: string;
  name: string;
  unit?: string;
  data_type?: 'number' | 'boolean' | 'string';
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateMetricDto {
  device_id: string;
  external_id: string;
  name: string;
  unit?: string;
  data_type?: 'number' | 'boolean' | 'string';
  description?: string;
}

// ============================================
// Measurement Types
// ============================================

export interface Measurement {
  time: string;
  metric_id: string;
  value: number;
  quality?: number;
}

export interface TimeSeriesData {
  metric_id: string;
  metric_name: string;
  metric_unit?: string;
  data: Array<{
    time: string;
    value: number;
    quality?: number;
  }>;
}

export interface MeasurementQueryParams {
  metric_ids?: string[];
  start_time?: string;
  end_time?: string;
  interval?: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  limit?: number;
}

// ============================================
// Anomaly Types
// ============================================

export interface Anomaly {
  id: string;
  metric_id: string;
  device_id: string;
  timestamp: string;
  value: number;
  z_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'false_positive';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface AnomalyQueryParams {
  metric_ids?: string[];
  device_ids?: string[];
  start_time?: string;
  end_time?: string;
  severity?: ('low' | 'medium' | 'high' | 'critical')[];
  status?: ('new' | 'acknowledged' | 'resolved' | 'false_positive')[];
  limit?: number;
  offset?: number;
}

export interface UpdateAnomalyDto {
  // acknowledged_by is set server-side from the authenticated user
  acknowledged?: boolean;
}

// ============================================
// Dashboard Types
// ============================================

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  is_public?: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge';
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: Record<string, any>;
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
  layout: DashboardLayout;
  is_public?: boolean;
}

// ============================================
// Chart Configuration Types
// ============================================

export interface ChartConfig {
  id: string;
  name: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'radar';
  data_source: {
    table: string;
    x_axis: string;
    y_axis: string[];
  };
  aggregation?: 'none' | 'avg' | 'sum' | 'min' | 'max' | 'count';
  time_range?: '1h' | '24h' | '7d' | '30d' | 'custom';
  filters?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface CreateChartConfigDto {
  name: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'radar';
  data_source: {
    table: string;
    x_axis: string;
    y_axis: string[];
  };
  aggregation?: 'none' | 'avg' | 'sum' | 'min' | 'max' | 'count';
  time_range?: '1h' | '24h' | '7d' | '30d' | 'custom';
  filters?: Record<string, any>;
}

// ============================================
// ETL Pipeline Types
// ============================================

export interface ETLPipeline {
  id: string;
  name: string;
  description?: string;
  nodes: ETLNode[];
  edges: ETLEdge[];
  status: 'draft' | 'active' | 'paused' | 'error';
  schedule?: string;
  last_run?: string;
  created_at: string;
  updated_at?: string;
}

export interface ETLNode {
  id: string;
  type: 'source' | 'filter' | 'transform' | 'aggregate' | 'join' | 'output';
  label: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
  };
}

export interface ETLEdge {
  id: string;
  source: string;
  target: string;
}

export interface CreateETLPipelineDto {
  name: string;
  description?: string;
  nodes: ETLNode[];
  edges: ETLEdge[];
  schedule?: string;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  status_code: number;
}

// ============================================
// Query Parameters
// ============================================

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface TimeRangeParams {
  start_time?: string;
  end_time?: string;
}
