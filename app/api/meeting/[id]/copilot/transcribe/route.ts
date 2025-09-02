import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 实时语音转文字API路由
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证用户身份
    const user = await authorize();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = params;
    const { audioData, language = 'zh' } = await req.json();

    // 验证请求参数
    if (!audioData) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 获取会议信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('classroom.live_session')
      .select('id, status')
      .eq('public_id', id)
      .single();

    if (sessionError) {
      console.error('获取会议信息失败:', sessionError);
      return NextResponse.json({ error: '获取会议信息失败' }, { status: 500 });
    }

    // 检查会议是否已结束
    if (sessionData.status === 'ended') {
      return NextResponse.json({ error: '会议已结束' }, { status: 400 });
    }

    // 调用Whisper API进行语音转文字
    // 这里是一个简化的示例，实际实现中需要调用OpenAI Whisper API或其他语音识别服务
    // 由于涉及到第三方API调用，这里只提供一个框架

    // 模拟转录结果
    const transcription = "这是一个模拟的转录结果";

    // 保存转录结果到数据库
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('classroom.transcription')
      .insert({
        session_id: sessionData.id,
        user_id: user.id,
        content: transcription,
        language: language,
        timestamp: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (transcriptError) {
      console.error('保存转录结果失败:', transcriptError);
      return NextResponse.json({ error: '保存转录结果失败' }, { status: 500 });
    }

    // 同时作为聊天消息发送
    const { error: chatError } = await supabase
      .from('classroom.chat_message')
      .insert({
        session_id: sessionData.id,
        sender_id: user.id,
        message_type: 'transcription',
        content: transcription,
        sent_at: new Date().toISOString(),
        metadata: { transcription_id: transcriptData.id },
      });

    if (chatError) {
      console.error('创建聊天消息失败:', chatError);
      // 继续执行，不阻止返回转录结果
    }

    return NextResponse.json({
      transcription,
      transcriptionId: transcriptData.id,
    });
  } catch (error) {
    console.error('语音转文字失败:', error);
    return NextResponse.json({ error: '语音转文字失败' }, { status: 500 });
  }
}