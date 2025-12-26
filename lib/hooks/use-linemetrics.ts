/**
 * React Hooks for LineMetrics Integration
 *
 * Updated to work with LineMetrics REST API v2
 * Authentication: OAuth2 Client Credentials
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  LineMetricsClient,
  createLineMetricsClient,
  type LineMetricsConfig,
  type LMObject,
  type LMDevice,
  type LMDeviceDetail,
  type LMInput,
  type LMDataPoint,
  type LMDataQueryParams,
} from '../integrations/linemetrics-client';
import apiClient from '../api/client';

// ============================================================================
// Query Keys for Caching
// ============================================================================

export const lineMetricsKeys = {
  all: ['linemetrics'] as const,

  // Account
  account: () => [...lineMetricsKeys.all, 'account'] as const,

  // Object Model
  objects: () => [...lineMetricsKeys.all, 'objects'] as const,
  object: (uuid: string) => [...lineMetricsKeys.objects(), uuid] as const,
  children: (parentUuid: string) => [...lineMetricsKeys.all, 'children', parentUuid] as const,
  attributeData: (objectKey: string, alias: string, params?: LMDataQueryParams) =>
    [...lineMetricsKeys.all, 'attribute-data', objectKey, alias, params] as const,

  // Device Model
  devices: () => [...lineMetricsKeys.all, 'devices'] as const,
  device: (id: string) => [...lineMetricsKeys.devices(), id] as const,
  deviceInputs: (deviceId: string) => [...lineMetricsKeys.all, 'device-inputs', deviceId] as const,
  inputData: (inputId: string, params?: LMDataQueryParams) =>
    [...lineMetricsKeys.all, 'input-data', inputId, params] as const,
  inputLastValue: (inputId: string) =>
    [...lineMetricsKeys.all, 'input-last-value', inputId] as const,
};

// ============================================================================
// Client Management
// ============================================================================

/**
 * Create and cache a LineMetrics client instance
 */
let cachedClient: LineMetricsClient | null = null;

function getLineMetricsClient(config?: LineMetricsConfig): LineMetricsClient {
  if (!config && cachedClient) {
    return cachedClient;
  }

  const clientConfig: LineMetricsConfig = config || {
    apiUrl: process.env.NEXT_PUBLIC_LINEMETRICS_API_URL || 'https://rest-api.linemetrics.com',
    clientId: process.env.NEXT_PUBLIC_LINEMETRICS_CLIENT_ID || '',
    clientSecret: process.env.NEXT_PUBLIC_LINEMETRICS_CLIENT_SECRET || '',
  };

  cachedClient = createLineMetricsClient(clientConfig);
  return cachedClient;
}

// ============================================================================
// Connection & Authentication Hooks
// ============================================================================

/**
 * Hook to test LineMetrics connection
 */
export function useLineMetricsConnection(config?: LineMetricsConfig) {
  return useMutation({
    mutationFn: async () => {
      const client = getLineMetricsClient(config);
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

// ============================================================================
// Account Hooks
// ============================================================================

/**
 * Hook to fetch account information
 */
export function useLineMetricsAccount(config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.account(),
    queryFn: async () => {
      return await client.getAccount();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// ============================================================================
// Object Model Hooks
// ============================================================================

/**
 * Hook to fetch all objects (root level)
 */
export function useLineMetricsObjects(config?: LineMetricsConfig) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.objects(),
    queryFn: async () => {
      return await client.getAllObjects();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch objects of specific type
 */
export function useLineMetricsObjectsByType(
  objectType: string,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: [...lineMetricsKeys.objects(), 'type', objectType],
    queryFn: async () => {
      return await client.getObjectsByType(objectType);
    },
    enabled: options?.enabled !== false && !!objectType,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single object
 */
export function useLineMetricsObject(
  uuid: string,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.object(uuid),
    queryFn: async () => {
      return await client.getObject(uuid);
    },
    enabled: options?.enabled !== false && !!uuid,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch children of an object
 */
export function useLineMetricsChildren(
  parentUuidOrKey: string,
  objectType?: string,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.children(parentUuidOrKey),
    queryFn: async () => {
      return await client.getChildren(parentUuidOrKey, objectType);
    },
    enabled: options?.enabled !== false && !!parentUuidOrKey,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch attribute data
 */
export function useLineMetricsAttributeData(
  objectKeyOrUuid: string,
  alias: string,
  params?: LMDataQueryParams,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.attributeData(objectKeyOrUuid, alias, params),
    queryFn: async () => {
      return await client.getAttributeData(objectKeyOrUuid, alias, params);
    },
    enabled: options?.enabled !== false && !!objectKeyOrUuid && !!alias,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get last value for an attribute
 */
export function useLineMetricsAttributeLastValue(
  objectKeyOrUuid: string,
  alias: string,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: [...lineMetricsKeys.attributeData(objectKeyOrUuid, alias), 'last'],
    queryFn: async () => {
      return await client.getAttributeLastValue(objectKeyOrUuid, alias);
    },
    enabled: options?.enabled !== false && !!objectKeyOrUuid && !!alias,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// ============================================================================
// Device Model Hooks
// ============================================================================

/**
 * Hook to fetch all devices
 */
export function useLineMetricsDevices(
  limit?: number,
  offset?: number,
  config?: LineMetricsConfig
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: [...lineMetricsKeys.devices(), { limit, offset }],
    queryFn: async () => {
      return await client.getAllDevices(limit, offset);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to fetch a single device by ID
 */
export function useLineMetricsDevice(
  deviceId: string,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.device(deviceId),
    queryFn: async () => {
      return await client.getDeviceById(deviceId);
    },
    enabled: options?.enabled !== false && !!deviceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch device by LineMetrics ID
 */
export function useLineMetricsDeviceByLmId(
  lmId: string,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: [...lineMetricsKeys.device(lmId), 'lmId'],
    queryFn: async () => {
      return await client.getDeviceByLmId(lmId);
    },
    enabled: options?.enabled !== false && !!lmId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to extract inputs from device detail
 */
export function useLineMetricsDeviceInputs(
  deviceDetail?: LMDeviceDetail,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...lineMetricsKeys.deviceInputs(deviceDetail?.data[0]?.id || 'none')],
    queryFn: async () => {
      if (!deviceDetail) return [];
      return LineMetricsClient.extractInputs(deviceDetail);
    },
    enabled: options?.enabled !== false && !!deviceDetail,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch input data
 */
export function useLineMetricsInputData(
  inputId: string,
  params?: LMDataQueryParams,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.inputData(inputId, params),
    queryFn: async () => {
      return await client.getInputData(inputId, params);
    },
    enabled: options?.enabled !== false && !!inputId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get last value for a device input
 */
export function useLineMetricsInputLastValue(
  inputId: string,
  config?: LineMetricsConfig,
  options?: { enabled?: boolean }
) {
  const client = getLineMetricsClient(config);

  return useQuery({
    queryKey: lineMetricsKeys.inputLastValue(inputId),
    queryFn: async () => {
      return await client.getInputLastValue(inputId);
    },
    enabled: options?.enabled !== false && !!inputId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// ============================================================================
// Backend Integration Hooks
// ============================================================================

/**
 * Hook to sync LineMetrics devices to backend
 * Calls the backend API endpoint /api/v1/linemetrics/sync
 */
export function useLineMetricsSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: LineMetricsConfig) => {
      const response = await apiClient.post('/api/v1/linemetrics/sync', { config });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lineMetricsKeys.all });
      toast.success(
        `Synced ${data.devices_created} devices and ${data.metrics_created} metrics from LineMetrics`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to sync LineMetrics data');
    },
  });
}

/**
 * Hook to import measurements from LineMetrics to backend
 * Calls the backend API endpoint /api/v1/linemetrics/import
 */
export function useLineMetricsImport() {
  return useMutation({
    mutationFn: async ({
      config,
      streamIds,
      fromTime,
      toTime,
      aggregation = 'none',
      interval,
    }: {
      config: LineMetricsConfig;
      streamIds: string[];
      fromTime: Date;
      toTime: Date;
      aggregation?: string;
      interval?: string;
    }) => {
      const response = await apiClient.post('/api/v1/linemetrics/import', {
        config,
        stream_ids: streamIds,
        from_time: fromTime.toISOString(),
        to_time: toTime.toISOString(),
        aggregation,
        interval,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Imported ${data.measurements_imported} measurements from LineMetrics`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to import LineMetrics data');
    },
  });
}

/**
 * Hook to test LineMetrics connection via backend
 * Calls the backend API endpoint /api/v1/linemetrics/test
 */
export function useLineMetricsBackendTest() {
  return useMutation({
    mutationFn: async (config: LineMetricsConfig) => {
      const response = await apiClient.post('/api/v1/linemetrics/test', config);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.message} (${data.device_count} devices found)`);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to test LineMetrics connection');
    },
  });
}

/**
 * Hook to fetch devices from backend endpoint
 * Calls the backend API endpoint /api/v1/linemetrics/devices
 */
export function useLineMetricsBackendDevices(config?: LineMetricsConfig) {
  return useMutation({
    mutationFn: async (cfg: LineMetricsConfig = config!) => {
      const response = await apiClient.post('/api/v1/linemetrics/devices', cfg);
      return response.data;
    },
  });
}

/**
 * Hook to fetch device streams from backend endpoint
 * Calls the backend API endpoint /api/v1/linemetrics/devices/{device_id}/streams
 */
export function useLineMetricsBackendDeviceStreams(deviceId: string) {
  return useMutation({
    mutationFn: async (config: LineMetricsConfig) => {
      const response = await apiClient.post(`/api/v1/linemetrics/devices/${deviceId}/streams`, config);
      return response.data;
    },
  });
}
