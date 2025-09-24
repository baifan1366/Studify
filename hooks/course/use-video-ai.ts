// Hook for Video AI Assistant integration
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface VideoContext {
  courseSlug: string;
  currentLessonId?: string;
  currentTimestamp?: number;
  selectedText?: string;
}

interface AIAssistantRequest {
  question: string;
  videoContext: VideoContext;
  conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>;
}

interface AIAssistantResponse {
  success: boolean;
  question: string;
  answer: string;
  sources: any[];
  confidence: number;
  webSearchUsed: boolean;
  suggestedActions: string[];
  relatedConcepts: string[];
  metadata: any;
}

// Main hook for video AI assistant
export function useVideoAI() {
  const [isLoading, setIsLoading] = useState(false);

  const askQuestion = useMutation({
    mutationFn: async (request: AIAssistantRequest): Promise<AIAssistantResponse> => {
      const response = await fetch('/api/ai/video-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      return response.json();
    },
    onMutate: () => {
      setIsLoading(true);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return {
    askQuestion: askQuestion.mutate,
    askQuestionAsync: askQuestion.mutateAsync,
    isLoading: askQuestion.isPending || isLoading,
    error: askQuestion.error,
    data: askQuestion.data,
    reset: askQuestion.reset,
  };
}

// Hook to check AI assistant status
export function useVideoAIStatus() {
  return useQuery({
    queryKey: ['video-ai-status'],
    queryFn: async () => {
      const response = await fetch('/api/ai/video-assistant');
      if (!response.ok) {
        throw new Error('Failed to check AI status');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Simplified hook for quick AI questions (used internally by VideoAIAssistant component)
export function useSimpleVideoAI(videoContext: VideoContext) {
  const { askQuestionAsync, isLoading, error } = useVideoAI();

  const ask = async (
    question: string, 
    conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>
  ) => {
    try {
      const result = await askQuestionAsync({
        question,
        videoContext,
        conversationHistory
      });
      return result;
    } catch (error) {
      console.error('AI question failed:', error);
      throw error;
    }
  };

  return {
    ask,
    isLoading,
    error,
  };
}
