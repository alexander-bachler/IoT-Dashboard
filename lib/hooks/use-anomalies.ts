import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { anomaliesApi } from '../api/services/anomalies';
import type { Anomaly, AnomalyQueryParams, UpdateAnomalyDto } from '../api/types';
import { toast } from 'sonner';

// Query keys for caching
export const anomalyKeys = {
  all: ['anomalies'] as const,
  lists: () => [...anomalyKeys.all, 'list'] as const,
  list: (params?: AnomalyQueryParams) => [...anomalyKeys.lists(), params] as const,
  details: () => [...anomalyKeys.all, 'detail'] as const,
  detail: (id: string) => [...anomalyKeys.details(), id] as const,
  statistics: (params?: { start_time?: string; end_time?: string }) =>
    [...anomalyKeys.all, 'statistics', params] as const,
  recent: (limit: number) => [...anomalyKeys.all, 'recent', limit] as const,
};

/**
 * Hook to fetch all anomalies with filtering and pagination
 */
export function useAnomalies(params?: AnomalyQueryParams) {
  return useQuery({
    queryKey: anomalyKeys.list(params),
    queryFn: () => anomaliesApi.getAll(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every minute for real-time monitoring
  });
}

/**
 * Hook to fetch a single anomaly by ID
 */
export function useAnomaly(id: string) {
  return useQuery({
    queryKey: anomalyKeys.detail(id),
    queryFn: () => anomaliesApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch anomaly statistics
 */
export function useAnomalyStatistics(params?: { start_time?: string; end_time?: string }) {
  return useQuery({
    queryKey: anomalyKeys.statistics(params),
    queryFn: () => anomaliesApi.getStatistics(params),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
}

/**
 * Hook to fetch recent anomalies
 */
export function useRecentAnomalies(limit: number = 10, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: anomalyKeys.recent(limit),
    queryFn: () => anomaliesApi.getRecent(limit),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to update an anomaly
 */
export function useUpdateAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnomalyDto }) =>
      anomaliesApi.update(id, data),
    onSuccess: (updatedAnomaly) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: anomalyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: anomalyKeys.detail(updatedAnomaly.id) });
      queryClient.invalidateQueries({ queryKey: anomalyKeys.statistics() });
      toast.success('Anomaly updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update anomaly');
    },
  });
}

/**
 * Hook to bulk update anomalies
 */
export function useBulkUpdateAnomalies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: { ids: string[]; data: UpdateAnomalyDto }) =>
      anomaliesApi.bulkUpdate(ids, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: anomalyKeys.all });
      toast.success(`${result.count} anomalies updated successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to bulk update anomalies');
    },
  });
}

/**
 * Hook to delete an anomaly (mark as false positive)
 */
export function useDeleteAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => anomaliesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anomalyKeys.all });
      toast.success('Anomaly deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete anomaly');
    },
  });
}

/**
 * Hook to trigger anomaly detection
 */
export function useTriggerAnomalyDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metricIds: string[]) => anomaliesApi.triggerDetection(metricIds),
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate anomaly queries to refetch new detections
        queryClient.invalidateQueries({ queryKey: anomalyKeys.all });
        toast.success(result.message || 'Anomaly detection triggered successfully');
      } else {
        toast.error(result.message || 'Anomaly detection failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to trigger anomaly detection');
    },
  });
}
