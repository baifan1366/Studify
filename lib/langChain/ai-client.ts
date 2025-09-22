// 简化的AI客户端，用于前端调用 - Enhanced with Tool Calling
export class AIClient {
  private baseUrl: string;

  constructor(baseUrl = '/api/ai') {
    this.baseUrl = baseUrl;
  }

  /**
   * 执行AI工作流
   */
  async executeWorkflow(
    workflowId: string,
    query: string,
    options?: {
      additionalContext?: any;
      sessionId?: string;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId,
        query,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(sessionId: string) {
    const response = await fetch(`${this.baseUrl}/workflow?sessionId=${sessionId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 获取可用工作流列表
   */
  async getAvailableWorkflows() {
    const response = await fetch(`${this.baseUrl}/workflow`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 简单AI调用
   */
  async simpleCall(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      includeContext?: boolean;
      contextQuery?: string;
      contextConfig?: any;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 获取相关上下文
   */
  async getRelevantContext(
    query: string,
    options?: {
      contentTypes?: string[];
      maxTokens?: number;
      maxChunks?: number;
      minSimilarity?: number;
      includeMetadata?: boolean;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 获取内容相关上下文
   */
  async getContentRelatedContext(contentType: string, contentId: number) {
    const response = await fetch(`${this.baseUrl}/context?contentType=${contentType}&contentId=${contentId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Tool Calling - 使用工具调用的AI对话
   */
  async callWithTools(
    prompt: string,
    options?: {
      enabledTools?: string[] | 'all';
      toolCategories?: string[];
      model?: string;
      temperature?: number;
      maxIterations?: number;
      userId?: number;
      includeSteps?: boolean;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 教育问答 - 使用工具增强的问答
   */
  async educationalQA(
    question: string,
    options?: {
      contentTypes?: string[];
      includeAnalysis?: boolean;
      userId?: number;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 课程内容分析 - 使用工具的智能分析
   */
  async analyzeCourseWithTools(
    content: string,
    analysisType: 'summary' | 'topics' | 'questions' = 'summary',
    options?: {
      includeRecommendations?: boolean;
      userId?: number;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        analysisType,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 获取可用工具列表
   */
  async getAvailableTools() {
    const response = await fetch(`${this.baseUrl}/tools`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }
}

// 导出单例实例
export const aiClient = new AIClient();

// 便捷的工作流类型
export const WORKFLOWS = {
  COURSE_ANALYSIS: 'course-analysis',
  QUESTION_GENERATION: 'question-generation', 
  CONTENT_RECOMMENDATION: 'content-recommendation'
} as const;

// React Hook 示例 (可选) - 需要在React组件中使用
import { useState } from 'react';

export function useAIWorkflow() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeWorkflow = async (
    workflowId: string,
    query: string,
    options?: any
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await aiClient.executeWorkflow(workflowId, query, options);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const simpleCall = async (prompt: string, options?: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await aiClient.simpleCall(prompt, options);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeWorkflow,
    simpleCall,
    isLoading,
    error
  };
}

// Enhanced Hook for Tool Calling
export function useAIToolCalling() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);

  const callWithTools = async (
    prompt: string,
    options?: {
      enabledTools?: string[] | 'all';
      toolCategories?: string[];
      model?: string;
      temperature?: number;
      maxIterations?: number;
      includeSteps?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    setToolsUsed([]);
    
    try {
      const result = await aiClient.callWithTools(prompt, options);
      setToolsUsed(result.toolsUsed || []);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const educationalQA = async (
    question: string,
    options?: {
      contentTypes?: string[];
      includeAnalysis?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    setToolsUsed([]);
    
    try {
      const result = await aiClient.educationalQA(question, options);
      setToolsUsed(result.toolsUsed || []);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeCourse = async (
    content: string,
    analysisType: 'summary' | 'topics' | 'questions' = 'summary',
    options?: {
      includeRecommendations?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    setToolsUsed([]);
    
    try {
      const result = await aiClient.analyzeCourseWithTools(content, analysisType, options);
      setToolsUsed(result.toolsUsed || []);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableTools = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await aiClient.getAvailableTools();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    callWithTools,
    educationalQA,
    analyzeCourse,
    getAvailableTools,
    isLoading,
    error,
    toolsUsed
  };
}

// TypeScript 类型定义
export interface WorkflowResult {
  sessionId: string;
  results: Record<string, any>;
  metadata: any;
  success: boolean;
  error?: string;
}

export interface WorkflowStatus {
  status: 'running' | 'completed' | 'paused' | 'not_found';
  progress?: {
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
  };
  results?: Record<string, any>;
  metadata?: any;
  isActive: boolean;
}

export interface SimpleCallResult {
  result: string;
  success: boolean;
  metadata: {
    model: string;
    includeContext: boolean;
    timestamp: string;
  };
}

export interface ContextResult {
  context: string;
  chunks: Array<{
    id: number;
    contentType: string;
    text: string;
    combinedSimilarity: number;
    metadata: any;
  }>;
  metadata: {
    totalTokens: number;
    chunkCount: number;
    avgSimilarity: number;
    contentTypeDistribution: Record<string, number>;
  };
  success: boolean;
}
