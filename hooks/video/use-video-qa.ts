import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export interface VideoQAResponse {
  success: boolean;
  answer: string;
  segments: Array<{
    startTime: number;
    endTime: number;
    text: string;
    relevantText: string;
  }>;
  timeContext: {
    currentTime: number;
    startTime: number;
    endTime: number;
    windowSize: number;
  };
  courseInfo?: {
    courseName?: string;
    moduleName?: string;
    lessonName?: string;
  };
}

export interface VideoTerm {
  term: string;
  definition: string;
  timestamp: number;
  segment: number;
}

export interface VideoTermsResponse {
  success: boolean;
  terms: VideoTerm[];
  suggestions: Array<{
    type: string;
    title: string;
    content: string;
  }>;
  timeContext: {
    currentTime: number;
    startTime: number;
    endTime: number;
  };
}

export interface VideoQARequest {
  lessonId: string;
  question: string;
  currentTime: number;
  timeWindow?: number;
}

// Hook for asking questions about video content
export function useVideoQA() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: VideoQARequest): Promise<VideoQAResponse> => {
      const response = await api.post('/api/video/qa', request);
      return response.data;
    },
    onError: (error: any) => {
      console.error('Video QA error:', error);
      toast({
        title: 'Question Failed',
        description: error.response?.data?.error || 'Unable to get AI answer, please try again later',
        variant: 'destructive',
      });
    },
  });
}

// Hook for getting video terms at current time
export function useVideoTerms(lessonId: string, currentTime: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['video-terms', lessonId, Math.floor(currentTime / 15) * 15], // Cache every 15 seconds
    queryFn: async (): Promise<VideoTermsResponse> => {
      const url = `/api/video/qa?lessonId=${lessonId}&currentTime=${currentTime}&timeWindow=15`;
      const response = await api.get(url);
      return response.data;
    },
    enabled: enabled && !!lessonId && currentTime > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

// Hook for managing QA panel state
export function useVideoQAPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<VideoQAResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openPanel = (initialQuestion: string = '') => {
    setQuestion(initialQuestion);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setQuestion('');
    setCurrentAnswer(null);
  };

  const clearAnswer = () => {
    setCurrentAnswer(null);
  };

  return {
    isOpen,
    question,
    currentAnswer,
    isLoading,
    setQuestion,
    setCurrentAnswer,
    setIsLoading,
    openPanel,
    closePanel,
    clearAnswer,
  };
}

// Hook for managing terms tooltip state  
export function useVideoTermsTooltip() {
  const [activeTerms, setActiveTerms] = useState<VideoTerm[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [autoShowEnabled, setAutoShowEnabled] = useState(true);

  const showTerms = (terms: VideoTerm[]) => {
    setActiveTerms(terms);
    setIsVisible(terms.length > 0 && autoShowEnabled);
  };

  const hideTerms = () => {
    setIsVisible(false);
  };

  const toggleAutoShow = () => {
    setAutoShowEnabled(!autoShowEnabled);
  };

  return {
    activeTerms,
    isVisible,
    autoShowEnabled,
    showTerms,
    hideTerms,
    toggleAutoShow,
  };
}
