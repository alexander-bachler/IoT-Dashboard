import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import type { Anomaly, AnomalyQueryParams, UpdateAnomalyDto, PaginatedResponse } from '../types';

const BASE_PATH = '/api/v1/anomalies';

// ============================================
// Anomalies API Functions
// ============================================

export const anomaliesApi = {
  /**
   * Get all anomalies with filtering and pagination
   */
  getAll: async (params?: AnomalyQueryParams): Promise<PaginatedResponse<Anomaly>> => {
    // The backend exposes POST /query (AnomalyQuery body) and returns a plain list.
    // Map the frontend filters and wrap the result in a paginated envelope.
    const statuses = params?.status;
    const acknowledged = statuses?.includes('acknowledged')
      ? true
      : statuses?.includes('new')
      ? false
      : undefined;

    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const response = await apiClient.post<Anomaly[]>(`${BASE_PATH}/query`, {
      metric_ids: params?.metric_ids,
      severity: params?.severity,
      acknowledged,
      start_time: params?.start_time,
      end_time: params?.end_time,
      limit,
      offset,
    });

    const items = response.data || [];
    return {
      data: items,
      total: items.length,
      page: Math.floor(offset / limit) + 1,
      page_size: limit,
      total_pages: 1,
    };
  },

  /**
   * Get a single anomaly by ID
   */
  getById: async (id: string): Promise<Anomaly> => {
    const response = await apiClient.get<Anomaly>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  /**
   * Update anomaly status (acknowledge, resolve, etc.)
   */
  update: async (id: string, data: UpdateAnomalyDto): Promise<Anomaly> => {
    const response = await apiClient.put<Anomaly>(`${BASE_PATH}/${id}`, data);
    return response.data;
  },

  /**
   * Bulk update anomaly status
   */
  bulkUpdate: async (ids: string[], data: UpdateAnomalyDto): Promise<{ count: number }> => {
    const response = await apiClient.patch<{ count: number }>(`${BASE_PATH}/bulk`, {
      ids,
      ...data,
    });
    return response.data;
  },

  /**
   * Delete an anomaly (mark as false positive)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  /**
   * Get anomaly statistics
   */
  getStatistics: async (params?: {
    start_time?: string;
    end_time?: string;
  }): Promise<{
    total: number;
    by_severity?: Record<string, number>;
    by_acknowledged?: Record<string, number>;
    by_status?: Record<string, number>;
    recent_count?: number;
  }> => {
    const response = await apiClient.get(`${BASE_PATH}/stats`, { params });
    return response.data;
  },

  /**
   * Get recent anomalies (last 24h)
   */
  getRecent: async (limit: number = 10): Promise<Anomaly[]> => {
    const response = await apiClient.get<Anomaly[]>(`${BASE_PATH}/recent`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Trigger anomaly detection for specific metrics
   */
  triggerDetection: async (metricIds: string[]): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${BASE_PATH}/detect`,
      {
        metric_ids: metricIds,
      }
    );
    return response.data;
  },
};
