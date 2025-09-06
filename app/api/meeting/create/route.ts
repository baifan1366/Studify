import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
// import { AccessToken } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';

// 创建会议API路由
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

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

    // TODO: Implement LiveKit token generation when livekit-server-sdk is available
    // For now, create a placeholder token
    const token = 'placeholder-token';

    // 构建会议URL
    const meetingUrl = `${process.env.SITE_URL}/classroom/meeting/${meetingId}?token=${token}`;

    // 在数据库中创建会议记录
    const { data: meetingData, error: meetingError } = await supabase
      .from('classroom.live_session')
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
      .from('classroom.session_participant')
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
      .from('classroom.whiteboard_session')
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