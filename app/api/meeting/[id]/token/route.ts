import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { AccessToken } from 'livekit-server-sdk';

// 生成LiveKit访问令牌API路由
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const { id } = params;
    const { userId, role } = await req.json();

    // 验证请求参数
    if (!userId || !role) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 获取会议信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('live_session')
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

    // 创建LiveKit访问令牌
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit配置缺失' }, { status: 500 });
    }

    // 创建访问令牌，绑定用户角色
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: user.name || userId,
    });

    // 设置房间名和权限（基于角色）
    at.addGrant({
      roomJoin: true,
      room: id,
      canPublish: role === 'teacher', // 教师可以发布音视频
      canSubscribe: true, // 所有人都可以订阅
      canPublishData: true, // 所有人都可以发送数据消息
    });

    const token = at.toJwt();

    // 记录参与者加入
    const { error: participantError } = await supabase
      .from('session_participant')
      .upsert({
        session_id: sessionData.id,
        user_id: user.id,
        role: role,
        joined_at: new Date().toISOString(),
      });

    if (participantError) {
      console.error('记录参与者加入失败:', participantError);
      // 继续执行，不阻止生成令牌
    }

    return NextResponse.json({
      token,
      userId,
      role,
    });
  } catch (error) {
    console.error('生成访问令牌失败:', error);
    return NextResponse.json({ error: '生成访问令牌失败' }, { status: 500 });
  }
}