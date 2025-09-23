import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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

// AI即问即答 Hook
export function useAIQuickQA() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: string | {
      question: string;
      context?: Array<{role: string; content: string}>;
      conversationId?: string;
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
        title: "✅ AI回答完成",
        description: `找到 ${data.sources?.length || 0} 个相关资源`,
      });
    },
    onError: (error) => {
      console.error('Quick QA error:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: "destructive"
      });
    }
  });
}

// 上传题目解题 Hook
export function useAISolveProblem() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const startTime = Date.now();
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('analysisType', 'problem_solving');

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
        inputData: { fileName: file.name, fileSize: file.size, problemType: 'image_upload' },
        result,
        executionTimeMs: executionTime,
        metadata: { imageAnalysis: true }
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ 题目分析完成",
        description: "AI已生成详细解答步骤",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Failed",
        description: error instanceof Error ? error.message : 'Please check file format and try again',
        variant: "destructive"
      });
    }
  });
}

// 智能笔记总结 Hook
export function useAISmartNotes() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (content: string) => {
      const startTime = Date.now();
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          analysisType: 'notes',
          includeRecommendations: true
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
        inputData: { content: content.substring(0, 200) + '...', contentLength: content.length },
        result,
        executionTimeMs: executionTime
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ 笔记生成完成",
        description: "AI已提炼重点并生成学习笔记",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Failed",
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: "destructive"
      });
    }
  });
}

// 个性化学习路径 Hook
export function useAILearningPath() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      learning_goal: string;
      current_level?: string;
      time_constraint?: string;
    }) => {
      const startTime = Date.now();
      
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
          timeConstraint: params.time_constraint
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
        metadata: { personalized: true }
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ 学习路径生成完成", 
        description: `AI已为你定制专属学习计划`,
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Failed",
        description: error instanceof Error ? error.message : 'Please try again later',
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
