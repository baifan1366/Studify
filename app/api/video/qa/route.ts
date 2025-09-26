import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { getLLM } from '@/lib/langChain/client';

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

    const courseTitle = (lesson.course as any)?.title || 'Unknown Course';
    const moduleTitle = (lesson.course_module as any)?.title || 'Unknown Module';
    const lessonTitle = lesson.title || 'Unknown Lesson';

    const courseContext = `课程：${courseTitle}
章节：${moduleTitle}  
课时：${lessonTitle}`;

    // 4. 使用AI生成答案
    const model = await getLLM({ model: 'x-ai/grok-beta' });
    
    const prompt = `你是一个智能视频学习助手。用户正在观看教育视频，在特定时间点提出了问题。

${courseContext}

当前播放时间：${currentTime}秒
相关视频内容：
${contextText}

用户问题：${question}

请基于视频内容回答用户的问题，要求：
1. 答案要简洁明了，直接回答问题
2. 如果视频内容中有相关信息，请引用具体时间点
3. 如果问题超出视频内容范围，请说明并提供学习建议
4. 保持友好和鼓励的语调
5. 答案控制在200字以内

请直接返回答案，不需要额外格式。`;

    const completion = await model.invoke(prompt);
    const answer = completion.content as string;

    // 5. 保存问答记录（可选）
    await supabase
      .from('video_qa_history')
      .insert({
        user_id: userId,
        lesson_id: lesson.id,
        question,
        answer,
        current_time: currentTime,
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

    // 使用AI提取关键术语
    const model = await getLLM({ model: 'x-ai/grok-beta' });
    const contextText = segments.map(s => s.text).join(' ');

    const prompt = `请从以下视频内容中提取3-5个最重要的学术术语或概念，并给出简短解释：

内容：${contextText}

要求：
1. 只提取专业术语、概念名词或关键技术词汇
2. 每个术语提供20-50字的简洁解释
3. 返回JSON格式：[{"term": "术语", "definition": "解释", "timestamp": 时间点}]
4. 如果内容中没有明显术语，返回空数组

直接返回JSON数组，不要其他格式：`;

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
