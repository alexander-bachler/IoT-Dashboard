import apiClient from '../client';
import type {
  Measurement,
  TimeSeriesData,
  MeasurementQueryParams,
  PaginatedResponse,
} from '../types';

// ============================================
// Measurements API Functions
// ============================================

export const measurementsApi = {
  /**
   * Get time-series measurements with aggregation
   */
  getTimeSeries: async (params: MeasurementQueryParams): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get<TimeSeriesData[]>('/measurements/time-series', {
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
    const response = await apiClient.get<PaginatedResponse<Measurement>>('/measurements/raw', {
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
    const response = await apiClient.get<Measurement[]>('/measurements/latest', {
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
    const response = await apiClient.get(`/measurements/statistics`, {
      params,
    });
    return response.data;
  },

  /**
   * Insert new measurements (batch)
   */
  insertBatch: async (measurements: Omit<Measurement, 'time'>[]): Promise<{ count: number }> => {
    const response = await apiClient.post<{ count: number }>('/measurements/batch', {
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
    const response = await apiClient.delete<{ count: number }>('/measurements/range', {
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
    const response = await apiClient.get<TimeSeriesData[]>('/measurements/downsample', {
      params: {
        ...params,
        metric_ids: params.metric_ids.join(','),
      },
    });
    return response.data;
  },
};
