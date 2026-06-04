import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calculationsApi } from '../api/services/calculations';
import type { CreateCalculationDto, CalculationPreviewDto } from '../api/types';
import { toast } from 'sonner';

export const calculationKeys = {
  all: ['calculations'] as const,
  lists: () => [...calculationKeys.all, 'list'] as const,
};

export function useCalculations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: calculationKeys.lists(),
    queryFn: () => calculationsApi.getAll(),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCalculationDto) => calculationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calculationKeys.lists() });
      toast.success('Calculation saved');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Failed to save calculation'),
  });
}

export function useDeleteCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calculationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calculationKeys.lists() });
      toast.success('Calculation deleted');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Failed to delete calculation'),
  });
}

/** Live preview of an unsaved formula (no cache invalidation). */
export function usePreviewCalculation() {
  return useMutation({
    mutationFn: (data: CalculationPreviewDto) => calculationsApi.preview(data),
  });
}
