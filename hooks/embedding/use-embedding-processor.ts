import { useMutation, useQuery } from '@tanstack/react-query';
import { embeddingApi } from '@/lib/api';

// Types for embedding processor
export interface ProcessorStatus {
  isRunning: boolean;
  queueSize: number;
  processedCount: number;
  errorCount: number;
  lastProcessedAt?: string;
  processingRate?: number;
}

export interface ProcessorResponse {
  status: ProcessorStatus;
  timestamp: string;
}

export interface ProcessorAction {
  action: 'start' | 'stop' | 'queue_existing' | 'process_immediate';
  options?: {
    contentType?: string;
    contentId?: string;
  };
}

// Hook for getting processor status (admin only)
export function useEmbeddingProcessorStatus() {
  return useQuery<ProcessorResponse>({
    queryKey: ['embedding-processor-status'],
    queryFn: async () => {
      const response = await fetch(embeddingApi.processor);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get processor status');
      }

      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// Hook for controlling embedding processor (admin only)
export function useEmbeddingProcessor() {
  return useMutation({
    mutationFn: async (action: ProcessorAction) => {
      const response = await fetch(embeddingApi.processor, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to control processor');
      }

      return response.json();
    },
  });
}

// Convenience hooks for specific processor actions
export function useStartProcessor() {
  const processor = useEmbeddingProcessor();
  
  return {
    ...processor,
    startProcessor: () => processor.mutate({ action: 'start' }),
  };
}

export function useStopProcessor() {
  const processor = useEmbeddingProcessor();
  
  return {
    ...processor,
    stopProcessor: () => processor.mutate({ action: 'stop' }),
  };
}

export function useQueueExistingContent() {
  const processor = useEmbeddingProcessor();
  
  return {
    ...processor,
    queueExisting: () => processor.mutate({ action: 'queue_existing' }),
  };
}

export function useProcessImmediate() {
  const processor = useEmbeddingProcessor();
  
  return {
    ...processor,
    processImmediate: (contentType: string, contentId: string) => 
      processor.mutate({ 
        action: 'process_immediate', 
        options: { contentType, contentId } 
      }),
  };
}
