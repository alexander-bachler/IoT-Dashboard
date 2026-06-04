import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import type {
  AlertRule,
  CreateAlertRuleDto,
  AlertEvent,
  AlertEvaluationResult,
} from '../types';

/** Alerts API service — threshold rules and the events they trigger. */
export const alertsApi = {
  getRules: async (): Promise<AlertRule[]> => {
    const res = await apiClient.get<AlertRule[]>(API_ENDPOINTS.alerts.rules);
    return res.data;
  },

  createRule: async (data: CreateAlertRuleDto): Promise<AlertRule> => {
    const res = await apiClient.post<AlertRule>(API_ENDPOINTS.alerts.rules, data);
    return res.data;
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.alerts.rule(id));
  },

  evaluateRule: async (
    id: string,
    params?: { start_time?: string; end_time?: string }
  ): Promise<AlertEvaluationResult> => {
    const res = await apiClient.post<AlertEvaluationResult>(
      API_ENDPOINTS.alerts.evaluate(id),
      undefined,
      { params }
    );
    return res.data;
  },

  getEvents: async (params?: { status_filter?: string; limit?: number }): Promise<AlertEvent[]> => {
    const res = await apiClient.get<AlertEvent[]>(API_ENDPOINTS.alerts.events, { params });
    return res.data;
  },

  acknowledgeEvent: async (id: string): Promise<AlertEvent> => {
    const res = await apiClient.post<AlertEvent>(API_ENDPOINTS.alerts.acknowledge(id));
    return res.data;
  },
};
