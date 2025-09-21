// 简化的AI客户端，用于前端调用
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
