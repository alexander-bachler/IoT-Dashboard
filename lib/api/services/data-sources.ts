import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import type {
  DataSource,
  CreateDataSourceDto,
  UpdateDataSourceDto,
  PaginatedResponse,
  PaginationParams,
} from '../types';

// ============================================
// Data Source API Functions
// ============================================

export const dataSourcesApi = {
  /**
   * Get all data sources with pagination
   */
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<DataSource>> => {
    const response = await apiClient.get<PaginatedResponse<DataSource>>(API_ENDPOINTS.dataSources.list, {
      params,
    });
    return response.data;
  },

  /**
   * Get a single data source by ID
   */
  getById: async (id: string): Promise<DataSource> => {
    const response = await apiClient.get<DataSource>(`${API_ENDPOINTS.dataSources.list}/${id}`);
    return response.data;
  },

  /**
   * Create a new data source
   */
  create: async (data: CreateDataSourceDto): Promise<DataSource> => {
    const response = await apiClient.post<DataSource>(API_ENDPOINTS.dataSources.create, data);
    return response.data;
  },

  /**
   * Update an existing data source
   */
  update: async (id: string, data: UpdateDataSourceDto): Promise<DataSource> => {
    const response = await apiClient.patch<DataSource>(`${API_ENDPOINTS.dataSources.list}/${id}`, data);
    return response.data;
  },

  /**
   * Delete a data source
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.dataSources.list}/${id}`);
  },

  /**
   * Test connection for a data source
   */
  testConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.dataSources.list}/${id}/test-connection`
    );
    return response.data;
  },

  /**
   * Sync data from a data source
   */
  syncData: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.dataSources.list}/${id}/sync`
    );
    return response.data;
  },

  /**
   * Get statistics for a data source
   */
  getStats: async (id: string): Promise<{
    device_count: number;
    metric_count: number;
    measurement_count: number;
    last_measurement: string;
  }> => {
    const response = await apiClient.get(`${API_ENDPOINTS.dataSources.list}/${id}/stats`);
    return response.data;
  },
};
