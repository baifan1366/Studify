import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 自动生成章节时间戳API路由
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证用户身份
    const user = await authorize();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = params;

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 获取会议信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('classroom.live_session')
      .select('id, title')
      .eq('public_id', id)
      .single();

    if (sessionError) {
      console.error('获取会议信息失败:', sessionError);
      return NextResponse.json({ error: '获取会议信息失败' }, { status: 500 });
    }

    // 获取会议转录记录
    const { data: transcriptions, error: transcriptError } = await supabase
      .from('classroom.transcription')
      .select('content, timestamp, user_id')
      .eq('session_id', sessionData.id)
      .order('timestamp', { ascending: true });

    if (transcriptError) {
      console.error('获取会议转录记录失败:', transcriptError);
      return NextResponse.json({ error: '获取会议转录记录失败' }, { status: 500 });
    }

    // 如果没有转录记录，返回错误
    if (!transcriptions || transcriptions.length === 0) {
      return NextResponse.json({ error: '没有可用的会议转录记录' }, { status: 400 });
    }

    // 调用LLM生成章节时间戳
    // 这里是一个简化的示例，实际实现中需要调用OpenAI API或其他LLM服务
    // 由于涉及到第三方API调用，这里只提供一个框架

    // 模拟章节时间戳结果
    const chapters = [
      {
        title: '开场介绍',
        timestamp: transcriptions[0].timestamp,
        duration: 120, // 秒
      },
      {
        title: '主题讨论',
        timestamp: new Date(new Date(transcriptions[0].timestamp).getTime() + 120000).toISOString(),
        duration: 300, // 秒
      },
      {
        title: '问答环节',
        timestamp: new Date(new Date(transcriptions[0].timestamp).getTime() + 420000).toISOString(),
        duration: 180, // 秒
      },
      {
        title: '总结与展望',
        timestamp: new Date(new Date(transcriptions[0].timestamp).getTime() + 600000).toISOString(),
        duration: 120, // 秒
      },
    ];

    // 保存章节时间戳到数据库
    const { data: chaptersData, error: chaptersError } = await supabase
      .from('classroom.meeting_chapters')
      .insert({
        session_id: sessionData.id,
        chapters: chapters,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (chaptersError) {
      console.error('保存章节时间戳失败:', chaptersError);
      return NextResponse.json({ error: '保存章节时间戳失败' }, { status: 500 });
    }

    return NextResponse.json({
      chapters,
      chaptersId: chaptersData.id,
    });
  } catch (error) {
    console.error('生成章节时间戳失败:', error);
    return NextResponse.json({ error: '生成章节时间戳失败' }, { status: 500 });
  }
}