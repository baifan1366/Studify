import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 生成会议纪要API路由
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

    // 获取聊天记录
    const { data: chatMessages, error: chatError } = await supabase
      .from('classroom.chat_message')
      .select('content, sent_at, sender_id, message_type')
      .eq('session_id', sessionData.id)
      .eq('message_type', 'text') // 只获取文本消息
      .order('sent_at', { ascending: true });

    if (chatError) {
      console.error('获取聊天记录失败:', chatError);
      // 继续执行，不阻止生成摘要
    }

    // 合并转录和聊天记录作为摘要输入
    const transcriptionText = transcriptions
      .map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.content}`)
      .join('\n');

    const chatText = chatMessages
      ? chatMessages
          .map(m => `[${new Date(m.sent_at).toLocaleTimeString()}] ${m.content}`)
          .join('\n')
      : '';

    // 调用LLM生成摘要
    // 这里是一个简化的示例，实际实现中需要调用OpenAI API或其他LLM服务
    // 由于涉及到第三方API调用，这里只提供一个框架

    // 模拟摘要结果
    const summary = `这是一个关于"${sessionData.title}"会议的模拟摘要。\n\n主要讨论了以下几点：\n1. 项目进度回顾\n2. 技术难点分析\n3. 下一步计划`;

    // 保存摘要结果到数据库
    const { data: summaryData, error: summaryError } = await supabase
      .from('classroom.meeting_summary')
      .insert({
        session_id: sessionData.id,
        content: summary,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (summaryError) {
      console.error('保存摘要结果失败:', summaryError);
      return NextResponse.json({ error: '保存摘要结果失败' }, { status: 500 });
    }

    return NextResponse.json({
      summary,
      summaryId: summaryData.id,
    });
  } catch (error) {
    console.error('生成会议纪要失败:', error);
    return NextResponse.json({ error: '生成会议纪要失败' }, { status: 500 });
  }
}