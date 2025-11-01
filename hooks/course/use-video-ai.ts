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

// Streaming hook for real-time AI responses
export function useStreamingVideoAI(videoContext: VideoContext) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const askStreaming = async (
    question: string,
    conversationHistory?: Array<{role: 'user' | 'assistant'; content: string}>,
    onToken?: (token: string) => void,
    onComplete?: (data: { sources: any[]; confidence: number; toolsUsed: string[] }) => void
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/video-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          question,
          videoContext,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'token' && onToken) {
              onToken(data.content);
            } else if (data.type === 'final') {
              finalData = data;
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          }
        }
      }

      if (finalData && onComplete) {
        onComplete({
          sources: finalData.sources || [],
          confidence: finalData.confidence || 0.85,
          toolsUsed: finalData.toolsUsed || [],
        });
      }

      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setIsLoading(false);
      throw error;
    }
  };

  return {
    askStreaming,
    isLoading,
    error,
  };
}
