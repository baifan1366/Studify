import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { VideoLearningAIAssistant, VideoContext } from '@/lib/langChain/video-ai-assistant';
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

    // Parse and validate request
    const body = await request.json();
    const validatedData = videoAssistantRequestSchema.parse(body);

    const { question, videoContext, conversationHistory } = validatedData;

    console.log(`🎓 Video AI Assistant request from user ${userId}: "${question.substring(0, 50)}..."`);
    console.log(`📍 Context: Course=${videoContext.courseSlug}, Lesson=${videoContext.currentLessonId}, Time=${videoContext.currentTimestamp}s`);

    // Create video AI assistant instance and call with double-call pattern
    const videoAIAssistant = new VideoLearningAIAssistant();
    const startTime = Date.now();
    const result = await videoAIAssistant.assistUser(
      question,
      videoContext,
      userId,
      conversationHistory
    );

    const totalProcessingTime = Date.now() - startTime;

    console.log(`✅ Video AI Assistant completed in ${totalProcessingTime}ms using ${result.webSearchUsed ? 'local + web' : 'local only'} sources`);
    console.log(`📊 Response confidence: ${(result.confidence * 100).toFixed(1)}%, Sources: ${result.sources.length}`);

    return NextResponse.json({
      success: true,
      question,
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
      webSearchUsed: result.webSearchUsed,
      suggestedActions: result.suggestedActions,
      relatedConcepts: result.relatedConcepts,
      metadata: {
        processingTimeMs: totalProcessingTime,
        aiProcessingTimeMs: result.processingTime,
        videoContext,
        sourcesCount: result.sources.length,
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub,
        conversationHistoryLength: conversationHistory?.length || 0
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
