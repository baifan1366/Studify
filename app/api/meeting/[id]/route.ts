import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 获取会议信息API路由
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
      .select(`
        *,
        host:host_id(id, name, avatar_url),
        participants:classroom.session_participant(user_id, role, joined_at, left_at)
      `)
      .eq('public_id', id)
      .single();

    if (sessionError) {
      console.error('获取会议信息失败:', sessionError);
      return NextResponse.json({ error: '获取会议信息失败' }, { status: 500 });
    }

    // 获取白板会话信息
    const { data: whiteboardData, error: whiteboardError } = await supabase
      .from('classroom.whiteboard_session')
      .select('*')
      .eq('session_id', sessionData.id)
      .single();

    if (whiteboardError && whiteboardError.code !== 'PGRST116') { // PGRST116 是未找到记录的错误码
      console.error('获取白板会话信息失败:', whiteboardError);
      // 继续执行，不阻止获取会议信息
    }

    // 获取AI Copilot状态
    const { data: aiCopilotData, error: aiCopilotError } = await supabase
      .from('classroom.ai_copilot')
      .select('*')
      .eq('session_id', sessionData.id)
      .single();

    if (aiCopilotError && aiCopilotError.code !== 'PGRST116') {
      console.error('获取AI Copilot状态失败:', aiCopilotError);
      // 继续执行，不阻止获取会议信息
    }

    return NextResponse.json({
      session: sessionData,
      whiteboard: whiteboardData || null,
      aiCopilot: aiCopilotData || null,
    });
  } catch (error) {
    console.error('获取会议信息失败:', error);
    return NextResponse.json({ error: '获取会议信息失败' }, { status: 500 });
  }
}