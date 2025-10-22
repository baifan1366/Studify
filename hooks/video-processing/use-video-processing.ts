import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
export interface VideoProcessingStep {
  step_name: string;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  retry_count: number;
  error_message?: string;
}

export interface VideoProcessingQueue {
  queue_id: string;
  attachment_id: number;
  attachment_title: string;
  attachment_type: string;
  attachment_size: number;
  current_step: string;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "retrying";
  progress_percentage: number;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  steps: VideoProcessingStep[];
  estimated_completion_time?: string;
}

// API functions
const videoProcessingApi = {
  // Start video processing
  startProcessing: async (
    attachmentId: number
  ): Promise<VideoProcessingQueue> => {
    const response = await fetch("/api/video-processing/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ attachment_id: attachmentId }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.details
        ? `${error.error}: ${error.details}`
        : error.error || "Failed to start video processing";

      // Log debug info if available
      if (error.debug) {
        console.error("Video processing error debug:", error.debug);
      }

      throw new Error(errorMessage);
    }

    return response.json();
  },

  // Get queue status
  getQueueStatus: async (queueId: string): Promise<VideoProcessingQueue> => {
    const response = await fetch(`/api/video-processing/status/${queueId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch queue status");
    }

    return response.json();
  },

  // Cancel processing
  cancelProcessing: async (queueId: string): Promise<void> => {
    const response = await fetch(`/api/video-processing/status/${queueId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to cancel processing");
    }
  },

  // Get user's processing queues
  getUserQueues: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    queues: VideoProcessingQueue[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const response = await fetch(`/api/video-processing/queue?${searchParams}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch processing queues");
    }

    return response.json();
  },
};

// Hooks
export function useStartVideoProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: videoProcessingApi.startProcessing,
    onSuccess: (data) => {
      toast.success("Video processing started successfully!");
      // Invalidate and refetch queues
      queryClient.invalidateQueries({ queryKey: ["video-processing-queues"] });
      // Start polling for this specific queue
      queryClient.invalidateQueries({
        queryKey: ["video-processing-status", data.queue_id],
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start video processing: ${error.message}`);
    },
  });
}

export function useVideoProcessingStatus(
  queueId: string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ["video-processing-status", queueId],
    queryFn: () => videoProcessingApi.getQueueStatus(queueId!),
    enabled: !!queueId && options?.enabled !== false,
    refetchInterval: (data) => {
      // Stop polling if completed, failed, or cancelled
      if (
        !data ||
        ["completed", "failed", "cancelled"].includes((data as any)?.status)
      ) {
        return false;
      }
      // Poll every 5 seconds for active processing
      return options?.refetchInterval || 5000;
    },
    staleTime: 0, // Always consider data stale for real-time updates
  });
}

export function useCancelVideoProcessing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: videoProcessingApi.cancelProcessing,
    onSuccess: (_, queueId) => {
      toast.success("Video processing cancelled successfully");
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["video-processing-queues"] });
      queryClient.invalidateQueries({
        queryKey: ["video-processing-status", queueId],
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel processing: ${error.message}`);
    },
  });
}

export function useVideoProcessingQueues(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["video-processing-queues", params],
    queryFn: () => videoProcessingApi.getUserQueues(params),
    staleTime: 30000, // 30 seconds
  });
}

// Utility functions
export function getStepDisplayName(stepName: string): string {
  const stepNames: Record<string, string> = {
    transcribe: "Generating Transcript",
    embed: "Creating AI Embeddings",
  };
  return stepNames[stepName] || stepName;
}

export function getStepDescription(stepName: string): string {
  const descriptions: Record<string, string> = {
    transcribe:
      "Converting speech to text using AI transcription directly from video",
    embed: "Generating semantic embeddings for AI-powered search",
  };
  return descriptions[stepName] || "";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "text-yellow-600",
    processing: "text-blue-600",
    completed: "text-green-600",
    failed: "text-red-600",
    cancelled: "text-gray-600",
    retrying: "text-orange-600",
    skipped: "text-gray-400",
  };
  return colors[status] || "text-gray-600";
}

export function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: "⏳",
    processing: "🔄",
    completed: "✅",
    failed: "❌",
    cancelled: "⏹️",
    retrying: "🔁",
    skipped: "⏭️",
  };
  return icons[status] || "❓";
}
