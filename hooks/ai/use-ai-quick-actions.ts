import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

// Helper function to save AI interaction to history
async function saveToHistory({
  featureType,
  inputData,
  result,
  executionTimeMs = 0,
  metadata = {}
}: {
  featureType: string;
  inputData: any;
  result: any;
  executionTimeMs?: number;
  metadata?: any;
}) {
  try {
    await fetch('/api/ai/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureType,
        inputData,
        result,
        executionTimeMs,
        metadata
      })
    });
  } catch (error) {
    console.warn('Failed to save AI interaction to history:', error);
    // Don't throw error here to avoid breaking the main flow
  }
}

// AI即问即答 Hook with streaming support
export function useAIQuickQAStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const streamQA = async (
    params: {
      question: string;
      context?: Array<{role: string; content: string; reasoning_details?: any}>;
      aiMode?: 'fast' | 'thinking';
    },
    callbacks: {
      onThinking?: (chunk: string) => void;
      onAnswer?: (chunk: string) => void;
      onReasoningDetails?: (details: any) => void;
      onComplete?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: params.question,
          context: params.context,
          aiMode: params.aiMode || 'fast',
          stream: true, // Enable streaming
        })
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          callbacks.onComplete?.();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            let data;
            try {
              data = JSON.parse(line.slice(6));
            } catch (parseError) {
              console.warn('Failed to parse SSE JSON:', line.substring(0, 100));
              continue;
            }
            
            switch (data.type) {
              case 'thinking':
              case 'thinking_start':
                callbacks.onThinking?.(data.content);
                break;
              case 'answer':
              case 'answer_start':
                callbacks.onAnswer?.(data.content);
                break;
              case 'reasoning_details':
                callbacks.onReasoningDetails?.(data.content);
                break;
              case 'error':
                throw new Error(data.content);
              case 'done':
                callbacks.onComplete?.();
                break;
            }
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      callbacks.onError?.(error);
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    streamQA,
    isStreaming,
    error,
  };
}

// AI即问即答 Hook
export function useAIQuickQA() {
  const { toast } = useToast();
  const t = useTranslations('AIAssistant.toast');

  return useMutation({
    mutationFn: async (params: string | {
      question: string;
      context?: Array<{role: string; content: string}>;
      conversationId?: string;
      aiMode?: 'fast' | 'thinking';
    }) => {
      const startTime = Date.now();
      
      // Support both string and object parameters for backward compatibility
      const requestData = typeof params === 'string' 
        ? {
            question: params,
            contentTypes: ['course', 'lesson', 'post', 'profile'],
            includeAnalysis: true
          }
        : {
            question: params.question,
            context: params.context,
            conversationId: params.conversationId,
            aiMode: params.aiMode || 'fast',
            contentTypes: ['course', 'lesson', 'post', 'profile'],
            includeAnalysis: true
          };
      
      const response = await fetch('/api/ai/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('AI问答请求失败');
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // Save to history
      await saveToHistory({
        featureType: 'quick_qa',
        inputData: typeof params === 'string' 
          ? { question: params, contentTypes: ['course', 'lesson', 'post', 'profile'] }
          : { question: params.question, hasContext: !!params.context, contextLength: params.context?.length || 0 },
        result,
        executionTimeMs: executionTime
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: `✅ ${t('qa_success_title')}`,
        description: t('qa_success_description', { count: data.sources?.length || 0 }),
      });
    },
    onError: (error) => {
      console.error('❌ Quick QA error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        error: error
      });
      
      toast({
        title: `❌ ${t('qa_error_title')}`,
        description: error instanceof Error ? error.message : t('error_try_again'),
        variant: "destructive"
      });
    }
  });
}

// 上传题目解题 Hook with streaming support
export function useAISolveProblemStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const streamSolveProblem = async (
    params: {
      file: File;
      aiMode?: 'fast' | 'thinking';
    },
    callbacks: {
      onThinking?: (chunk: string) => void;
      onAnswer?: (chunk: string) => void;
      onReasoningDetails?: (details: any) => void;
      onComplete?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setIsStreaming(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', params.file);
      formData.append('analysisType', 'problem_solving');
      formData.append('aiMode', params.aiMode || 'fast');
      formData.append('stream', 'true'); // Enable streaming

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          callbacks.onComplete?.();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            let data;
            try {
              data = JSON.parse(line.slice(6));
            } catch (parseError) {
              console.warn('Failed to parse SSE JSON:', line.substring(0, 100));
              continue;
            }
            
            switch (data.type) {
              case 'thinking':
              case 'thinking_start':
                callbacks.onThinking?.(data.content);
                break;
              case 'answer':
              case 'answer_start':
                callbacks.onAnswer?.(data.content);
                break;
              case 'reasoning_details':
                callbacks.onReasoningDetails?.(data.content);
                break;
              case 'error':
                throw new Error(data.content);
              case 'done':
                callbacks.onComplete?.();
                break;
            }
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      callbacks.onError?.(error);
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    streamSolveProblem,
    isStreaming,
    error,
  };
}

// 上传题目解题 Hook (non-streaming, for backward compatibility)
export function useAISolveProblem() {
  const { toast } = useToast();
  const t = useTranslations('AIAssistant.toast');

  return useMutation({
    mutationFn: async (params: File | { file: File; aiMode?: 'fast' | 'thinking' }) => {
      const startTime = Date.now();
      
      // Support both File and object parameters
      const file = params instanceof File ? params : params.file;
      const aiMode = params instanceof File ? 'fast' : (params.aiMode || 'fast');
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('analysisType', 'problem_solving');
      formData.append('aiMode', aiMode);

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('解题分析请求失败');
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // Save to history
      await saveToHistory({
        featureType: 'solve_problem',
        inputData: { fileName: file.name, fileSize: file.size, problemType: 'image_upload', aiMode },
        result,
        executionTimeMs: executionTime,
        metadata: { imageAnalysis: true, aiMode }
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: `✅ ${t('solve_success_title')}`,
        description: t('solve_success_description'),
      });
    },
    onError: (error) => {
      console.error('❌ Solve problem error in hook:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        error: error
      });
      
      toast({
        title: `❌ ${t('solve_error_title')}`,
        description: error instanceof Error ? error.message : t('error_check_format'),
        variant: "destructive"
      });
    }
  });
}

// 智能笔记总结 Hook
export function useAISmartNotes() {
  const { toast } = useToast();
  const t = useTranslations('AIAssistant.toast');

  return useMutation({
    mutationFn: async (params: string | { content: string; aiMode?: 'fast' | 'thinking' }) => {
      const startTime = Date.now();
      
      // Support both string and object parameters
      const content = typeof params === 'string' ? params : params.content;
      const aiMode = typeof params === 'string' ? 'fast' : (params.aiMode || 'fast');
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          analysisType: 'notes',
          includeRecommendations: true,
          aiMode
        })
      });

      if (!response.ok) {
        throw new Error('笔记生成请求失败');
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // Save to history
      await saveToHistory({
        featureType: 'smart_notes',
        inputData: { content: content.substring(0, 200) + '...', contentLength: content.length, aiMode },
        result,
        executionTimeMs: executionTime,
        metadata: { aiMode }
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: `✅ ${t('notes_success_title')}`,
        description: t('notes_success_description'),
      });
    },
    onError: (error) => {
      console.error('❌ Smart notes error in hook:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        error: error
      });
      
      toast({
        title: `❌ ${t('notes_error_title')}`,
        description: error instanceof Error ? error.message : t('error_try_again'),
        variant: "destructive"
      });
    }
  });
}

// 个性化学习路径 Hook
export function useAILearningPath() {
  const { toast } = useToast();
  const t = useTranslations('AIAssistant.toast');

  return useMutation({
    meta: {
      timeout: 300000, // 5 minutes timeout
    },
    mutationFn: async (params: {
      learning_goal: string;
      current_level?: string;
      time_constraint?: string;
      aiMode?: 'fast' | 'thinking';
    }) => {
      const startTime = Date.now();
      
      const aiMode = params.aiMode || 'fast';
      
      // 构建详细的学习路径生成内容
      const learningPathContent = `Learning Goal: ${params.learning_goal}
Current Level: ${params.current_level || 'Beginner'}
Time Constraint: ${params.time_constraint || 'Flexible'}

Please create a comprehensive personalized learning roadmap.`;

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: learningPathContent,
          analysisType: 'learning_path',
          includeRecommendations: true,
          learningGoal: params.learning_goal,
          currentLevel: params.current_level,
          timeConstraint: params.time_constraint,
          aiMode
        })
      });

      if (!response.ok) {
        throw new Error('学习路径生成请求失败');
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // Save to history
      await saveToHistory({
        featureType: 'learning_path',
        inputData: params,
        result,
        executionTimeMs: executionTime,
        metadata: { personalized: true, aiMode }
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: `✅ ${t('path_success_title')}`, 
        description: t('path_success_description'),
      });
    },
    onError: (error) => {
      console.error('❌ Learning path error in hook:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        error: error
      });
      
      toast({
        title: `❌ ${t('path_error_title')}`,
        description: error instanceof Error ? error.message : t('error_try_again'),
        variant: "destructive"
      });
    }
  });
}

// AI历史记录 Hook
export function useAIHistory(featureType?: string) {
  return useQuery({
    queryKey: ['ai-history', featureType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (featureType) params.set('feature_type', featureType);
      params.set('limit', '10');
      
      const response = await fetch(`/api/ai/history?${params}`);
      if (!response.ok) {
        throw new Error('获取AI历史失败');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  });
}

// AI历史详情 Hook
export function useAIHistoryDetail(id: string) {
  return useQuery({
    queryKey: ['ai-history-detail', id],
    queryFn: async () => {
      const response = await fetch(`/api/ai/history/${id}`);
      if (!response.ok) {
        throw new Error('获取AI历史详情失败');
      }
      
      return response.json();
    },
    enabled: !!id,
  });
}

// 通用AI状态管理 Hook
export function useAIState() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const saveResult = (feature: string, result: any) => {
    setResults(prev => ({
      ...prev,
      [feature]: result
    }));
  };

  const clearResult = (feature: string) => {
    setResults(prev => {
      const newResults = { ...prev };
      delete newResults[feature];
      return newResults;
    });
  };

  const clearAllResults = () => {
    setResults({});
  };

  return {
    activeFeature,
    setActiveFeature,
    results,
    saveResult,
    clearResult,
    clearAllResults,
    getResult: (feature: string) => results[feature]
  };
}



