import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataSourcesApi } from '../api/services/data-sources';
import type {
  DataSource,
  CreateDataSourceDto,
  UpdateDataSourceDto,
  PaginationParams,
} from '../api/types';
import { toast } from 'sonner';

// Query keys for caching
export const dataSourceKeys = {
  all: ['data-sources'] as const,
  lists: () => [...dataSourceKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...dataSourceKeys.lists(), params] as const,
  details: () => [...dataSourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...dataSourceKeys.details(), id] as const,
  stats: (id: string) => [...dataSourceKeys.detail(id), 'stats'] as const,
};

/**
 * Hook to fetch all data sources with pagination
 */
export function useDataSources(params?: PaginationParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dataSourceKeys.list(params),
    queryFn: () => dataSourcesApi.getAll(params),
    staleTime: 30 * 1000, // 30 seconds
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch a single data source by ID
 */
export function useDataSource(id: string) {
  return useQuery({
    queryKey: dataSourceKeys.detail(id),
    queryFn: () => dataSourcesApi.getById(id),
    enabled: !!id, // Only run query if id is provided
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch data source statistics
 */
export function useDataSourceStats(id: string) {
  return useQuery({
    queryKey: dataSourceKeys.stats(id),
    queryFn: () => dataSourcesApi.getStats(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create a new data source
 */
export function useCreateDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDataSourceDto) => dataSourcesApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch data sources list
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.lists() });
      toast.success('Data source created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create data source');
    },
  });
}

/**
 * Hook to update an existing data source
 */
export function useUpdateDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDataSourceDto }) =>
      dataSourcesApi.update(id, data),
    onSuccess: (updatedDataSource) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(updatedDataSource.id) });
      toast.success('Data source updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update data source');
    },
  });
}

/**
 * Hook to delete a data source
 */
export function useDeleteDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dataSourcesApi.delete(id),
    onSuccess: () => {
      // Invalidate and refetch data sources list
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.lists() });
      toast.success('Data source deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete data source');
    },
  });
}

/**
 * Hook to test data source connection
 */
export function useTestConnection() {
  return useMutation({
    mutationFn: (id: string) => dataSourcesApi.testConnection(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || 'Connection test successful');
      } else {
        toast.error(result.message || 'Connection test failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to test connection');
    },
  });
}

/**
 * Hook to sync data from a data source
 */
export function useSyncDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dataSourcesApi.syncData(id),
    onSuccess: (result, id) => {
      if (result.success) {
        // Invalidate related queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: dataSourceKeys.stats(id) });
        toast.success(result.message || 'Data sync started');
      } else {
        toast.error(result.message || 'Data sync failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync data');
    },
  });
}
