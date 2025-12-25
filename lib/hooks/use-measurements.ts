import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { measurementsApi } from '../api/services/measurements';
import type { Measurement, MeasurementQueryParams } from '../api/types';
import { toast } from 'sonner';

// Query keys for caching
export const measurementKeys = {
  all: ['measurements'] as const,
  timeSeries: (params: MeasurementQueryParams) => [...measurementKeys.all, 'time-series', params] as const,
  latest: (metricIds: string[]) => [...measurementKeys.all, 'latest', metricIds] as const,
  statistics: (metricId: string, startTime?: string, endTime?: string) =>
    [...measurementKeys.all, 'statistics', metricId, startTime, endTime] as const,
  downsampled: (params: any) => [...measurementKeys.all, 'downsampled', params] as const,
};

/**
 * Hook to fetch time-series measurements
 */
export function useTimeSeriesMeasurements(params: MeasurementQueryParams) {
  return useQuery({
    queryKey: measurementKeys.timeSeries(params),
    queryFn: () => measurementsApi.getTimeSeries(params),
    enabled: !!params.metric_ids && params.metric_ids.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds for real-time updates
  });
}

/**
 * Hook to fetch latest measurements for given metrics
 */
export function useLatestMeasurements(metricIds: string[]) {
  return useQuery({
    queryKey: measurementKeys.latest(metricIds),
    queryFn: () => measurementsApi.getLatest(metricIds),
    enabled: metricIds.length > 0,
    staleTime: 10 * 1000, // 10 seconds - fresher for real-time monitoring
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });
}

/**
 * Hook to fetch statistics for a metric
 */
export function useMeasurementStatistics(
  metricId: string,
  startTime?: string,
  endTime?: string
) {
  return useQuery({
    queryKey: measurementKeys.statistics(metricId, startTime, endTime),
    queryFn: () =>
      measurementsApi.getStatistics({
        metric_id: metricId,
        start_time: startTime,
        end_time: endTime,
      }),
    enabled: !!metricId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch downsampled data for visualization
 */
export function useDownsampledMeasurements(params: {
  metric_ids: string[];
  start_time?: string;
  end_time?: string;
  bucket_size: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max';
}) {
  return useQuery({
    queryKey: measurementKeys.downsampled(params),
    queryFn: () => measurementsApi.getDownsampled(params),
    enabled: params.metric_ids.length > 0 && !!params.bucket_size,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to insert measurements in batch
 */
export function useInsertMeasurements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (measurements: Omit<Measurement, 'time'>[]) =>
      measurementsApi.insertBatch(measurements),
    onSuccess: (result) => {
      // Invalidate all measurement queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: measurementKeys.all });
      toast.success(`${result.count} measurements inserted successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to insert measurements');
    },
  });
}

/**
 * Hook to delete measurements within a time range
 */
export function useDeleteMeasurementRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { metric_id: string; start_time: string; end_time: string }) =>
      measurementsApi.deleteRange(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: measurementKeys.all });
      toast.success(`${result.count} measurements deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete measurements');
    },
  });
}
