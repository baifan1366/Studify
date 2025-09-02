import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getAuthUser } from '@/lib/auth';

// 结束会议API路由
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证用户身份
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = params;

    // 初始化Supabase客户端
    const supabase = createSupabaseServerClient();

    // 获取会议信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('classroom.live_session')
      .select('id, host_id')
      .eq('public_id', id)
      .single();

    if (sessionError) {
      console.error('获取会议信息失败:', sessionError);
      return NextResponse.json({ error: '获取会议信息失败' }, { status: 500 });
    }

    // 验证用户是否为会议主持人
    if (sessionData.host_id !== user.id && user.role !== 'teacher') {
      return NextResponse.json({ error: '只有会议主持人或教师可以结束会议' }, { status: 403 });
    }

    // 更新会议状态为已结束
    const { error: updateError } = await supabase
      .from('classroom.live_session')
      .update({
        status: 'ended',
        ends_at: new Date().toISOString(),
      })
      .eq('id', sessionData.id);

    if (updateError) {
      console.error('更新会议状态失败:', updateError);
      return NextResponse.json({ error: '更新会议状态失败' }, { status: 500 });
    }

    // 更新所有参与者的离开时间
    const { error: participantError } = await supabase
      .from('classroom.session_participant')
      .update({
        left_at: new Date().toISOString(),
      })
      .eq('session_id', sessionData.id)
      .is('left_at', null);

    if (participantError) {
      console.error('更新参与者状态失败:', participantError);
      // 继续执行，不阻止会议结束
    }

    // 清理LiveKit房间（这里需要调用LiveKit API）
    // 实际实现中，可能需要使用LiveKit Server SDK来删除房间
    // 或者依赖LiveKit的自动房间清理机制

    return NextResponse.json({
      success: true,
      message: '会议已成功结束',
    });
  } catch (error) {
    console.error('结束会议失败:', error);
    return NextResponse.json({ error: '结束会议失败' }, { status: 500 });
  }
}