import { NextRequest } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { getLLM } from '@/lib/langChain/client';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';

// Set max duration to 5 minutes (300 seconds)
export const maxDuration = 300;

// Debug logger
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[video-qa-stream][${timestamp}]`;
  
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
};

// Get model based on AI mode
function getModel(mode: 'fast' | 'normal' | 'thinking' = 'normal'): string {
  if (mode === 'thinking') {
    return process.env.OPENROUTER_MODEL_THINKING || 'deepseek/deepseek-r1';
  } else if (mode === 'fast') {
    return process.env.OPENROUTER_MODEL_FAST || 'nvidia/nemotron-3-super-120b-a12b:free';
  } else {
    return process.env.OPENROUTER_MODEL_NORMAL || process.env.OPENROUTER_MODEL_THINKING || 'deepseek/deepseek-r1';
  }
}

// Helper function to send streaming updates
function sendStreamUpdate(encoder: TextEncoder, controller: ReadableStreamDefaultController, data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}

// Streaming Video Q&A API
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  debugLog(`📥 Incoming streaming request`, { requestId });
  
  try {
    // Authorization
    const authResult = await authorize('student');
    if ('status' in authResult) {
      return authResult;
    }
    
    const { user } = authResult;
    const userId = user.profile?.id;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const checkLimit = createRateLimitCheck('videoQA');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId.toString());
    
    if (!allowed) {
      return new Response(JSON.stringify(rateLimitResponse(resetTime, limit)), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const {
      lessonId,
      question,
      currentTime,
      timeWindow = 30,
      aiMode = 'normal',
      clientEmbedding
    } = body;

    if (!lessonId || !question?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const selectedModel = getModel(aiMode as 'fast' | 'normal' | 'thinking');
    
    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Initialize
          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'init',
            message: '🚀 Initializing AI assistant...',
            progress: 5
          });
          
          const supabase = await createAdminClient();
          
          // Step 2: Fetch lesson data
          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'fetch_lesson',
            message: '📚 Loading lesson information...',
            progress: 15
          });
          
          const { data: lesson, error: lessonError } = await supabase
            .from('course_lesson')
            .select(`
              id,
              title,
              transcript,
              content_url,
              course_module:module_id(title),
              course:course_id(title, description)
            `)
            .eq('public_id', lessonId)
            .single();

          if (lessonError || !lesson) {
            sendStreamUpdate(encoder, controller, {
              type: 'error',
              message: 'Lesson not found'
            });
            controller.close();
            return;
          }

          const courseTitle = (lesson.course as any)?.title || 'Unknown Course';
          const moduleTitle = (lesson.course_module as any)?.title || 'Unknown Module';
          const lessonTitle = lesson.title || 'Unknown Lesson';

          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'lesson_loaded',
            message: `✅ Loaded: ${lessonTitle}`,
            progress: 25,
            data: { courseTitle, moduleTitle, lessonTitle }
          });

          // Check if external video
          const isExternalVideo = lesson.content_url && 
            (lesson.content_url.includes('youtube.com') || 
             lesson.content_url.includes('youtu.be') ||
             lesson.content_url.includes('vimeo.com'));

          if (isExternalVideo) {
            // Handle external video
            sendStreamUpdate(encoder, controller, {
              type: 'status',
              step: 'external_video',
              message: '🎬 Detected external video (YouTube/Vimeo)',
              progress: 35
            });

            sendStreamUpdate(encoder, controller, {
              type: 'status',
              step: 'ai_processing',
              message: '🤖 AI is analyzing your question...',
              progress: 50
            });

            const courseContext = `Course: ${courseTitle}\nModule: ${moduleTitle}\nLesson: ${lessonTitle}\nVideo Type: External Video\nCurrent Time: ${currentTime}s`;
            const directQuestion = `${courseContext}\n\nStudent Question: ${question}\n\nPlease provide relevant answers based on the course topic.`;

            const result = await enhancedAIExecutor.educationalQA(directQuestion, {
              userId,
              includeAnalysis: true,
              model: selectedModel
            });

            sendStreamUpdate(encoder, controller, {
              type: 'answer',
              answer: result.answer.trim(),
              thinking: result.thinking,
              segments: [],
              isExternalVideo: true,
              courseInfo: { courseName: courseTitle, moduleName: moduleTitle, lessonName: lessonTitle },
              metadata: { model: selectedModel, aiMode }
            });

            // Save history
            await supabase.from('video_qa_history').insert({
              user_id: userId,
              lesson_id: lesson.id,
              question,
              answer: result.answer,
              video_time: currentTime,
              context_segments: null
            });

            sendStreamUpdate(encoder, controller, {
              type: 'complete',
              message: '✅ Analysis complete!',
              progress: 100
            });

            controller.close();
            return;
          }

          // Step 3: Get attachment for regular videos
          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'fetch_attachment',
            message: '🎥 Loading video data...',
            progress: 30
          });

          const { data: lessonWithAttachment } = await supabase
            .from('course_lesson')
            .select(`id, course_attachments!inner(id, file_type)`)
            .eq('id', lesson.id)
            .eq('course_attachments.file_type', 'video')
            .single();
          
          const attachmentId = lessonWithAttachment?.course_attachments?.[0]?.id;

          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'attachment_loaded',
            message: attachmentId ? '✅ Video data loaded' : '⚠️ No video attachment found',
            progress: 40,
            data: { attachmentId }
          });

          // Step 4: Search for relevant content
          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'searching',
            message: '🔍 Searching for relevant video segments...',
            progress: 50
          });

          const courseContext = `Course: ${courseTitle}\nModule: ${moduleTitle}\nLesson: ${lessonTitle}\nCurrent Time: ${currentTime}s`;
          const enhancedQuestion = `${courseContext}\n\nStudent Question: ${question}\n\nPlease search for relevant content and provide a detailed answer.`;

          // Step 5: AI Processing with streaming thinking
          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'ai_processing',
            message: aiMode === 'thinking' ? '🧠 AI is thinking deeply...' : '🤖 AI is analyzing...',
            progress: 60
          });

          const result = await enhancedAIExecutor.educationalQA(enhancedQuestion, {
            userId,
            includeAnalysis: true,
            contentTypes: ['video_segment', 'lesson', 'note'],
            model: selectedModel,
            videoContext: { lessonId, attachmentId, currentTime },
            clientEmbedding,
            aiMode: aiMode as 'fast' | 'normal' | 'thinking',
          });

          // Step 6: Process results
          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'processing_results',
            message: '📊 Processing search results...',
            progress: 80
          });

          const sources = result.sources || [];
          const videoSegments = sources
            .filter((source: any) => source.type === 'video_segment' || source.content_type === 'video_segment')
            .map((source: any) => {
              const startTime = source.segment_start_time || source.startTime || source.timestamp || 0;
              const endTime = source.segment_end_time || source.endTime || (startTime + 30);
              const text = source.content_text || source.content || source.contentPreview || '';
              
              return {
                startTime: Math.floor(startTime),
                endTime: Math.floor(endTime),
                text: text,
                relevantText: text.substring(0, 300) + (text.length > 300 ? '...' : '')
              };
            })
            .filter((seg: any) => seg.startTime >= 0 && seg.text.length > 0);

          sendStreamUpdate(encoder, controller, {
            type: 'status',
            step: 'segments_found',
            message: `✅ Found ${videoSegments.length} relevant segments`,
            progress: 90,
            data: { segmentsCount: videoSegments.length }
          });

          // Step 7: Send final answer
          sendStreamUpdate(encoder, controller, {
            type: 'answer',
            answer: result.answer.trim(),
            thinking: result.thinking,
            segments: videoSegments,
            timeContext: {
              currentTime,
              startTime: Math.max(0, currentTime - timeWindow),
              endTime: currentTime + timeWindow,
              windowSize: timeWindow
            },
            courseInfo: {
              courseName: courseTitle,
              moduleName: moduleTitle,
              lessonName: lessonTitle
            },
            metadata: {
              toolsUsed: result.toolsUsed || [],
              sourcesCount: sources.length,
              videoSegmentsCount: videoSegments.length,
              model: selectedModel,
              aiMode,
              timings: result.timings || {}
            }
          });

          // Save history
          await supabase.from('video_qa_history').insert({
            user_id: userId,
            lesson_id: lesson.id,
            question,
            answer: result.answer,
            video_time: currentTime,
            context_segments: videoSegments.map((s: any) => ({
              start_time: s.startTime,
              end_time: s.endTime,
              text: s.text.substring(0, 200)
            }))
          });

          // Step 8: Complete
          sendStreamUpdate(encoder, controller, {
            type: 'complete',
            message: '✅ Analysis complete!',
            progress: 100
          });

          controller.close();

        } catch (error) {
          debugLog(`❌ Streaming error`, { requestId, error: error instanceof Error ? error.message : 'Unknown' });
          
          sendStreamUpdate(encoder, controller, {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          });
          
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    });

  } catch (error) {
    debugLog(`❌ Request error`, { requestId, error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
