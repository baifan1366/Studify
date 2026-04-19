import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { getLLM } from '@/lib/langChain/client';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';

// Set max duration to 5 minutes (300 seconds) - Vercel's maximum
export const maxDuration = 300;

// Debug logger - works in both development and production
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[video-qa][${timestamp}]`;
  
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
    // Normal mode: use THINKING model but without thinking process display
    return process.env.OPENROUTER_MODEL_NORMAL || process.env.OPENROUTER_MODEL_THINKING || 'deepseek/deepseek-r1';
  }
}

// Video Timeline Intelligent Q&A API
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  debugLog(`📥 Incoming request`, { requestId });
  
  try {
    debugLog(`🔐 Starting authorization`, { requestId });
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      debugLog(`❌ Authorization failed`, { requestId });
      return authResult;
    }
    
    const { user } = authResult;
    const userId = user.profile?.id;
    
    if (!userId) {
      debugLog(`❌ Profile not found`, { requestId });
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    debugLog(`✅ User authorized`, { requestId, userId });

    // Rate limiting check
    const checkLimit = createRateLimitCheck('videoQA');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId.toString());
    
    if (!allowed) {
      debugLog(`⚠️ Rate limit exceeded`, { requestId, userId, limit, resetTime });
      return NextResponse.json(
        rateLimitResponse(resetTime, limit),
        { 
          status: 429,
          headers: rateLimitResponse(resetTime, limit).headers
        }
      );
    }
    
    debugLog(`✅ Rate limit OK`, { requestId, remaining, limit });

    const body = await request.json();
    const {
      lessonId,
      question,
      currentTime, // Current playback time (seconds)
      timeWindow = 30, // Time window (seconds)
      aiMode = 'normal', // AI mode selection (fast, normal, thinking)
      clientEmbedding // Client-generated embedding (Fast mode only)
    } = body;

    debugLog(`📝 Request parameters`, { 
      requestId, 
      lessonId, 
      questionLength: question?.length,
      currentTime, 
      timeWindow, 
      aiMode,
      hasClientEmbedding: !!clientEmbedding 
    });

    if (!lessonId || !question?.trim()) {
      debugLog(`❌ Missing required fields`, { requestId, lessonId, hasQuestion: !!question });
      return NextResponse.json(
        { error: 'Missing required fields: lessonId, question' },
        { status: 400 }
      );
    }

    const selectedModel = getModel(aiMode as 'fast' | 'normal' | 'thinking');
    debugLog(`🤖 Model selection`, { 
      requestId, 
      selectedModel, 
      aiMode, 
      hasClientEmbedding: !!clientEmbedding 
    });

    const supabase = await createAdminClient();

    // 1. Fetch course information for context
    debugLog(`🔍 Fetching lesson data`, { requestId, lessonId });
    const lessonQueryStart = Date.now();
    
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select(`
        id,
        title,
        transcript,
        content_url,
        course_module:module_id(
          title
        ),
        course:course_id(
          title,
          description
        )
      `)
      .eq('public_id', lessonId)
      .single();

    const lessonQueryTime = Date.now() - lessonQueryStart;
    debugLog(`⏱️ Lesson query completed`, { requestId, duration: lessonQueryTime });

    if (lessonError || !lesson) {
      debugLog(`❌ Lesson not found`, { requestId, lessonId, error: lessonError });
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const courseTitle = (lesson.course as any)?.title || 'Unknown Course';
    const moduleTitle = (lesson.course_module as any)?.title || 'Unknown Module';
    const lessonTitle = lesson.title || 'Unknown Lesson';

    debugLog(`📚 Course context`, { 
      requestId, 
      courseTitle, 
      moduleTitle, 
      lessonTitle,
      hasTranscript: !!lesson.transcript,
      contentUrl: lesson.content_url 
    });

    // Check if this is a YouTube/Vimeo video (external video)
    const isExternalVideo = lesson.content_url && 
      (lesson.content_url.includes('youtube.com') || 
       lesson.content_url.includes('youtu.be') ||
       lesson.content_url.includes('vimeo.com'));

    // For YouTube/Vimeo videos, use direct AI without embeddings
    if (isExternalVideo) {
      debugLog(`🎬 External video detected`, { requestId, contentUrl: lesson.content_url });
      
      const courseContext = `Course: ${courseTitle}
Module: ${moduleTitle}  
Lesson: ${lessonTitle}
Video Type: External Video (YouTube/Vimeo)
Current Time: ${currentTime} seconds`;

      const directQuestion = `${courseContext}

This is an external video course (YouTube/Vimeo) without available subtitles or transcripts. Please answer the student's question based on the course title and context to the best of your ability.

Student Question: ${question}

Please provide:
1. Relevant answers based on the course topic
2. If specific content cannot be determined, suggest the student review specific time segments of the video
3. Provide relevant learning suggestions and resources`;

      debugLog(`🚀 Starting direct AI for external video`, { requestId });
      const aiStart = Date.now();
      
      const result = await enhancedAIExecutor.educationalQA(directQuestion, {
        userId,
        includeAnalysis: true,
        model: selectedModel
      });

      const aiTime = Date.now() - aiStart;
      const answer = result.answer;
      
      debugLog(`✅ Direct AI completed`, { 
        requestId, 
        duration: aiTime,
        answerLength: answer.length 
      });

      // Save QA history
      await supabase
        .from('video_qa_history')
        .insert({
          user_id: userId,
          lesson_id: lesson.id,
          question,
          answer,
          video_time: currentTime,
          context_segments: null // No segments for external videos
        });

      debugLog(`💾 QA history saved`, { requestId });

      return NextResponse.json({
        success: true,
        answer: answer.trim(),
        isExternalVideo: true,
        segments: [],
        timeContext: {
          currentTime,
          startTime: 0,
          endTime: 0,
          windowSize: 0
        },
        courseInfo: {
          courseName: courseTitle,
          moduleName: moduleTitle,
          lessonName: lessonTitle
        },
        metadata: {
          model: selectedModel,
          aiMode,
          timings: {
            lessonQuery: lessonQueryTime,
            ai: aiTime,
            total: Date.now() - lessonQueryStart
          }
        },
        note: "This is an external video (YouTube/Vimeo). The AI assistant provides general guidance based on course context."
      }, {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString()
        }
      });
    }

    // For regular videos with embeddings/transcripts
    debugLog(`🔍 Fetching attachment data`, { requestId });
    const dbStartTime = Date.now();
    
    // 2. Get attachment ID for video search
    const { data: lessonWithAttachment } = await supabase
      .from('course_lesson')
      .select(`
        id,
        course_attachments!inner(id, file_type)
      `)
      .eq('id', lesson.id)
      .eq('course_attachments.file_type', 'video')
      .single();
    
    const attachmentId = lessonWithAttachment?.course_attachments?.[0]?.id;
    const dbTime = Date.now() - dbStartTime;
    
    debugLog(`✅ Attachment query completed`, { 
      requestId, 
      duration: dbTime,
      attachmentId,
      hasAttachment: !!attachmentId 
    });
    
    const courseContext = `Course: ${courseTitle}
Module: ${moduleTitle}  
Lesson: ${lessonTitle}
Current Playback Time: ${currentTime} seconds`;

    // Build enhanced question with JSON-formatted search parameters
    const enhancedQuestion = `${courseContext}

The student asked the following question while watching the video:
${question}

Please use the search tool to find relevant content. Use the following parameters when searching:
{
  "query": "${question.replace(/"/g, '\\"')}",
  "contentTypes": ["video_segment", "lesson", "note"],
  "videoContext": {
    "lessonId": "${lessonId}",
    "attachmentId": ${attachmentId || 'null'},
    "currentTime": ${currentTime}
  }
}

Please provide a detailed answer based on the search results (especially video segments). If relevant video segments are found, cite their timestamps.`;

    // Using Tool Calling system, which will automatically:
    // 1. Use search tool for semantic search (including video_segment type)
    // 2. Use answer_question tool to generate answer
    // Add timeout to prevent long-running requests (4.5 minutes to stay under 5 min limit)
    debugLog(`🚀 Starting educationalQA with 270s timeout`, { requestId });
    const qaStartTime = Date.now();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => {
        debugLog(`⏰ Video QA timeout`, { requestId, duration: 270000 });
        reject(new Error('Video QA timeout after 270 seconds'));
      }, 270000)
    );
    
    const result = await Promise.race([
      enhancedAIExecutor.educationalQA(enhancedQuestion, {
        userId,
        includeAnalysis: true,
        contentTypes: ['video_segment', 'lesson', 'note'], // Prioritize video segments
        model: selectedModel,
        videoContext: {
          lessonId,
          attachmentId,
          currentTime
        },
        clientEmbedding, // Pass client embedding for Fast/Thinking mode
        aiMode: aiMode as 'fast' | 'normal' | 'thinking', // Pass AI mode for search strategy
      }),
      timeoutPromise
    ]) as any;

    const qaTime = Date.now() - qaStartTime;
    debugLog(`✅ educationalQA completed`, { requestId, duration: qaTime });

    const answer = result.answer;
    const toolsUsed = result.toolsUsed || [];
    const sources = result.sources || [];
    const timings = result.timings || {};
    
    debugLog(`📊 QA results`, { 
      requestId,
      toolsUsed,
      sourcesCount: sources.length,
      answerLength: answer.length,
      hasThinking: !!result.thinking
    });

    // Extract video segment information from sources
    // Prioritize segment data from video_embeddings
    debugLog(`📊 Processing sources for video segments`, { requestId, sourcesCount: sources.length });
    
    const videoSegments = sources
      .filter((source: any) => {
        const isVideoSegment = source.type === 'video_segment' || source.content_type === 'video_segment';
        if (isVideoSegment) {
          debugLog(`✅ Found video segment`, {
            requestId,
            type: source.type || source.content_type,
            startTime: source.segment_start_time,
            endTime: source.segment_end_time,
            hasText: !!source.content_text
          });
        }
        return isVideoSegment;
      })
      .map((source: any) => {
        // Extract time information from source - supports multiple field names
        const startTime = source.segment_start_time || source.startTime || source.timestamp || 0;
        const endTime = source.segment_end_time || source.endTime || (startTime + 30);
        const text = source.content_text || source.content || source.contentPreview || '';
        
        debugLog(`📝 Mapped segment`, {
          requestId,
          startTime: Math.floor(startTime),
          endTime: Math.floor(endTime),
          textLength: text.length
        });
        
        return {
          startTime: Math.floor(startTime),
          endTime: Math.floor(endTime),
          text: text,
          relevantText: text.substring(0, 300) + (text.length > 300 ? '...' : '')
        };
      })
      .filter((seg: any) => seg.startTime >= 0 && seg.text.length > 0); // Filter invalid data
    
    debugLog(`✅ Extracted video segments`, { requestId, count: videoSegments.length });

    // 5. Save Q&A history (optional)
    await supabase
      .from('video_qa_history')
      .insert({
        user_id: userId,
        lesson_id: lesson.id,
        question,
        answer,
        video_time: currentTime,
        context_segments: videoSegments.map((s: any) => ({
          start_time: s.startTime,
          end_time: s.endTime,
          text: s.text.substring(0, 200)
        }))
      });

    debugLog(`💾 QA history saved`, { requestId });

    const totalTime = Date.now() - lessonQueryStart;
    debugLog(`✅ Request completed successfully`, { 
      requestId, 
      totalDuration: totalTime,
      breakdown: {
        lessonQuery: lessonQueryTime,
        attachmentQuery: dbTime,
        qa: qaTime,
        ...timings
      }
    });

    return NextResponse.json({
      success: true,
      answer: answer.trim(),
      thinking: result.thinking, // Include thinking process if available
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
        toolsUsed,
        sourcesCount: sources.length,
        videoSegmentsCount: videoSegments.length,
        model: selectedModel,
        aiMode,
        timings: {
          lessonQuery: lessonQueryTime,
          attachmentQuery: dbTime,
          qa: qaTime,
          total: totalTime,
          ...timings
        }
      }
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    });

  } catch (error) {
    debugLog(`❌ Video QA error`, { requestId, error: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Video QA error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide more specific error messages
    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          message: 'The video QA request took too long. Please try asking a more specific question.'
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process video question',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

// Get Video Term Explanation API
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  debugLog(`📥 GET request for video terms`, { requestId });
  
  try {
    debugLog(`🔐 Starting authorization`, { requestId });
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      debugLog(`❌ Authorization failed`, { requestId });
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const currentTime = parseFloat(searchParams.get('currentTime') || '0');
    const timeWindow = parseInt(searchParams.get('timeWindow') || '15');

    debugLog(`📝 GET parameters`, { requestId, lessonId, currentTime, timeWindow });

    if (!lessonId) {
      debugLog(`❌ Missing lessonId`, { requestId });
      return NextResponse.json(
        { error: 'Missing lessonId parameter' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get video segments within current time window
    debugLog(`🔍 Fetching lesson`, { requestId, lessonId });
    const { data: lesson } = await supabase
      .from('course_lesson')
      .select('id, title')
      .eq('public_id', lessonId)
      .single();

    if (!lesson) {
      debugLog(`❌ Lesson not found`, { requestId, lessonId });
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const startTime = Math.max(0, currentTime - timeWindow);
    const endTime = currentTime + timeWindow;

    debugLog(`🔍 Fetching video segments`, { 
      requestId, 
      lessonId: lesson.id, 
      timeRange: { startTime, endTime } 
    });

    const { data: segments } = await supabase
      .from('video_segments')
      .select('*')
      .eq('lesson_id', lesson.id)
      .gte('start_time', startTime)
      .lte('end_time', endTime)
      .order('start_time')
      .limit(3);

    if (!segments || segments.length === 0) {
      debugLog(`⚠️ No segments found`, { requestId, timeRange: { startTime, endTime } });
      return NextResponse.json({
        success: true,
        terms: [],
        suggestions: []
      });
    }

    debugLog(`✅ Found segments`, { requestId, count: segments.length });

    // Use AI to extract key terms (using Gemma 4 Fast mode)
    const contextText = segments.map(s => s.text).join(' ');
    
    debugLog(`🤖 Extracting terms with Fast mode`, { 
      requestId, 
      contextLength: contextText.length 
    });
    
    // Use Gemma 4 Fast mode for quick term extraction
    const model = await getLLM({ 
      model: getModel('fast') // Use Fast mode
    });

    const prompt = `Extract 3-5 of the most important academic terms or concepts from the following video content and provide brief explanations:

Content: ${contextText}

Requirements:
1. Only extract professional terms, concept nouns, or key technical vocabulary
2. Provide a concise explanation of 20-50 words for each term
3. Return in JSON format: [{"term": "term name", "definition": "explanation", "timestamp": time_point}]
4. If there are no obvious terms in the content, return an empty array

Return the JSON array directly without additional formatting:`;

    // Add timeout for LLM call (60 seconds)
    const llmStart = Date.now();
    const llmTimeout = new Promise((_, reject) => 
      setTimeout(() => {
        debugLog(`⏰ LLM timeout`, { requestId, duration: 60000 });
        reject(new Error('LLM timeout'));
      }, 60000)
    );
    
    const completion = await Promise.race([
      model.invoke(prompt),
      llmTimeout
    ]) as any;
    
    const llmTime = Date.now() - llmStart;
    debugLog(`✅ LLM completed`, { requestId, duration: llmTime });
    
    let terms = [];
    
    try {
      const result = JSON.parse(completion.content as string);
      terms = Array.isArray(result) ? result.slice(0, 5) : [];
      debugLog(`✅ Parsed terms`, { requestId, count: terms.length });
    } catch (e) {
      debugLog(`❌ Failed to parse terms`, { requestId, error: e instanceof Error ? e.message : 'Unknown' });
      terms = [];
    }

    // Generate learning suggestions
    const suggestions = [
      {
        type: 'pause_tip',
        title: 'Pause Learning Tip',
        content: 'You can pause the video and record key concepts in your notes'
      },
      {
        type: 'related_exercise',
        title: 'Related Exercises',
        content: 'It is recommended to complete the supporting exercises for this chapter'
      }
    ];

    debugLog(`✅ GET request completed`, { requestId, termsCount: terms.length });

    return NextResponse.json({
      success: true,
      terms: terms.map(term => ({
        ...term,
        timestamp: currentTime,
        segment: segments.find(s => s.text.includes(term.term))?.start_time || currentTime
      })),
      suggestions,
      timeContext: {
        currentTime,
        startTime,
        endTime
      }
    });

  } catch (error) {
    debugLog(`❌ Video terms extraction error`, { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    console.error('Video terms extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide graceful fallback for timeout
    if (errorMessage.includes('timeout')) {
      return NextResponse.json({
        success: true,
        terms: [],
        suggestions: [],
        note: 'Term extraction timed out. Please try again.'
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to extract video terms',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
