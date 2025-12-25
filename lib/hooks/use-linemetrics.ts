/**
 * React Hooks for LineMetrics Integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  LineMetricsClient,
  createLineMetricsClient,
  type LineMetricsConfig,
  type LineMetricsDevice,
  type LineMetricsStream,
  type LineMetricsQueryParams,
  type LineMetricsTimeSeriesData,
} from '../integrations/linemetrics-client';

// Query keys for caching
export const lineMetricsKeys = {
  all: ['linemetrics'] as const,
  devices: () => [...lineMetricsKeys.all, 'devices'] as const,
  device: (id: string) => [...lineMetricsKeys.devices(), id] as const,
  streams: () => [...lineMetricsKeys.all, 'streams'] as const,
  deviceStreams: (deviceId: string) => [...lineMetricsKeys.streams(), deviceId] as const,
  measurements: (params: LineMetricsQueryParams) =>
    [...lineMetricsKeys.all, 'measurements', params] as const,
  latest: (streamIds: string[]) =>
    [...lineMetricsKeys.all, 'latest', streamIds] as const,
  stats: (streamId: string, from: string, to: string) =>
    [...lineMetricsKeys.all, 'stats', streamId, from, to] as const,
};

/**
 * Create and cache a LineMetrics client instance
 */
let cachedClient: LineMetricsClient | null = null;

function getLineMetricsClient(config?: LineMetricsConfig): LineMetricsClient {
  if (!config && cachedClient) {
    return cachedClient;
  }

  const clientConfig: LineMetricsConfig = config || {
    apiUrl: process.env.NEXT_PUBLIC_LINEMETRICS_API_URL || 'https://api.linemetrics.com/v2',
    apiKey: process.env.NEXT_PUBLIC_LINEMETRICS_API_KEY,
  };

  cachedClient = createLineMetricsClient(clientConfig);
  return cachedClient;
}

/**
 * Hook to test LineMetrics connection
 */
export function useLineMetricsConnection(config?: LineMetricsConfig) {
  return useMutation({
    mutationFn: async () => {
      const client = getLineMetricsClient(config);
      await client.authenticate();
      return await client.testConnection();
    },
    onSuccess: (isConnected) => {
      if (isConnected) {
        toast.success('LineMetrics connection successful');
      } else {
        toast.error('LineMetrics connection failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to connect to LineMetrics');
    },
  });
}

/**
 * Hook to fetch LineMetrics devices
 */
export function useLineMetricsDevices(config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.devices(),
    queryFn: async () => {
      await client.authenticate();
      return await client.getDevices();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch a single LineMetrics device
 */
export function useLineMetricsDevice(deviceId: string, config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.device(deviceId),
    queryFn: async () => {
      await client.authenticate();
      return await client.getDevice(deviceId);
    },
    enabled: !!deviceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch streams for a device
 */
export function useLineMetricsDeviceStreams(deviceId: string, config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.deviceStreams(deviceId),
    queryFn: async () => {
      await client.authenticate();
      return await client.getDeviceStreams(deviceId);
    },
    enabled: !!deviceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch all streams
 */
export function useLineMetricsStreams(config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.streams(),
    queryFn: async () => {
      await client.authenticate();
      return await client.getStreams();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to query measurements
 */
export function useLineMetricsMeasurements(
  params: LineMetricsQueryParams,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.measurements(params),
    queryFn: async () => {
      await client.authenticate();
      return await client.queryMeasurements(params);
    },
    enabled: options?.enabled !== false && params.streamIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get latest measurements
 */
export function useLineMetricsLatest(streamIds: string[], config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.latest(streamIds),
    queryFn: async () => {
      await client.authenticate();
      return await client.getLatestMeasurements(streamIds);
    },
    enabled: streamIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Hook to get measurement statistics
 */
export function useLineMetricsStats(
  streamId: string,
  from: string,
  to: string,
  config?: LineMetricsConfig
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.stats(streamId, from, to),
    queryFn: async () => {
      await client.authenticate();
      return await client.getMeasurementStats(streamId, from, to);
    },
    enabled: !!streamId && !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to export data
 */
export function useLineMetricsExport(config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useMutation({
    mutationFn: async ({
      params,
      format,
    }: {
      params: LineMetricsQueryParams;
      format: 'csv' | 'json' | 'excel';
    }) => {
      await client.authenticate();
      return await client.exportData(params, format);
    },
    onSuccess: (blob, { format }) => {
      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linemetrics-export-${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Data exported successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to export data');
    },
  });
}

/**
 * Hook to sync LineMetrics devices to backend
 */
export function useLineMetricsSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: LineMetricsConfig) => {
      const client = getLineMetricsClient(config);
      await client.authenticate();

      // Fetch all devices and their streams
      const devices = await client.getDevices();

      // TODO: Send to backend API to create/update data sources and devices
      // This would integrate with your backend /api/v1/data-sources endpoint

      return devices;
    },
    onSuccess: (devices) => {
      queryClient.invalidateQueries({ queryKey: lineMetricsKeys.all });
      toast.success(`Synced ${devices.length} devices from LineMetrics`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync LineMetrics data');
    },
  });
}

/**
 * Hook to import measurements from LineMetrics to backend
 */
export function useLineMetricsImport() {
  return useMutation({
    mutationFn: async ({
      config,
      params,
    }: {
      config: LineMetricsConfig;
      params: LineMetricsQueryParams;
    }) => {
      const client = getLineMetricsClient(config);
      await client.authenticate();

      // Fetch measurements from LineMetrics
      const timeSeries = await client.queryMeasurements(params);

      // TODO: Send to backend API to store measurements
      // This would integrate with your backend /api/v1/measurements/batch endpoint

      return timeSeries;
    },
    onSuccess: (timeSeries) => {
      const totalPoints = timeSeries.reduce((sum, series) => sum + series.data.length, 0);
      toast.success(`Imported ${totalPoints} measurements from LineMetrics`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to import LineMetrics data');
    },
  });
}
