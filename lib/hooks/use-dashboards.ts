import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardsApi } from '../api/services/dashboards';
import type { Dashboard, CreateDashboardDto, PaginationParams } from '../api/types';
import { toast } from 'sonner';

// Query keys for caching
export const dashboardKeys = {
  all: ['dashboards'] as const,
  lists: () => [...dashboardKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...dashboardKeys.lists(), params] as const,
  details: () => [...dashboardKeys.all, 'detail'] as const,
  detail: (id: string) => [...dashboardKeys.details(), id] as const,
};

/**
 * Hook to fetch all dashboards with pagination
 */
export function useDashboards(params?: PaginationParams) {
  return useQuery({
    queryKey: dashboardKeys.list(params),
    queryFn: () => dashboardsApi.getAll(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch a single dashboard by ID
 */
export function useDashboard(id: string | null) {
  return useQuery({
    queryKey: dashboardKeys.detail(id || ''),
    queryFn: () => dashboardsApi.getById(id!),
    enabled: !!id, // Only run query if id is provided
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to create a new dashboard
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDashboardDto) => dashboardsApi.create(data),
    onSuccess: (newDashboard) => {
      // Invalidate and refetch dashboards list
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      toast.success('Dashboard saved successfully');
      return newDashboard;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save dashboard');
    },
  });
}

/**
 * Hook to update an existing dashboard
 */
export function useUpdateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDashboardDto> }) =>
      dashboardsApi.update(id, data),
    onSuccess: (updatedDashboard) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(updatedDashboard.id) });
      toast.success('Dashboard updated successfully');
      return updatedDashboard;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update dashboard');
    },
  });
}

/**
 * Hook to delete a dashboard
 */
export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dashboardsApi.delete(id),
    onSuccess: () => {
      // Invalidate and refetch dashboards list
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      toast.success('Dashboard deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete dashboard');
    },
  });
}
