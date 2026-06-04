import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import type {
  Report,
  CreateReportDto,
  ReportHistoryEntry,
  ReportGenerationResult,
} from '../types';

/** Reports API service — scheduled report definitions + on-demand generation. */
export const reportsApi = {
  getAll: async (): Promise<Report[]> => {
    const res = await apiClient.get<Report[]>(API_ENDPOINTS.reports.list);
    return res.data;
  },

  create: async (data: CreateReportDto): Promise<Report> => {
    const res = await apiClient.post<Report>(API_ENDPOINTS.reports.create, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.reports.delete(id));
  },

  generate: async (
    id: string,
    params?: { start_time?: string; end_time?: string }
  ): Promise<ReportGenerationResult> => {
    const res = await apiClient.post<ReportGenerationResult>(
      API_ENDPOINTS.reports.generate(id),
      undefined,
      { params }
    );
    return res.data;
  },

  getHistory: async (id: string): Promise<ReportHistoryEntry[]> => {
    const res = await apiClient.get<ReportHistoryEntry[]>(API_ENDPOINTS.reports.history(id));
    return res.data;
  },
};
