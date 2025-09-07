import { useMutation, useQuery } from '@tanstack/react-query';
import { embeddingApi } from '@/lib/api';

// Types for embedding search
export interface EmbeddingSearchParams {
  query: string;
  contentTypes?: string[];
  maxResults?: number;
  similarityThreshold?: number;
}

export interface EmbeddingSearchResult {
  id: string;
  content_type: string;
  content_id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  similarity_score: number;
  created_at: string;
}

export interface EmbeddingSearchResponse {
  query: string;
  results: EmbeddingSearchResult[];
  count: number;
  contentTypes: string[] | 'all';
  maxResults: number;
  similarityThreshold: number;
}

// Hook for performing embedding search
export function useEmbeddingSearch() {
  return useMutation<EmbeddingSearchResponse, Error, EmbeddingSearchParams>({
    mutationFn: async (params: EmbeddingSearchParams) => {
      const response = await fetch(embeddingApi.search, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform embedding search');
      }

      return response.json();
    },
  });
}

// Hook for getting embedding queue status
export function useEmbeddingQueueStatus() {
  return useQuery({
    queryKey: ['embedding-queue-status'],
    queryFn: async () => {
      const response = await fetch(embeddingApi.queue);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get queue status');
      }

      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook for managing embedding queue
export function useEmbeddingQueue() {
  return useMutation({
    mutationFn: async (action: { action: string; options?: any }) => {
      const response = await fetch(embeddingApi.queue, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to manage embedding queue');
      }

      return response.json();
    },
  });
}
