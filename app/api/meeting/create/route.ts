import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { AccessToken } from '@/lib/stubs/livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';

// 创建会议API路由
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    // 解析请求体
    const { courseId, userId, role } = await req.json();

    // 验证请求参数
    if (!userId || !role) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 生成唯一的会议ID
    const meetingId = uuidv4();

    // 创建LiveKit访问令牌
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit配置缺失' }, { status: 500 });
    }

    // 创建访问令牌，绑定用户角色
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: authResult.payload.name || userId,
    });

    // 设置房间名和TTL（24小时）
    at.addGrant({ roomJoin: true, room: meetingId, canPublish: role === 'teacher', canSubscribe: true });
    const token = at.toJwt();

    // 构建会议URL
    const meetingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/classroom/meeting/${meetingId}?token=${token}`;

    // 在数据库中创建会议记录
    const { data: meetingData, error: meetingError } = await supabase
      .from('classroom.live_session')
      .insert({
        public_id: meetingId,
        course_id: courseId || null,
        title: `会议 ${new Date().toLocaleString()}`,
        host_id: user.id,
        status: 'live',
        starts_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (meetingError) {
      console.error('创建会议记录失败:', meetingError);
      return NextResponse.json({ error: '创建会议记录失败' }, { status: 500 });
    }

    // 创建会议参与者记录
    const { error: participantError } = await supabase
      .from('classroom.session_participant')
      .insert({
        session_id: meetingData.id,
        user_id: user.id,
        role: role,
        joined_at: new Date().toISOString(),
      });

    if (participantError) {
      console.error('创建参与者记录失败:', participantError);
      // 继续执行，不阻止会议创建
    }

    // 创建白板会话
    const { error: whiteboardError } = await supabase
      .from('classroom.whiteboard_session')
      .insert({
        session_id: meetingData.id,
        created_by: user.id,
        liveblocks_room_id: meetingId,
      });

    if (whiteboardError) {
      console.error('创建白板会话失败:', whiteboardError);
      // 继续执行，不阻止会议创建
    }

    return NextResponse.json({
      meetingId,
      meetingUrl,
      role,
      sessionId: meetingData.id,
    });
  } catch (error) {
    console.error('创建会议失败:', error);
    return NextResponse.json({ error: '创建会议失败' }, { status: 500 });
  }
}