import apiClient from '../client';
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
    const response = await apiClient.get<PaginatedResponse<DataSource>>('/data-sources', {
      params,
    });
    return response.data;
  },

  /**
   * Get a single data source by ID
   */
  getById: async (id: string): Promise<DataSource> => {
    const response = await apiClient.get<DataSource>(`/data-sources/${id}`);
    return response.data;
  },

  /**
   * Create a new data source
   */
  create: async (data: CreateDataSourceDto): Promise<DataSource> => {
    const response = await apiClient.post<DataSource>('/data-sources', data);
    return response.data;
  },

  /**
   * Update an existing data source
   */
  update: async (id: string, data: UpdateDataSourceDto): Promise<DataSource> => {
    const response = await apiClient.patch<DataSource>(`/data-sources/${id}`, data);
    return response.data;
  },

  /**
   * Delete a data source
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/data-sources/${id}`);
  },

  /**
   * Test connection for a data source
   */
  testConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/data-sources/${id}/test-connection`
    );
    return response.data;
  },

  /**
   * Sync data from a data source
   */
  syncData: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/data-sources/${id}/sync`
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
    const response = await apiClient.get(`/data-sources/${id}/stats`);
    return response.data;
  },
};
