// hooks/admin/use-admin-maintenance.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

// System Health Hooks
export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'maintenance', 'system-health'],
    queryFn: () => adminApi.maintenance.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useSystemHealthAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.maintenance.performHealthAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance', 'system-health'] });
    },
  });
}

// Queue Monitor Hooks
export function useQueueMonitor(type = 'all') {
  return useQuery({
    queryKey: ['admin', 'maintenance', 'queue-monitor', type],
    queryFn: () => adminApi.maintenance.getQueueMonitor(type),
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

export function useQueueAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.maintenance.performQueueAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance', 'queue-monitor'] });
    },
  });
}

// Cache Management Hooks
export function useCacheManagement(params: { pattern?: string; limit?: number } = {}) {
  const { pattern = '*', limit = 100 } = params;
  
  return useQuery({
    queryKey: ['admin', 'maintenance', 'cache', { pattern, limit }],
    queryFn: () => adminApi.maintenance.getCache({ pattern, limit }),
  });
}

export function useCacheAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.maintenance.performCacheAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance', 'cache'] });
    },
  });
}

export function useDeleteCache() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.maintenance.deleteCache,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance', 'cache'] });
    },
  });
}

// Feature Flags Hooks
export function useFeatureFlags(params: { category?: string; environment?: string } = {}) {
  const { category, environment } = params;
  
  return useQuery({
    queryKey: ['admin', 'maintenance', 'feature-flags', { category, environment }],
    queryFn: () => adminApi.maintenance.getFeatureFlags({ category, environment }),
  });
}

export function useFeatureFlagAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.maintenance.performFeatureFlagAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance', 'feature-flags'] });
    },
  });
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.maintenance.deleteFeatureFlag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance', 'feature-flags'] });
    },
  });
}
