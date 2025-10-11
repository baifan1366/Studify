import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';
import { z } from 'zod';

// Request validation schema for video AI assistant
const videoAssistantRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  videoContext: z.object({
    courseSlug: z.string(),
    currentLessonId: z.string().optional(),
    currentTimestamp: z.number().optional(),
    selectedText: z.string().optional()
  }),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Authorize user (require student role or higher)
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;
    const userId = parseInt(authResult.payload.sub);

    // Rate limiting check
    const checkLimit = createRateLimitCheck('videoQA');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId.toString());
    
    if (!allowed) {
      return NextResponse.json(
        rateLimitResponse(resetTime, limit),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = videoAssistantRequestSchema.parse(body);

    const { question, videoContext, conversationHistory } = validatedData;

    console.log(`🎓 Video AI Assistant request from user ${userId}: "${question.substring(0, 50)}..."`);
    console.log(`📍 Context: Course=${videoContext.courseSlug}, Lesson=${videoContext.currentLessonId}, Time=${videoContext.currentTimestamp}s`);

    // ✅ Use unified Tool Calling Agent instead of manual orchestration
    const startTime = Date.now();
    
    // Build context-aware question with video metadata
    const contextualizedQuestion = `Video Learning Context:
- Course: ${videoContext.courseSlug}
- Lesson: ${videoContext.currentLessonId || 'Not specified'}
- Video timestamp: ${videoContext.currentTimestamp || 0} seconds
${videoContext.selectedText ? `- Selected text: "${videoContext.selectedText}"` : ''}

Student Question: ${question}

Please provide a clear, educational answer that:
1. Connects to the specific video content and timestamp
2. Uses course materials and lesson context
3. Provides actionable learning suggestions
4. Encourages deeper understanding`;

    const result = await enhancedAIExecutor.educationalQA(contextualizedQuestion, {
      userId,
      includeAnalysis: true,
      conversationContext: conversationHistory
    });

    const totalProcessingTime = Date.now() - startTime;

    console.log(`✅ Video AI Assistant completed in ${totalProcessingTime}ms using tools: ${result.toolsUsed?.join(', ')}`);
    console.log(`📊 Response quality: Sources=${result.sources?.length || 0}, Tools=${result.toolsUsed?.length || 0}`);

    // Format sources for compatibility
    const formattedSources = (result.sources || []).map((source: any) => ({
      type: source.type || 'course_content',
      title: source.title || 'Course Content',
      timestamp: source.timestamp,
      url: source.url,
      contentPreview: source.contentPreview || source.content?.substring(0, 100)
    }));

    return NextResponse.json({
      success: true,
      question,
      answer: result.answer,
      sources: formattedSources,
      confidence: result.confidence || 0.85,
      webSearchUsed: result.toolsUsed?.includes('search') || false,
      suggestedActions: [
        "Review related course materials",
        "Take notes on key points",
        "Try related practice questions"
      ],
      relatedConcepts: formattedSources.slice(0, 3).map((s: any) => s.title),
      metadata: {
        processingTimeMs: totalProcessingTime,
        aiProcessingTimeMs: totalProcessingTime,
        videoContext,
        sourcesCount: formattedSources.length,
        toolsUsed: result.toolsUsed || [],
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub,
        conversationHistoryLength: conversationHistory?.length || 0,
        upgraded: true // Mark as using new Tool Calling architecture
      }
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    });

  } catch (error) {
    console.error('❌ Video AI Assistant error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors,
          message: 'Please check your request format'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Video AI Assistant failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check AI assistant status and capabilities
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return NextResponse.json({
      success: true,
      status: 'operational',
      capabilities: {
        questionAnswering: true,
        contextAwareness: true,
        courseContentSearch: true,
        webFallback: true,
        conversationHistory: true,
        sourceAttribution: true,
        confidenceScoring: true
      },
      features: {
        doubleCallPattern: true,
        multiSourceRetrieval: true,
        intelligentFallback: true,
        videoContextIntegration: true,
        userPersonalization: true
      },
      supportedContentTypes: [
        'course_content',
        'lesson',
        'note', 
        'metadata',
        'web',
        'video_segment'
      ],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking AI assistant status:', error);
    return NextResponse.json(
      { error: 'Failed to check AI assistant status' },
      { status: 500 }
    );
  }
}
