import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { apiKeyManager } from './api-key-manager';
import { contextManager } from './context-manager';
import { createClient } from '@supabase/supabase-js';
import { getLLM } from './client';

// 工作流步骤接口
interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  requiresContext?: boolean;
  contextConfig?: any;
  outputParser?: (output: string) => any;
  validation?: (output: any) => boolean;
}

// 工作流定义
interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  maxConcurrentSteps?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

// 执行上下文
interface ExecutionContext {
  workflowId: string;
  sessionId: string;
  userId?: number;
  input: any;
  stepResults: Map<string, any>;
  metadata: {
    startTime: Date;
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
  };
}

// 预定义工作流
const PREDEFINED_WORKFLOWS: Record<string, WorkflowDefinition> = {
  courseAnalysis: {
    id: 'course-analysis',
    name: 'Course Content Analysis',
    description: 'Analyze course content and generate insights',
    steps: [
      {
        id: 'extract-topics',
        name: 'Extract Main Topics',
        prompt: `Based on the provided course context, extract the main topics and concepts covered.

Context:
{context}

User Query: {query}

Please provide a structured analysis in the following format:
1. Main Topics (list the 5-8 most important topics)
2. Key Concepts (important terms and definitions)
3. Learning Objectives (what students should learn)
4. Difficulty Assessment (beginner/intermediate/advanced)

Be concise but comprehensive.`,
        requiresContext: true,
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.2
      },
      {
        id: 'generate-summary',
        name: 'Generate Course Summary',
        prompt: `Based on the extracted topics and course context, create a comprehensive summary.

Topics Analysis: {extract-topics}
Context: {context}

Create a summary that includes:
1. Course Overview (2-3 sentences)
2. What You'll Learn (bullet points)
3. Prerequisites (if any)
4. Target Audience
5. Estimated Time to Complete

Make it engaging and informative.`,
        requiresContext: true,
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.3
      },
      {
        id: 'create-study-plan',
        name: 'Create Personalized Study Plan',
        prompt: `Create a personalized study plan based on the course analysis.

Course Summary: {generate-summary}
Topics: {extract-topics}
User Query: {query}

Generate a study plan with:
1. Recommended Learning Path (step-by-step)
2. Time Allocation (hours per topic)
3. Practice Exercises (types of exercises recommended)
4. Assessment Points (when to test knowledge)
5. Additional Resources (if needed)

Tailor the plan to be practical and achievable.`,
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.4
      }
    ],
    retryPolicy: {
      maxRetries: 2,
      backoffMultiplier: 1.5
    }
  },

  questionGeneration: {
    id: 'question-generation',
    name: 'Intelligent Question Generation',
    description: 'Generate quiz questions based on course content',
    steps: [
      {
        id: 'analyze-content',
        name: 'Analyze Content for Question Points',
        prompt: `Analyze the following course content to identify key points suitable for quiz questions.

Context:
{context}

Focus Area: {query}

Identify:
1. Key facts and definitions
2. Important concepts and relationships
3. Processes and procedures
4. Critical thinking points
5. Application scenarios

Provide a structured analysis of question-worthy content.`,
        requiresContext: true,
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.1
      },
      {
        id: 'generate-questions',
        name: 'Generate Diverse Questions',
        prompt: `Based on the content analysis, generate a diverse set of quiz questions.

Content Analysis: {analyze-content}
Context: {context}

Generate 10 questions with the following distribution:
- 4 Multiple Choice Questions (with 4 options each)
- 3 True/False Questions (with explanations)
- 2 Short Answer Questions
- 1 Essay/Application Question

For each question, provide:
1. Question text
2. Question type
3. Correct answer(s)
4. Explanation/Reasoning
5. Difficulty level (1-5)
6. Learning objective addressed

Format as JSON for easy parsing.`,
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.3,
        outputParser: (output: string) => {
          try {
            return JSON.parse(output);
          } catch {
            return { error: 'Failed to parse JSON', rawOutput: output };
          }
        }
      },
      {
        id: 'review-questions',
        name: 'Review and Optimize Questions',
        prompt: `Review the generated questions for quality and educational value.

Generated Questions: {generate-questions}

Please review and:
1. Check for clarity and grammatical correctness
2. Ensure questions align with learning objectives
3. Verify difficulty progression
4. Identify any potential issues or biases
5. Suggest improvements if needed

Provide the final optimized question set with your review comments.`,
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.2
      }
    ]
  },

  contentRecommendation: {
    id: 'content-recommendation',
    name: 'Personalized Content Recommendation',
    description: 'Recommend relevant content based on user interests and learning history',
    steps: [
      {
        id: 'analyze-user-profile',
        name: 'Analyze User Learning Profile',
        prompt: `Analyze the user's learning profile and preferences.

User Context: {context}
Current Interest: {query}

Based on the available information, analyze:
1. Learning interests and preferences
2. Current knowledge level
3. Learning style indicators
4. Previous course engagement
5. Skill gaps or areas for improvement

Provide insights that will help in content recommendation.`,
        requiresContext: true,
        contextConfig: {
          contentTypes: ['profile', 'course_note', 'quiz_question'],
          maxChunks: 5
        },
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free"
      },
      {
        id: 'find-relevant-content',
        name: 'Find Matching Content',
        prompt: `Find and rank relevant content based on user profile analysis.

User Profile Analysis: {analyze-user-profile}
Available Context: {context}

Recommend content by:
1. Matching user interests with available courses/lessons
2. Considering appropriate difficulty level
3. Identifying complementary topics
4. Suggesting logical learning progression
5. Highlighting unique or valuable content

Provide top 10 recommendations with reasoning for each.`,
        requiresContext: true,
        contextConfig: {
          contentTypes: ['course', 'lesson', 'post'],
          maxChunks: 15,
          minSimilarity: 0.6
        },
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.4
      },
      {
        id: 'create-learning-path',
        name: 'Create Recommended Learning Path',
        prompt: `Create a structured learning path from the recommended content.

Content Recommendations: {find-relevant-content}
User Profile: {analyze-user-profile}

Design a learning path that includes:
1. Foundation courses (if needed)
2. Core learning sequence
3. Supplementary materials
4. Practice opportunities
5. Assessment milestones
6. Estimated timeline
7. Alternative paths for different learning speeds

Make it practical and motivating.`,
        model: process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
        temperature: 0.3
      }
    ]
  }
};

export class AIWorkflowExecutor {
  private readonly supabase;
  private readonly activeExecutions: Map<string, ExecutionContext> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * 执行预定义工作流
   */
  async executeWorkflow(
    workflowId: keyof typeof PREDEFINED_WORKFLOWS,
    input: {
      query: string;
      userId?: number;
      additionalContext?: any;
    },
    sessionId?: string
  ): Promise<{
    sessionId: string;
    results: Record<string, any>;
    metadata: any;
    success: boolean;
    error?: string;
  }> {
    const workflow = PREDEFINED_WORKFLOWS[workflowId];
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowId}`);
    }

    sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Starting workflow: ${workflow.name} (${sessionId})`);

    // 创建执行上下文
    const executionContext: ExecutionContext = {
      workflowId: workflow.id,
      sessionId,
      userId: input.userId,
      input,
      stepResults: new Map(),
      metadata: {
        startTime: new Date(),
        currentStep: '',
        totalSteps: workflow.steps.length,
        completedSteps: 0
      }
    };

    this.activeExecutions.set(sessionId, executionContext);

    try {
      // 执行工作流步骤
      for (const step of workflow.steps) {
        executionContext.metadata.currentStep = step.id;
        
        console.log(`📝 Executing step: ${step.name}`);
        
        const stepResult = await this.executeStep(
          step,
          executionContext,
          workflow.retryPolicy
        );
        
        executionContext.stepResults.set(step.id, stepResult);
        executionContext.metadata.completedSteps++;
        
        // 保存进度到数据库
        await this.saveExecutionProgress(executionContext);
      }

      console.log(`✅ Workflow completed: ${workflow.name}`);

      // 整理结果
      const results = Object.fromEntries(executionContext.stepResults);
      
      return {
        sessionId,
        results,
        metadata: executionContext.metadata,
        success: true
      };

    } catch (error) {
      console.error(`❌ Workflow failed: ${workflow.name}`, error);
      
      return {
        sessionId,
        results: Object.fromEntries(executionContext.stepResults),
        metadata: executionContext.metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.activeExecutions.delete(sessionId);
    }
  }

  /**
   * 执行单个工作流步骤
   */
  private async executeStep(
    step: WorkflowStep,
    context: ExecutionContext,
    retryPolicy?: { maxRetries: number; backoffMultiplier: number }
  ): Promise<any> {
    const maxRetries = retryPolicy?.maxRetries || step.maxRetries || 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // 获取LLM实例
        const llm = await getLLM({
          model: step.model || process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
          temperature: step.temperature || 0.3,
          maxRetries: 1
        });

        // 准备prompt变量
        const promptVariables = await this.preparePromptVariables(step, context);

        // 创建prompt模板
        const promptTemplate = PromptTemplate.fromTemplate(step.prompt);
        
        // 生成最终prompt
        const finalPrompt = await promptTemplate.format(promptVariables);
        
        console.log(`🤖 Calling AI for step: ${step.name} (attempt ${attempt + 1})`);
        
        // 调用LLM
        const response = await llm.invoke([new HumanMessage(finalPrompt)]);
        const output = response.content as string;

        // 应用输出解析器
        const parsedOutput = step.outputParser ? step.outputParser(output) : output;

        // 验证输出
        if (step.validation && !step.validation(parsedOutput)) {
          throw new Error(`Output validation failed for step: ${step.name}`);
        }

        return parsedOutput;

      } catch (error) {
        attempt++;
        
        if (attempt > maxRetries) {
          throw new Error(`Step ${step.name} failed after ${maxRetries} attempts: ${error}`);
        }

        // 计算重试延迟
        const delay = Math.pow(retryPolicy?.backoffMultiplier || 1.5, attempt - 1) * 1000;
        console.warn(`⚠️ Step ${step.name} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 准备prompt变量
   */
  private async preparePromptVariables(
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    const variables: Record<string, any> = {
      query: context.input.query,
      ...context.input.additionalContext
    };

    // 添加之前步骤的结果
    for (const [stepId, result] of context.stepResults) {
      variables[stepId] = typeof result === 'object' ? JSON.stringify(result) : result;
    }

    // 如果需要context，获取相关context
    if (step.requiresContext) {
      const contextResult = await contextManager.getRelevantContext(
        context.input.query,
        step.contextConfig || {},
        context.userId
      );
      variables.context = contextResult.context;
    }

    return variables;
  }

  /**
   * 保存执行进度
   */
  private async saveExecutionProgress(context: ExecutionContext) {
    try {
      const progress = {
        session_id: context.sessionId,
        workflow_id: context.workflowId,
        user_id: context.userId,
        current_step: context.metadata.currentStep,
        completed_steps: context.metadata.completedSteps,
        total_steps: context.metadata.totalSteps,
        step_results: Object.fromEntries(context.stepResults),
        metadata: context.metadata,
        updated_at: new Date().toISOString()
      };

      await this.supabase
        .from('ai_workflow_executions')
        .upsert(progress, { 
          onConflict: 'session_id',
          ignoreDuplicates: false 
        });

    } catch (error) {
      console.error('Failed to save execution progress:', error);
    }
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(sessionId: string) {
    const activeExecution = this.activeExecutions.get(sessionId);
    if (activeExecution) {
      return {
        status: 'running',
        progress: {
          currentStep: activeExecution.metadata.currentStep,
          completedSteps: activeExecution.metadata.completedSteps,
          totalSteps: activeExecution.metadata.totalSteps
        },
        isActive: true
      };
    }

    // 从数据库查询
    const { data } = await this.supabase
      .from('ai_workflow_executions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (!data) {
      return { status: 'not_found', isActive: false };
    }

    return {
      status: data.completed_steps === data.total_steps ? 'completed' : 'paused',
      progress: {
        currentStep: data.current_step,
        completedSteps: data.completed_steps,
        totalSteps: data.total_steps
      },
      results: data.step_results,
      metadata: data.metadata,
      isActive: false
    };
  }

  /**
   * 获取可用工作流列表
   */
  getAvailableWorkflows() {
    return Object.entries(PREDEFINED_WORKFLOWS).map(([id, workflow]) => ({
      id,
      name: workflow.name,
      description: workflow.description,
      steps: workflow.steps.map(step => ({
        id: step.id,
        name: step.name,
        requiresContext: step.requiresContext
      }))
    }));
  }

  /**
   * 单次AI调用 (用于简单任务)
   */
  async simpleAICall(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      userId?: number;
      includeContext?: boolean;
      contextQuery?: string;
      contextConfig?: any;
    } = {}
  ): Promise<string> {
    let finalPrompt = prompt;
    
    // 如果需要context
    if (options.includeContext && options.contextQuery) {
      const contextResult = await contextManager.getRelevantContext(
        options.contextQuery,
        options.contextConfig || {},
        options.userId
      );
      finalPrompt = `${prompt}\n\nRelevant Context:\n${contextResult.context}`;
    }

    const llm = await getLLM({
      model: options.model || process.env.OPEN_ROUTER_MODEL || "z-ai/glm-4.5-air:free",
      temperature: options.temperature || 0.3
    });

    const response = await llm.invoke([new HumanMessage(finalPrompt)]);
    return response.content as string;
  }
}

export const aiWorkflowExecutor = new AIWorkflowExecutor();

// 导出预定义工作流类型
export type WorkflowType = keyof typeof PREDEFINED_WORKFLOWS;
