import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { 
  StudifyToolCallingAgent, 
  enhancedAIExecutor,
  TOOL_CATEGORIES 
} from '@/lib/langChain/tool-calling-integration';
import { z } from 'zod';

// Request validation schema for tool calling
const toolCallingRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  enabledTools: z.union([z.array(z.string()), z.literal('all')]).optional(),
  toolCategories: z.array(z.enum(['SEARCH_AND_QA', 'CONTENT_ANALYSIS', 'DATA_ACCESS', 'RECOMMENDATIONS', 'UTILITIES'])).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxIterations: z.number().min(1).max(20).default(10),
  includeSteps: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    // Parse and validate request
    const body = await request.json();
    const validatedData = toolCallingRequestSchema.parse(body);

    const { 
      prompt, 
      enabledTools, 
      toolCategories, 
      model, 
      temperature, 
      maxIterations, 
      includeSteps 
    } = validatedData;

    console.log(`🔧 Tool calling request from user ${authResult.payload.sub}: "${prompt.substring(0, 100)}..."`);

    // Create tool calling agent
    const agent = new StudifyToolCallingAgent({
      model: model || "x-ai/grok-4-fast:free",
      temperature: temperature || 0.3,
      enabledTools: enabledTools || 'all',
      toolCategories: toolCategories,
      maxIterations,
      verbose: false,
      userId: parseInt(authResult.payload.sub)
    });

    await agent.initialize();

    // Execute with tools
    const startTime = Date.now();
    const result = await agent.execute(prompt, {
      userId: parseInt(authResult.payload.sub),
      includeSteps
    });

    const processingTime = Date.now() - startTime;

    console.log(`✅ Tool calling completed in ${processingTime}ms using tools: ${result.toolsUsed.join(', ')}`);

    return NextResponse.json({
      success: true,
      result: result.output,
      toolsUsed: result.toolsUsed,
      executionTime: result.executionTime,
      intermediateSteps: includeSteps ? result.intermediateSteps : undefined,
      metadata: {
        processingTimeMs: processingTime,
        model: model || "x-ai/grok-4-fast:free",
        toolsEnabled: true,
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub
      }
    });

  } catch (error) {
    console.error('❌ Tool calling error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Tool calling failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list available tools
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Create a basic agent to get tool info
    const agent = new StudifyToolCallingAgent({ enabledTools: 'all' });
    await agent.initialize();
    
    const availableTools = agent.getAvailableTools();

    return NextResponse.json({
      success: true,
      tools: availableTools,
      categories: Object.keys(TOOL_CATEGORIES),
      totalTools: availableTools.length
    });

  } catch (error) {
    console.error('❌ Error fetching available tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}
