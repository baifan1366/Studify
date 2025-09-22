import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { z } from 'zod';

// Request validation schema for course analysis
const analysisRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  analysisType: z.enum(['summary', 'topics', 'questions']).default('summary'),
  includeRecommendations: z.boolean().default(false)
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
    const validatedData = analysisRequestSchema.parse(body);

    const { content, analysisType, includeRecommendations } = validatedData;

    console.log(`📊 Course analysis request from user ${authResult.payload.sub}: ${analysisType} analysis for content (${content.length} chars)`);

    // Execute course analysis with tools
    const startTime = Date.now();
    const result = await enhancedAIExecutor.analyzeCourseContent(
      content,
      analysisType,
      {
        userId: parseInt(authResult.payload.sub),
        includeRecommendations
      }
    );

    const processingTime = Date.now() - startTime;

    console.log(`✅ Course analysis completed in ${processingTime}ms using tools: ${result.toolsUsed.join(', ')}`);

    return NextResponse.json({
      success: true,
      content: {
        preview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        length: content.length
      },
      analysisType,
      analysis: result.analysis,
      recommendations: result.recommendations,
      toolsUsed: result.toolsUsed,
      executionTime: result.executionTime,
      metadata: {
        processingTimeMs: processingTime,
        includeRecommendations,
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub
      }
    });

  } catch (error) {
    console.error('❌ Course analysis error:', error);

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
        error: 'Course analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
