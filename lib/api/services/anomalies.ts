import apiClient from '../client';
import type { Anomaly, AnomalyQueryParams, UpdateAnomalyDto, PaginatedResponse } from '../types';

// ============================================
// Anomalies API Functions
// ============================================

export const anomaliesApi = {
  /**
   * Get all anomalies with filtering and pagination
   */
  getAll: async (params?: AnomalyQueryParams): Promise<PaginatedResponse<Anomaly>> => {
    const response = await apiClient.get<PaginatedResponse<Anomaly>>('/anomalies', {
      params: {
        ...params,
        metric_ids: params?.metric_ids?.join(','),
        device_ids: params?.device_ids?.join(','),
        severity: params?.severity?.join(','),
        status: params?.status?.join(','),
      },
    });
    return response.data;
  },

  /**
   * Get a single anomaly by ID
   */
  getById: async (id: string): Promise<Anomaly> => {
    const response = await apiClient.get<Anomaly>(`/anomalies/${id}`);
    return response.data;
  },

  /**
   * Update anomaly status (acknowledge, resolve, etc.)
   */
  update: async (id: string, data: UpdateAnomalyDto): Promise<Anomaly> => {
    const response = await apiClient.patch<Anomaly>(`/anomalies/${id}`, data);
    return response.data;
  },

  /**
   * Bulk update anomaly status
   */
  bulkUpdate: async (ids: string[], data: UpdateAnomalyDto): Promise<{ count: number }> => {
    const response = await apiClient.patch<{ count: number }>('/anomalies/bulk', {
      ids,
      ...data,
    });
    return response.data;
  },

  /**
   * Delete an anomaly (mark as false positive)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/anomalies/${id}`);
  },

  /**
   * Get anomaly statistics
   */
  getStatistics: async (params?: {
    start_time?: string;
    end_time?: string;
  }): Promise<{
    total: number;
    by_severity: Record<string, number>;
    by_status: Record<string, number>;
    trend: Array<{ date: string; count: number }>;
  }> => {
    const response = await apiClient.get('/anomalies/statistics', { params });
    return response.data;
  },

  /**
   * Get recent anomalies (last 24h)
   */
  getRecent: async (limit: number = 10): Promise<Anomaly[]> => {
    const response = await apiClient.get<Anomaly[]>('/anomalies/recent', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Trigger anomaly detection for specific metrics
   */
  triggerDetection: async (metricIds: string[]): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/anomalies/detect',
      {
        metric_ids: metricIds,
      }
    );
    return response.data;
  },
};
