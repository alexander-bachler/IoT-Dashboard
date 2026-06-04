import apiClient from '../client';
import { API_ENDPOINTS } from '../config';
import type {
  Calculation,
  CreateCalculationDto,
  CalculationPreviewDto,
  CalculationResult,
} from '../types';

/**
 * Calculations API service — derived metrics defined by a safe formula over
 * source metrics. See backend app/services/formula_evaluator.py.
 */
export const calculationsApi = {
  getAll: async (): Promise<Calculation[]> => {
    const res = await apiClient.get<Calculation[]>(API_ENDPOINTS.calculations.list);
    return res.data;
  },

  getById: async (id: string): Promise<Calculation> => {
    const res = await apiClient.get<Calculation>(API_ENDPOINTS.calculations.get(id));
    return res.data;
  },

  create: async (data: CreateCalculationDto): Promise<Calculation> => {
    const res = await apiClient.post<Calculation>(API_ENDPOINTS.calculations.create, data);
    return res.data;
  },

  update: async (id: string, data: Partial<CreateCalculationDto>): Promise<Calculation> => {
    const res = await apiClient.put<Calculation>(API_ENDPOINTS.calculations.update(id), data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.calculations.delete(id));
  },

  /** Evaluate an ad-hoc (unsaved) calculation — used for the live preview. */
  preview: async (data: CalculationPreviewDto): Promise<CalculationResult> => {
    const res = await apiClient.post<CalculationResult>(API_ENDPOINTS.calculations.preview, data);
    return res.data;
  },

  /** Evaluate a saved calculation over an optional time range. */
  evaluate: async (
    id: string,
    params?: { start_time?: string; end_time?: string; interval?: string }
  ): Promise<CalculationResult> => {
    const res = await apiClient.post<CalculationResult>(
      API_ENDPOINTS.calculations.evaluate(id),
      undefined,
      { params }
    );
    return res.data;
  },
};
