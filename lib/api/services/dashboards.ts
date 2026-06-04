import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import type { Dashboard, CreateDashboardDto, PaginatedResponse, PaginationParams } from '../types';

/**
 * Dashboard API Service
 * Handles all dashboard-related API calls
 */

export const dashboardsApi = {
  /**
   * Get all dashboards with pagination
   */
  async getAll(params?: PaginationParams): Promise<Dashboard[]> {
    const response = await apiClient.get<Dashboard[]>(API_ENDPOINTS.dashboards.list, {
      params,
    });
    return response.data;
  },

  /**
   * Get a single dashboard by ID
   */
  async getById(id: string): Promise<Dashboard> {
    const response = await apiClient.get<Dashboard>(API_ENDPOINTS.dashboards.get(id));
    return response.data;
  },

  /**
   * Create a new dashboard
   */
  async create(data: CreateDashboardDto): Promise<Dashboard> {
    const response = await apiClient.post<Dashboard>(API_ENDPOINTS.dashboards.create, data);
    return response.data;
  },

  /**
   * Update an existing dashboard
   */
  async update(id: string, data: Partial<CreateDashboardDto>): Promise<Dashboard> {
    const response = await apiClient.put<Dashboard>(
      API_ENDPOINTS.dashboards.update(id),
      data
    );
    return response.data;
  },

  /**
   * Delete a dashboard
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.dashboards.delete(id));
  },
};
