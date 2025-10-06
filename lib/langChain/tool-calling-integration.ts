// Tool Calling Integration for Studify AI System
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { DynamicTool } from "@langchain/core/tools";
import { 
  AVAILABLE_TOOLS, 
  TOOL_CATEGORIES, 
  getToolsByCategory, 
  getAllTools,
  getToolByName 
} from './tools/index';

// Re-export TOOL_CATEGORIES for external use
export { TOOL_CATEGORIES };
import { getLLM, getReasoningLLM, getVisionLLM } from './client';
import { aiWorkflowExecutor } from './ai-workflow';

// === TOOL CALLING CONFIGURATION ===

interface ToolCallingConfig {
  model?: string;
  temperature?: number;
  enabledTools?: string[] | 'all';
  toolCategories?: (keyof typeof TOOL_CATEGORIES)[];
  maxIterations?: number;
  enableReasoning?: boolean;
  systemPrompt?: string;
  verbose?: boolean;
  userId?: number;
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant for Studify, an educational platform. You have access to various tools to help users with:

- Searching educational content (courses, lessons, posts)
- Answering questions using the knowledge base
- Analyzing course content and generating insights
- Providing personalized content recommendations
- Accessing user profiles and learning progress
- Performing calculations and utility functions

Guidelines:
1. Always use tools when you need information from the knowledge base
2. Be helpful, accurate, and educational in your responses
3. When answering questions, cite sources when available
4. For course analysis, provide actionable insights
5. Respect user privacy and only access authorized data
6. Use multiple tools when needed to provide comprehensive answers

Remember: You're helping students and educators learn more effectively!`;

// === TOOL CALLING AGENT ===

export class StudifyToolCallingAgent {
  private agent: AgentExecutor | null = null;
  private llm: ChatOpenAI | null = null;
  protected config: ToolCallingConfig;

  constructor(config: ToolCallingConfig = {}) {
    this.config = {
      model: "deepseek/deepseek-chat-v3.1:free",
      temperature: 0.3,
      enabledTools: 'all',
      maxIterations: 10,
      enableReasoning: false,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      verbose: false,
      ...config
    };
  }

  /**
   * Initialize the tool calling agent
   */
  async initialize(): Promise<void> {
    try {
      // Get LLM instance
      this.llm = this.config.enableReasoning 
        ? await getReasoningLLM({ 
            model: this.config.model,
            temperature: this.config.temperature 
          })
        : await getLLM({ 
            model: this.config.model,
            temperature: this.config.temperature 
          });

      // Select tools based on configuration
      const tools = this.getSelectedTools();

      if (tools.length === 0) {
        throw new Error('No tools selected for the agent');
      }

      // Create system prompt
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", this.config.systemPrompt!],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
      ]);

      // Create agent
      const agent = await createOpenAIFunctionsAgent({
        llm: this.llm,
        tools,
        prompt,
      });

      // Create agent executor
      this.agent = new AgentExecutor({
        agent,
        tools,
        maxIterations: this.config.maxIterations,
        verbose: this.config.verbose,
        returnIntermediateSteps: true,
      });

      console.log(`🤖 Tool calling agent initialized with ${tools.length} tools:`, tools.map(t => t.name));
    } catch (error) {
      console.error('❌ Failed to initialize tool calling agent:', error);
      throw error;
    }
  }

  /**
   * Execute a query with tool calling
   */
  async execute(
    input: string, 
    options: {
      userId?: number;
      includeSteps?: boolean;
      maxTokens?: number;
    } = {}
  ): Promise<{
    output: string;
    intermediateSteps?: any[];
    toolsUsed: string[];
    executionTime: number;
  }> {
    if (!this.agent) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      console.log(`🚀 Executing tool calling query: "${input.substring(0, 100)}..."`);
      console.log('🔧 Available tools:', this.getSelectedTools().map(t => t.name));

      // Add user context if provided
      let enhancedInput = input;
      if (options.userId) {
        enhancedInput = `[User ID: ${options.userId}] ${input}`;
      }

      console.log('📡 Calling AgentExecutor...');
      const result = await this.agent!.invoke({ input: enhancedInput });
      const executionTime = Date.now() - startTime;

      console.log('🔍 Raw AgentExecutor result:', {
        hasOutput: !!result.output,
        outputLength: result.output?.length || 0,
        hasIntermediateSteps: !!result.intermediateSteps,
        intermediateStepsLength: result.intermediateSteps?.length || 0,
        resultKeys: Object.keys(result)
      });

      // Extract tools used from intermediate steps
      const toolsUsed: string[] = [];
      if (result.intermediateSteps && result.intermediateSteps.length > 0) {
        console.log('🔧 Analyzing intermediate steps:');
        for (const [index, step] of result.intermediateSteps.entries()) {
          console.log(`  Step ${index}:`, {
            hasAction: !!step.action,
            actionType: step.action?.constructor?.name,
            actionTool: step.action?.tool,
            hasObservation: !!step.observation,
            observationLength: step.observation?.length || 0
          });
          
          if (step.action && step.action.tool) {
            toolsUsed.push(step.action.tool);
          }
        }
      } else {
        console.log('⚠️ No intermediate steps found in result');
      }

      console.log(`✅ Tool calling completed in ${executionTime}ms using tools: ${toolsUsed.join(', ')}`);

      return {
        output: result.output,
        intermediateSteps: options.includeSteps ? result.intermediateSteps : undefined,
        toolsUsed: [...new Set(toolsUsed)], // Remove duplicates
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Tool calling failed after ${executionTime}ms:`, error);
      
      return {
        output: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        executionTime
      };
    }
  }

  /**
   * Execute with conversation history
   */
  async executeWithHistory(
    input: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: {
      userId?: number;
      includeSteps?: boolean;
    } = {}
  ): Promise<{
    output: string;
    intermediateSteps?: any[];
    toolsUsed: string[];
    executionTime: number;
  }> {
    if (!this.agent) {
      await this.initialize();
    }

    // Build conversation context
    let contextualInput = input;
    if (conversationHistory.length > 0) {
      const historyText = conversationHistory
        .slice(-5) // Last 5 messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      contextualInput = `Previous conversation:\n${historyText}\n\nCurrent query: ${input}`;
    }

    return this.execute(contextualInput, options);
  }

  /**
   * Get tools based on configuration
   */
  protected getSelectedTools(): any[] {
    if (this.config.enabledTools === 'all') {
      return getAllTools();
    }

    let tools: any[] = [];

    // Add tools by categories
    if (this.config.toolCategories) {
      for (const category of this.config.toolCategories) {
        tools.push(...getToolsByCategory(category));
      }
    }

    // Add specific tools
    if (Array.isArray(this.config.enabledTools)) {
      for (const toolName of this.config.enabledTools) {
        const tool = getToolByName(toolName);
        if (tool && !tools.includes(tool)) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }

  /**
   * Get available tools information
   */
  getAvailableTools(): Array<{
    name: string;
    description: string;
    category: string;
  }> {
    const tools = this.getSelectedTools();
    
    return tools.map(tool => {
      // Find category for this tool
      let category = 'UTILITIES';
      for (const [cat, toolNames] of Object.entries(TOOL_CATEGORIES)) {
        if (toolNames.includes(tool.name)) {
          category = cat;
          break;
        }
      }

      return {
        name: tool.name,
        description: tool.description,
        category
      };
    });
  }
}

// === INTEGRATION WITH EXISTING AI WORKFLOW ===

/**
 * Enhanced AI Workflow Executor with Tool Calling
 */
export class EnhancedAIWorkflowExecutor extends StudifyToolCallingAgent {
  
  /**
   * Execute a simple AI call with optional tool usage
   */
  async simpleAICallWithTools(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      userId?: number;
      enableTools?: boolean;
      toolCategories?: (keyof typeof TOOL_CATEGORIES)[];
      includeContext?: boolean;
      contextQuery?: string;
    } = {}
  ): Promise<{
    result: string;
    toolsUsed: string[];
    executionTime: number;
    metadata: any;
  }> {
    if (!options.enableTools) {
      // Fallback to simple AI call without tools
      const startTime = Date.now();
      const result = await aiWorkflowExecutor.simpleAICall(prompt, options);
      return {
        result,
        toolsUsed: [],
        executionTime: Date.now() - startTime,
        metadata: { model: options.model, toolsEnabled: false }
      };
    }

    // Update configuration for tool calling
    this.config = {
      ...this.config,
      model: options.model,
      temperature: options.temperature,
      toolCategories: options.toolCategories,
      userId: options.userId
    };

    // Reinitialize with new config
    await this.initialize();

    const execution = await this.execute(prompt, { 
      userId: options.userId,
      includeSteps: false 
    });

    return {
      result: execution.output,
      toolsUsed: execution.toolsUsed,
      executionTime: execution.executionTime,
      metadata: {
        model: options.model,
        toolsEnabled: true,
        toolsUsed: execution.toolsUsed
      }
    };
  }

  /**
   * Educational Q&A with tool calling
   */
  async educationalQA(
    question: string,
    options: {
      userId?: number;
      contentTypes?: string[];
      includeAnalysis?: boolean;
      conversationContext?: Array<{role: string; content: string}>;
      conversationId?: string;
    } = {}
  ): Promise<{
    answer: string;
    sources: any[];
    analysis?: string;
    toolsUsed: string[];
    confidence: number;
  }> {
    const config: ToolCallingConfig = {
      toolCategories: ['SEARCH_AND_QA', 'CONTENT_ANALYSIS'],
      userId: options.userId,
      systemPrompt: `${DEFAULT_SYSTEM_PROMPT}

For this educational Q&A session:
1. Search for relevant information using the search tool
2. Use the answer_question tool for detailed responses
3. ${options.includeAnalysis ? 'Provide additional analysis if helpful' : ''}
4. Always cite sources and provide confidence levels
5. Focus on educational value and accuracy`
    };

    const agent = new StudifyToolCallingAgent(config);
    await agent.initialize();

    // Build enhanced question with context if available
    let enhancedQuestion = question;
    
    // Add conversation context if provided
    if (options.conversationContext && options.conversationContext.length > 0) {
      enhancedQuestion = `Here's our conversation history:
${options.conversationContext.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current question: ${question}

Please provide a contextually appropriate response considering our previous conversation.`;
    }
    
    if (options.contentTypes) {
      enhancedQuestion += `\n\nFocus on content types: ${options.contentTypes.join(', ')}`;
    }

    const result = await agent.execute(enhancedQuestion, {
      userId: options.userId,
      includeSteps: true
    });

    // Extract relevant information from the result
    return {
      answer: result.output,
      sources: [], // Could be extracted from tool calls
      analysis: options.includeAnalysis ? result.output : undefined,
      toolsUsed: result.toolsUsed,
      confidence: 0.85 // Could be calculated from tool results
    };
  }

  /**
   * Content analysis with tools - 扩展支持更多分析类型
   */
  async analyzeCourseContent(
    content: string,
    analysisType: 'summary' | 'topics' | 'questions' | 'notes' | 'problem_solving' | 'learning_path' = 'summary',
    options: {
      userId?: number;
      contentTypes?: string[];
      includeAnalysis?: boolean;
      includeRecommendations?: boolean;
      imageUrl?: string;
      conversationContext?: Array<{role: string; content: string}>;
      conversationId?: string;
      learningGoal?: string;
      currentLevel?: string;
      timeConstraint?: string;
    } = {}
  ): Promise<{
    analysis: any;
    recommendations?: any[];
    toolsUsed: string[];
    executionTime: number;
  }> {
    // 判断是否需要使用视觉模型（针对图片分析）
    const isImageAnalysis = analysisType === 'problem_solving' && content.startsWith('data:image/');
    
    const config: ToolCallingConfig = {
      toolCategories: ['CONTENT_ANALYSIS', 'RECOMMENDATIONS'],
      userId: options.userId,
      verbose: true, // Enable verbose logging
      model: isImageAnalysis ? "moonshotai/kimi-vl-a3b-thinking:free" : "deepseek/deepseek-chat-v3.1:free", // 图片分析使用Kimi VL，其他使用DeepSeek
      systemPrompt: `${DEFAULT_SYSTEM_PROMPT}

For course content analysis:
1. ALWAYS use the analyze_content tool for detailed content analysis
2. ${options.includeRecommendations ? 'ALWAYS use the recommend_content tool to generate content recommendations' : ''}
3. You MUST use tools to provide structured, actionable insights
4. Focus on educational value and learning outcomes
5. Do not provide direct answers without using the available tools first`
    };

    const agent = new StudifyToolCallingAgent(config);
    await agent.initialize();

    let prompt = '';
    
    switch (analysisType) {
      case 'notes':
        prompt = `Generate smart study notes from the following content. Extract key points, create summaries, and identify important concepts:

${content}

Please provide:
1. A concise summary
2. Key learning points (bullet format)
3. Important concepts and definitions
4. Suggested study focus areas
${options.includeRecommendations ? '\n5. Related learning resources and next steps' : ''}`;
        break;
        
      case 'problem_solving':
        // Check if content is base64 image data
        const isImageData = content.startsWith('data:image/');
        
        if (isImageData) {
          prompt = `I've received an image that contains an academic problem or question. Please analyze the image and solve the problem step by step:

Image Data: ${content}

Please provide:
1. **Problem Recognition**: What type of problem or question is shown in the image?
2. **Problem Analysis**: Break down the problem and identify key components
3. **Solution Steps**: Provide detailed step-by-step solution
4. **Calculations**: Show all mathematical work and reasoning
5. **Final Answer**: State the final answer clearly
6. **Learning Concepts**: Identify the academic concepts and formulas used
7. **Study Tips**: Suggest how to approach similar problems

Format your response in clear markdown with proper headings and formatting.`;
        } else {
          prompt = `Analyze and solve the following academic problem step by step:

${content}
${options.imageUrl ? `\nImage reference: ${options.imageUrl}` : ''}

Please provide:
1. Problem analysis and understanding
2. Step-by-step solution approach
3. Detailed calculations or reasoning
4. Final answer with explanation
5. Learning concepts involved`;
        }
        break;

      case 'learning_path':
        prompt = `You MUST use the analyze_content tool to create a comprehensive personalized learning path. 

STEP 1: First, use the analyze_content tool with this JSON input:
{
  "content": "${content.replace(/"/g, '\\"')}",
  "analysisType": "learning_path",
  "customPrompt": "Create a comprehensive personalized learning roadmap for: ${options.learningGoal || 'the specified learning goal'}. Current level: ${options.currentLevel || 'Beginner'}. Time constraint: ${options.timeConstraint || 'Flexible'}. Include: 1) Learning Summary, 2) Mermaid flowchart diagram, 3) Step-by-step roadmap with duration and difficulty, 4) Recommended courses, 5) Practice quizzes, 6) Study tips. Focus on practical, actionable steps that help the user quickly know what to learn and where to start."
}

STEP 2: Based on the tool results, format a comprehensive learning path with:

1. **Learning Summary**: Brief overview of the learning journey and expected outcomes

2. **Mermaid Flowchart**: Create a Mermaid diagram showing the learning progression:
\`\`\`mermaid
graph TD
    A[Start: ${options.learningGoal || 'Learning Goal'}] --> B[Foundation]
    B --> C[Intermediate Concepts]
    C --> D[Advanced Topics]
    D --> E[Practical Application]
    E --> F[Mastery & Beyond]
\`\`\`

3. **Detailed Roadmap**: Step-by-step breakdown with duration, difficulty, resources
4. **Recommended Courses**: Specific courses with descriptions and difficulty levels
5. **Practice Quizzes**: Practice materials with question counts and focus areas
6. **Study Tips**: Practical advice for effective learning

Remember: You MUST use the analyze_content tool first before providing your response!`;
        break;
        
      default:
        prompt = `Analyze the following course content for ${analysisType}:

${content}

${options.includeRecommendations ? '\nAlso provide content recommendations based on this analysis.' : ''}`;
    }

    console.log(`🔧 Executing ${analysisType} analysis with tools:`, {
      toolCategories: config.toolCategories,
      promptLength: prompt.length,
      userId: options.userId
    });

    const result = await agent.execute(prompt, {
      userId: options.userId,
      includeSteps: true // Enable steps to see what tools were called
    });

    console.log(`🎯 Analysis result:`, {
      outputLength: result.output?.length || 0,
      toolsUsed: result.toolsUsed,
      executionTime: result.executionTime,
      hasIntermediateSteps: !!result.intermediateSteps
    });

    // If no tools were used and output is empty, try direct tool calling as fallback
    if (result.toolsUsed.length === 0 && (!result.output || result.output.trim().length === 0)) {
      console.warn('⚠️  No tools used and empty output, trying direct tool execution');
      
      try {
        // Try to directly call the analyze_content tool
        const tools = this.getSelectedTools();
        const analyzeContentTool = tools.find(t => t.name === 'analyze_content');
        
        if (analyzeContentTool) {
          console.log('🔧 Attempting direct tool call as fallback');
          const directInput = JSON.stringify({
            content: content,
            analysisType: analysisType,
            customPrompt: `Create a comprehensive personalized learning roadmap for: ${options.learningGoal || 'the specified learning goal'}. Current level: ${options.currentLevel || 'Beginner'}. Time constraint: ${options.timeConstraint || 'Flexible'}. Include detailed roadmap, courses, and study tips.`
          });
          
          const directResult = await analyzeContentTool.func(directInput);
          console.log('✅ Direct tool call successful, result length:', directResult.length);
          
          return {
            analysis: directResult,
            recommendations: options.includeRecommendations ? [] : undefined,
            toolsUsed: ['analyze_content'],
            executionTime: result.executionTime
          };
        }
      } catch (directError) {
        console.error('❌ Direct tool call failed:', directError);
      }
      
      console.warn('⚠️  Providing fallback response');
      return {
        analysis: `I apologize, but I was unable to generate a ${analysisType} analysis at this time. This might be due to a temporary issue with the AI service. Please try again in a moment.`,
        recommendations: options.includeRecommendations ? [] : undefined,
        toolsUsed: result.toolsUsed,
        executionTime: result.executionTime
      };
    }

    return {
      analysis: result.output,
      recommendations: options.includeRecommendations ? [] : undefined,
      toolsUsed: result.toolsUsed,
      executionTime: result.executionTime
    };
  }
}

// === EXPORTS ===

// Create enhanced singleton instance
export const enhancedAIExecutor = new EnhancedAIWorkflowExecutor();

// Export utility functions
export async function createToolCallingAgent(config?: ToolCallingConfig) {
  const agent = new StudifyToolCallingAgent(config);
  await agent.initialize();
  return agent;
}

export async function executeWithTools(
  input: string, 
  config?: ToolCallingConfig,
  options?: { userId?: number }
) {
  const agent = await createToolCallingAgent(config);
  return agent.execute(input, options);
}

// Note: Classes are already exported above with their declarations
