import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api/services/alerts';
import type { CreateAlertRuleDto } from '../api/types';
import { toast } from 'sonner';

export const alertKeys = {
  all: ['alerts'] as const,
  rules: () => [...alertKeys.all, 'rules'] as const,
  events: () => [...alertKeys.all, 'events'] as const,
};

const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.detail || e?.message || fallback;

export function useAlertRules(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: alertKeys.rules(),
    queryFn: () => alertsApi.getRules(),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertRuleDto) => alertsApi.createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertKeys.rules() });
      toast.success('Alert rule created');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to create rule')),
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.deleteRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertKeys.rules() });
      toast.success('Alert rule deleted');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to delete rule')),
  });
}

export function useEvaluateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.evaluateRule(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: alertKeys.events() });
      qc.invalidateQueries({ queryKey: alertKeys.rules() });
      toast.success(
        `Evaluated ${result.evaluated_points} point(s): ${result.breaches} breach(es)`
      );
    },
    onError: (e: any) => toast.error(errMsg(e, 'Evaluation failed')),
  });
}

export function useAlertEvents(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: alertKeys.events(),
    queryFn: () => alertsApi.getEvents({ limit: 100 }),
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useAcknowledgeAlertEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.acknowledgeEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertKeys.events() });
      toast.success('Event acknowledged');
    },
    onError: (e: any) => toast.error(errMsg(e, 'Failed to acknowledge')),
  });
}
