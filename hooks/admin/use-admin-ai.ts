// hooks/admin/use-admin-ai.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

// AI Content Generation Hooks
export function useAIContentGeneration(days = 30) {
  return useQuery({
    queryKey: ['admin', 'ai', 'content-generation', days],
    queryFn: () => adminApi.ai.getContentGeneration(days),
  });
}

export function useAIGenerationAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.ai.performGenerationAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'content-generation'] });
    },
  });
}

// Embedding Queue Hooks
export function useEmbeddingQueue(params: { status?: string; limit?: number; offset?: number } = {}) {
  const { status = 'all', limit = 50, offset = 0 } = params;
  
  return useQuery({
    queryKey: ['admin', 'ai', 'embedding-queue', { status, limit, offset }],
    queryFn: () => adminApi.ai.getEmbeddingQueue({ status, limit, offset }),
  });
}

export function useEmbeddingQueueAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.ai.performEmbeddingAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'embedding-queue'] });
    },
  });
}

export function useDeleteEmbeddingQueue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.ai.deleteEmbeddingQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'embedding-queue'] });
    },
  });
}

// AI Recommendations Hooks
export function useAIRecommendations(days = 30) {
  return useQuery({
    queryKey: ['admin', 'ai', 'recommendations', days],
    queryFn: () => adminApi.ai.getRecommendations(days),
  });
}

export function useRecommendationAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.ai.performRecommendationAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'recommendations'] });
    },
  });
}

// AI Moderation Hooks
export function useAIModeration(params: { days?: number; status?: string; limit?: number } = {}) {
  const { days = 7, status = 'all', limit = 50 } = params;
  
  return useQuery({
    queryKey: ['admin', 'ai', 'moderation', { days, status, limit }],
    queryFn: () => adminApi.ai.getModeration({ days, status, limit }),
  });
}

export function useModerationAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adminApi.ai.performModerationAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'moderation'] });
    },
  });
}
