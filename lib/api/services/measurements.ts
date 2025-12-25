import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import type {
  Measurement,
  TimeSeriesData,
  MeasurementQueryParams,
  PaginatedResponse,
} from '../types';

const BASE_PATH = '/api/v1/measurements';

// ============================================
// Measurements API Functions
// ============================================

export const measurementsApi = {
  /**
   * Get time-series measurements with aggregation
   */
  getTimeSeries: async (params: MeasurementQueryParams): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get<TimeSeriesData[]>(`${BASE_PATH}/time-series`, {
      params: {
        ...params,
        metric_ids: params.metric_ids?.join(','),
      },
    });
    return response.data;
  },

  /**
   * Get raw measurements with pagination
   */
  getRaw: async (
    params: MeasurementQueryParams & { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Measurement>> => {
    const response = await apiClient.get<PaginatedResponse<Measurement>>(`${BASE_PATH}/raw`, {
      params: {
        ...params,
        metric_ids: params.metric_ids?.join(','),
      },
    });
    return response.data;
  },

  /**
   * Get latest measurements for given metrics
   */
  getLatest: async (metricIds: string[]): Promise<Measurement[]> => {
    const response = await apiClient.get<Measurement[]>(`${BASE_PATH}/latest`, {
      params: {
        metric_ids: metricIds.join(','),
      },
    });
    return response.data;
  },

  /**
   * Get aggregated statistics for a metric
   */
  getStatistics: async (params: {
    metric_id: string;
    start_time?: string;
    end_time?: string;
  }): Promise<{
    avg: number;
    min: number;
    max: number;
    sum: number;
    count: number;
    std_dev: number;
  }> => {
    const response = await apiClient.get(`${BASE_PATH}/statistics`, {
      params,
    });
    return response.data;
  },

  /**
   * Insert new measurements (batch)
   */
  insertBatch: async (measurements: Omit<Measurement, 'time'>[]): Promise<{ count: number }> => {
    const response = await apiClient.post<{ count: number }>(`${BASE_PATH}/batch`, {
      measurements,
    });
    return response.data;
  },

  /**
   * Delete measurements within a time range
   */
  deleteRange: async (params: {
    metric_id: string;
    start_time: string;
    end_time: string;
  }): Promise<{ count: number }> => {
    const response = await apiClient.delete<{ count: number }>(`${BASE_PATH}/range`, {
      params,
    });
    return response.data;
  },

  /**
   * Get downsampled data for visualization
   */
  getDownsampled: async (params: {
    metric_ids: string[];
    start_time?: string;
    end_time?: string;
    bucket_size: string; // e.g., '1h', '5m', '1d'
    aggregation?: 'avg' | 'sum' | 'min' | 'max';
  }): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get<TimeSeriesData[]>(`${BASE_PATH}/downsample`, {
      params: {
        ...params,
        metric_ids: params.metric_ids.join(','),
      },
    });
    return response.data;
  },
};
