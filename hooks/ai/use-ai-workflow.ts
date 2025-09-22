import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiClient, WORKFLOWS, WorkflowResult, WorkflowStatus } from '@/lib/langChain/ai-client';
import { toast } from 'sonner';

// 执行工作流Hook
export function useExecuteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      workflowId,
      query,
      options
    }: {
      workflowId: string;
      query: string;
      options?: any;
    }) => {
      return await aiClient.executeWorkflow(workflowId, query, options);
    },
    onSuccess: (data: WorkflowResult) => {
      if (data.success) {
        toast.success(`工作流 ${data.sessionId} 执行成功`);
        // 更新工作流状态缓存
        queryClient.setQueryData(['workflow-status', data.sessionId], {
          status: 'completed',
          results: data.results,
          isActive: false
        });
      } else {
        toast.error(`工作流执行失败: ${data.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`工作流执行出错: ${error.message}`);
    }
  });
}

// 获取工作流状态Hook
export function useWorkflowStatus(sessionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['workflow-status', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      return await aiClient.getWorkflowStatus(sessionId);
    },
    enabled: enabled && !!sessionId,
    refetchInterval: (data) => {
      // 如果工作流还在运行，每5秒刷新一次
      return (data as any)?.status === 'running' ? 5000 : false;
    },
    staleTime: 30000 // 30秒内数据保持新鲜
  });
}

// 简单AI调用Hook
export function useSimpleAI() {
  return useMutation({
    mutationFn: async ({
      prompt,
      options
    }: {
      prompt: string;
      options?: any;
    }) => {
      return await aiClient.simpleCall(prompt, options);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('AI调用成功');
      } else {
        toast.error('AI调用失败');
      }
    },
    onError: (error: Error) => {
      toast.error(`AI调用出错: ${error.message}`);
    }
  });
}

// 获取相关上下文Hook
export function useRelevantContext() {
  return useMutation({
    mutationFn: async ({
      query,
      options
    }: {
      query: string;
      options?: any;
    }) => {
      return await aiClient.getRelevantContext(query, options);
    }
  });
}

// 获取可用工作流Hook
export function useAvailableWorkflows() {
  return useQuery({
    queryKey: ['available-workflows'],
    queryFn: async () => {
      return await aiClient.getAvailableWorkflows();
    },
    staleTime: 5 * 60 * 1000 // 5分钟缓存
  });
}

// 课程分析Hook
export function useCourseAnalysis() {
  const executeWorkflow = useExecuteWorkflow();
  
  const analyzeCourse = useCallback(async (
    courseQuery: string, 
    additionalContext?: any
  ) => {
    return await executeWorkflow.mutateAsync({
      workflowId: WORKFLOWS.COURSE_ANALYSIS,
      query: courseQuery,
      options: { additionalContext }
    });
  }, [executeWorkflow]);

  return {
    analyzeCourse,
    isLoading: executeWorkflow.isPending,
    error: executeWorkflow.error,
    data: executeWorkflow.data
  };
}

// 题目生成Hook
export function useQuestionGeneration() {
  const executeWorkflow = useExecuteWorkflow();
  
  const generateQuestions = useCallback(async (
    contentQuery: string,
    additionalContext?: any
  ) => {
    return await executeWorkflow.mutateAsync({
      workflowId: WORKFLOWS.QUESTION_GENERATION,
      query: contentQuery,
      options: { additionalContext }
    });
  }, [executeWorkflow]);

  return {
    generateQuestions,
    isLoading: executeWorkflow.isPending,
    error: executeWorkflow.error,
    data: executeWorkflow.data
  };
}

// 内容推荐Hook
export function useContentRecommendation() {
  const executeWorkflow = useExecuteWorkflow();
  
  const getRecommendations = useCallback(async (
    userInterest: string,
    additionalContext?: any
  ) => {
    return await executeWorkflow.mutateAsync({
      workflowId: WORKFLOWS.CONTENT_RECOMMENDATION,
      query: userInterest,
      options: { additionalContext }
    });
  }, [executeWorkflow]);

  return {
    getRecommendations,
    isLoading: executeWorkflow.isPending,
    error: executeWorkflow.error,
    data: executeWorkflow.data
  };
}

// AI助手Hook (通用对话)
export function useAIAssistant() {
  const simpleAI = useSimpleAI();
  const contextMutation = useRelevantContext();
  
  const askWithContext = useCallback(async (
    question: string,
    options?: {
      includeContext?: boolean;
      contextConfig?: any;
      model?: string;
    }
  ) => {
    const { includeContext = true, ...otherOptions } = options || {};
    
    return await simpleAI.mutateAsync({
      prompt: question,
      options: {
        includeContext,
        contextQuery: question,
        ...otherOptions
      }
    });
  }, [simpleAI]);

  const getContext = useCallback(async (
    query: string,
    options?: any
  ) => {
    return await contextMutation.mutateAsync({ query, options });
  }, [contextMutation]);

  return {
    askWithContext,
    getContext,
    isLoading: simpleAI.isPending || contextMutation.isPending,
    error: simpleAI.error || contextMutation.error,
    aiResponse: simpleAI.data,
    contextData: contextMutation.data
  };
}

// 工作流进度跟踪Hook
export function useWorkflowProgress(sessionId: string | null) {
  const { data: status, isLoading } = useWorkflowStatus(sessionId);
  
  const progress = status?.progress;
  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed' || status?.status === 'paused';
  
  const progressPercentage = progress 
    ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
    : 0;

  return {
    status,
    progress,
    isLoading,
    isRunning,
    isCompleted,
    isFailed,
    progressPercentage,
    currentStep: progress?.currentStep,
    completedSteps: progress?.completedSteps,
    totalSteps: progress?.totalSteps,
    results: status?.results
  };
}
