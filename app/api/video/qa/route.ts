import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { getLLM } from '@/lib/langChain/client';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';

// 视频时间轴智能问答API
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) return authResult;
    
    const { payload, user } = authResult;
    const userId = user.profile?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Rate limiting check
    const checkLimit = createRateLimitCheck('videoQA');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId.toString());
    
    if (!allowed) {
      console.log(`⚠️ Rate limit exceeded for user ${userId}`);
      return NextResponse.json(
        rateLimitResponse(resetTime, limit),
        { 
          status: 429,
          headers: rateLimitResponse(resetTime, limit).headers
        }
      );
    }
    
    console.log(`✅ Rate limit OK: ${remaining}/${limit} remaining for user ${userId}`);

    const body = await request.json();
    const {
      lessonId,
      question,
      currentTime, // 当前播放时间（秒）
      timeWindow = 30 // 时间窗口（秒）
    } = body;

    if (!lessonId || !question?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: lessonId, question' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 1. 获取课程信息用于上下文
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

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const courseTitle = (lesson.course as any)?.title || 'Unknown Course';
    const moduleTitle = (lesson.course_module as any)?.title || 'Unknown Module';
    const lessonTitle = lesson.title || 'Unknown Lesson';

    // Check if this is a YouTube/Vimeo video (external video)
    const isExternalVideo = lesson.content_url && 
      (lesson.content_url.includes('youtube.com') || 
       lesson.content_url.includes('youtu.be') ||
       lesson.content_url.includes('vimeo.com'));

    // For YouTube/Vimeo videos, use direct AI without embeddings
    if (isExternalVideo) {
      console.log(`🎬 YouTube/Vimeo video detected - using direct AI without embeddings`);
      
      const courseContext = `课程：${courseTitle}
章节：${moduleTitle}  
课时：${lessonTitle}
视频类型：外部视频 (YouTube/Vimeo)
当前时间：${currentTime}秒`;

      const directQuestion = `${courseContext}

这是一个外部视频课程（YouTube/Vimeo），没有可用的字幕或转写文本。请基于课程标题和上下文，尽力回答学生的问题。

学生问题：${question}

请提供：
1. 基于课程主题的相关解答
2. 如果无法确定具体内容，建议学生查看视频的特定时间段
3. 提供相关的学习建议和资源`;

      const result = await enhancedAIExecutor.educationalQA(directQuestion, {
        userId,
        includeAnalysis: true
      });

      const answer = result.answer;
      
      console.log(`✅ Direct AI answer for external video completed`);

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
    // 2. 从embedding系统检索相关视频片段
    let relevantSegments = [];
    const startTime = Math.max(0, currentTime - timeWindow);
    const endTime = currentTime + timeWindow;

    // 首先尝试从video segments表获取转写片段
    const { data: segments } = await supabase
      .from('video_segments')
      .select('*')
      .eq('lesson_id', lesson.id)
      .gte('start_time', startTime)
      .lte('end_time', endTime)
      .order('start_time');

    if (segments && segments.length > 0) {
      relevantSegments = segments;
    } else if (lesson.transcript) {
      // 如果没有segments，使用完整转写
      relevantSegments = [{
        text: lesson.transcript,
        start_time: 0,
        end_time: currentTime + 60
      }];
    }

    if (relevantSegments.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "抱歉，当前时间点没有可用的视频内容来回答您的问题。请尝试调整播放位置或重新提问。",
        segments: [],
        timeContext: { currentTime, startTime, endTime }
      });
    }

    // 3. 构建上下文信息
    const contextText = relevantSegments
      .map(seg => `[${Math.floor(seg.start_time)}s-${Math.floor(seg.end_time)}s] ${seg.text}`)
      .join('\n');

    const courseContext = `课程：${courseTitle}
章节：${moduleTitle}  
课时：${lessonTitle}`;

    // 4. 使用AI生成答案 (升级版：Tool Calling)
    console.log(`🎓 Video QA with tool calling: "${question.substring(0, 50)}..."`);
    
    const enhancedQuestion = `${courseContext}

Current video time: ${currentTime}s
Video content:
${contextText}

Question: ${question}`;

    const result = await enhancedAIExecutor.educationalQA(enhancedQuestion, {
      userId,
      includeAnalysis: true
    });

    const answer = result.answer;
    const toolsUsed = result.toolsUsed || [];
    
    console.log(`✅ Video QA completed using tools: ${toolsUsed.join(', ')}`);

    // 5. 保存问答记录（可选）
    await supabase
      .from('video_qa_history')
      .insert({
        user_id: userId,
        lesson_id: lesson.id,
        question,
        answer,
        video_time: currentTime,
        context_segments: relevantSegments.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          text: s.text.substring(0, 200)
        }))
      });

    return NextResponse.json({
      success: true,
      answer: answer.trim(),
      segments: relevantSegments.map(seg => ({
        startTime: seg.start_time,
        endTime: seg.end_time,
        text: seg.text,
        relevantText: seg.text.substring(0, 300) + (seg.text.length > 300 ? '...' : '')
      })),
      timeContext: {
        currentTime,
        startTime,
        endTime,
        windowSize: timeWindow
      },
      courseInfo: {
        courseName: courseTitle,
        moduleName: moduleTitle,
        lessonName: lessonTitle
      }
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    });

  } catch (error) {
    console.error('Video QA error:', error);
    return NextResponse.json(
      { error: 'Failed to process video question' },
      { status: 500 }
    );
  }
}

// 获取视频术语解释API
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const currentTime = parseFloat(searchParams.get('currentTime') || '0');
    const timeWindow = parseInt(searchParams.get('timeWindow') || '15');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Missing lessonId parameter' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 获取当前时间窗口的视频片段
    const { data: lesson } = await supabase
      .from('course_lesson')
      .select('id, title')
      .eq('public_id', lessonId)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const startTime = Math.max(0, currentTime - timeWindow);
    const endTime = currentTime + timeWindow;

    const { data: segments } = await supabase
      .from('video_segments')
      .select('*')
      .eq('lesson_id', lesson.id)
      .gte('start_time', startTime)
      .lte('end_time', endTime)
      .order('start_time')
      .limit(3);

    if (!segments || segments.length === 0) {
      return NextResponse.json({
        success: true,
        terms: [],
        suggestions: []
      });
    }

    // 使用AI提取关键术语 (升级版：可选择使用 tool calling)
    const contextText = segments.map(s => s.text).join(' ');
    
    // 简单的术语提取仍然可以使用直接 LLM 调用（快速且成本低）
    // 对于复杂分析可以切换到 tool calling
    const model = await getLLM({ model: process.env.OPEN_ROUTER_MODEL || 'z-ai/glm-4.5-air:free' });

    const prompt = `Extract 3-5 of the most important academic terms or concepts from the following video content and provide brief explanations:

Content: ${contextText}

Requirements:
1. Only extract professional terms, concept nouns, or key technical vocabulary
2. Provide a concise explanation of 20-50 words for each term
3. Return in JSON format: [{"term": "term name", "definition": "explanation", "timestamp": time_point}]
4. If there are no obvious terms in the content, return an empty array

Return the JSON array directly without additional formatting:`;

    const completion = await model.invoke(prompt);
    let terms = [];
    
    try {
      const result = JSON.parse(completion.content as string);
      terms = Array.isArray(result) ? result.slice(0, 5) : [];
    } catch (e) {
      console.error('Failed to parse terms:', e);
      terms = [];
    }

    // 生成学习建议
    const suggestions = [
      {
        type: 'pause_tip',
        title: '暂停学习小贴士',
        content: '可以暂停视频，记录关键概念到笔记中'
      },
      {
        type: 'related_exercise',
        title: '相关练习',
        content: '建议完成本章节的配套练习题'
      }
    ];

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
    console.error('Video terms extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract video terms' },
      { status: 500 }
    );
  }
}
