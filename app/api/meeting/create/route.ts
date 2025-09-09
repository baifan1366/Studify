import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
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

    // 验证LiveKit配置
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_WS_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('LiveKit配置缺失:', { apiKey: !!apiKey, apiSecret: !!apiSecret, wsUrl: !!wsUrl });
      return NextResponse.json({ error: 'LiveKit配置缺失' }, { status: 500 });
    }

    // 初始化LiveKit Room Service客户端
    const roomService = new RoomServiceClient(wsUrl, apiKey, apiSecret);

    // 创建或获取房间
    try {
      await roomService.createRoom({
        name: meetingId,
        emptyTimeout: 10 * 60, // 10分钟空房间超时
        maxParticipants: 50,
      });
    } catch (error: any) {
      // 如果房间已存在，继续执行
      if (!error.message?.includes('already exists')) {
        console.error('创建LiveKit房间失败:', error);
        return NextResponse.json({ error: '创建会议房间失败' }, { status: 500 });
      }
    }

    // 创建访问令牌
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: user.user?.user_metadata?.full_name || user.user?.email || userId,
    });

    // 根据角色设置权限
    const canPublish = role === 'teacher' || role === 'tutor';
    const canPublishData = true;
    
    at.addGrant({
      roomJoin: true,
      room: meetingId,
      canPublish,
      canPublishData,
      canSubscribe: true,
    });

    // 设置令牌有效期（24小时）
    at.ttl = '24h';
    const token = await at.toJwt();

    // 构建会议URL
    const meetingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL}/classroom/meeting/${meetingId}?token=${encodeURIComponent(token)}`;

    // 在数据库中创建会议记录
    const { data: meetingData, error: meetingError } = await supabase
      .from('live_session')
      .insert({
        public_id: meetingId,
        course_id: courseId || null,
        title: `会议 ${new Date().toLocaleString()}`,
        host_id: authResult.user.id,
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
      .from('session_participant')
      .insert({
        session_id: meetingData.id,
        user_id: authResult.user.id,
        role: role,
        joined_at: new Date().toISOString(),
      });

    if (participantError) {
      console.error('创建参与者记录失败:', participantError);
      // 继续执行，不阻止会议创建
    }

    // 创建白板会话
    const { error: whiteboardError } = await supabase
      .from('whiteboard_session')
      .insert({
        session_id: meetingData.id,
        created_by: authResult.user.id,
        liveblocks_room_id: meetingId,
      });

    if (whiteboardError) {
      console.error('创建白板会话失败:', whiteboardError);
      // 继续执行，不阻止会议创建
    }

    return NextResponse.json({
      success: true,
      meetingId,
      meetingUrl,
      token,
      wsUrl,
      role,
      sessionId: meetingData.id,
      roomName: meetingId,
    });
  } catch (error) {
    console.error('创建会议失败:', error);
    return NextResponse.json({ error: '创建会议失败' }, { status: 500 });
  }
}