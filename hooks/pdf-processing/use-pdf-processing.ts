// Hook for PDF processing
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export interface PDFProcessingJob {
  id: string;
  attachmentId: number;
  status: 'pending' | 'extracting' | 'generating_embeddings' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface PDFProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  extractByPage?: boolean;
  batchSize?: number;
}

export interface AttachmentStatistics {
  isProcessed: boolean;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  status: string;
  progressPercentage: number;
}

/**
 * Hook to start PDF processing
 */
export function useStartPDFProcessing() {
  return useMutation({
    mutationFn: async ({
      attachmentId,
      options,
    }: {
      attachmentId: number;
      options?: PDFProcessingOptions;
    }) => {
      const response = await fetch('/api/pdf-processing/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attachmentId, options }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start PDF processing');
      }

      return response.json();
    },
  });
}

/**
 * Hook to check PDF processing job status
 */
export function usePDFProcessingStatus(jobId: string | null, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ['pdf-processing-status', jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const response = await fetch(`/api/pdf-processing/status/${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const data = await response.json();
      return data.job as PDFProcessingJob;
    },
    enabled: !!jobId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval || 2000, // Poll every 2 seconds
  });
}

/**
 * Hook to check attachment processing statistics
 */
export function useAttachmentStatistics(attachmentId: number | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['attachment-statistics', attachmentId],
    queryFn: async () => {
      if (!attachmentId) return null;

      const response = await fetch(`/api/pdf-processing/attachment/${attachmentId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch attachment statistics');
      }

      const data = await response.json();
      return data.statistics as AttachmentStatistics;
    },
    enabled: !!attachmentId && (options?.enabled !== false),
  });
}

/**
 * Hook to retry failed chunks
 */
export function useRetryFailedChunks() {
  return useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(`/api/pdf-processing/attachment/${attachmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to retry failed chunks');
      }

      return response.json();
    },
  });
}

/**
 * Combined hook for PDF processing with auto-polling
 */
export function usePDFProcessingWithPolling(attachmentId: number | null) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startMutation = useStartPDFProcessing();
  
  // Poll job status while processing
  const { data: job } = usePDFProcessingStatus(jobId, {
    enabled: isProcessing && !!jobId,
    refetchInterval: 2000,
  });

  // Get attachment statistics
  const { data: statistics, refetch: refetchStatistics } = useAttachmentStatistics(attachmentId, {
    enabled: !!attachmentId,
  });

  // Stop polling when job is completed or failed
  useEffect(() => {
    if (job && (job.status === 'completed' || job.status === 'failed')) {
      setIsProcessing(false);
      refetchStatistics(); // Refresh statistics
    }
  }, [job, refetchStatistics]);

  const startProcessing = async (options?: PDFProcessingOptions) => {
    if (!attachmentId) {
      throw new Error('Attachment ID is required');
    }

    try {
      const result = await startMutation.mutateAsync({ attachmentId, options });
      setJobId(result.jobId);
      setIsProcessing(true);
      return result;
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  };

  return {
    startProcessing,
    job,
    statistics,
    isProcessing,
    isStarting: startMutation.isPending,
    error: startMutation.error || (job?.error ? new Error(job.error) : null),
  };
}

/**
 * Hook to check if PDF processing is available
 */
export function usePDFProcessingAvailability() {
  return useQuery({
    queryKey: ['pdf-processing-availability'],
    queryFn: async () => {
      const response = await fetch('/api/pdf-processing/start');

      if (!response.ok) {
        throw new Error('Failed to check PDF processing availability');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
