import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/services/reports';
import type { CreateReportDto } from '../api/types';
import { toast } from 'sonner';

export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
};

const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.detail || e?.message || fallback;

export function useReports(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportKeys.lists(),
    queryFn: () => reportsApi.getAll(),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReportDto) => reportsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      toast.success('Report saved');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to save report')),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      toast.success('Report deleted');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to delete report')),
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsApi.generate(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      toast.success(`Generated: ${result.sections.length} section(s)`);
    },
    onError: (e: any) => toast.error(errMsg(e, 'Generation failed')),
  });
}
