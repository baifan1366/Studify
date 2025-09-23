import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { z } from 'zod';

// Request validation schema for educational Q&A
const qaRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  contentTypes: z.array(z.string()).optional(),
  includeAnalysis: z.boolean().default(false),
  maxContext: z.number().min(1).max(20).default(5),
  // Support for conversation context
  context: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  conversationId: z.string().optional()
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
    const validatedData = qaRequestSchema.parse(body);

    const { question, contentTypes, includeAnalysis, maxContext, context, conversationId } = validatedData;

    console.log(`❓ Educational Q&A request from user ${authResult.payload.sub}: "${question.substring(0, 100)}..." ${context ? `(with ${context.length} context messages)` : '(no context)'}`);

    // Execute educational Q&A with tools
    const startTime = Date.now();
    const result = await enhancedAIExecutor.educationalQA(question, {
      userId: parseInt(authResult.payload.sub),
      contentTypes,
      includeAnalysis,
      conversationContext: context,
      conversationId
    });

    const processingTime = Date.now() - startTime;

    console.log(`✅ Educational Q&A completed in ${processingTime}ms using tools: ${result.toolsUsed.join(', ')}`);

    return NextResponse.json({
      success: true,
      question,
      answer: result.answer,
      sources: result.sources,
      analysis: result.analysis,
      confidence: result.confidence,
      toolsUsed: result.toolsUsed,
      metadata: {
        processingTimeMs: processingTime,
        contentTypes: contentTypes || ['all'],
        includeAnalysis,
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub
      }
    });

  } catch (error) {
    console.error('❌ Educational Q&A error:', error);

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
        error: 'Educational Q&A failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
