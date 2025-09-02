import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 初始化白板API路由
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

    // 检查是否已存在白板会话
    const { data: existingWhiteboard, error: checkError } = await supabase
      .from('classroom.whiteboard_session')
      .select('id, liveblocks_room_id')
      .eq('session_id', sessionData.id)
      .single();

    // 如果已存在白板会话，直接返回
    if (existingWhiteboard) {
      return NextResponse.json({
        roomId: existingWhiteboard.liveblocks_room_id,
        whiteboardId: existingWhiteboard.id,
      });
    }

    // 创建新的白板会话
    const { data: whiteboardData, error: whiteboardError } = await supabase
      .from('classroom.whiteboard_session')
      .insert({
        session_id: sessionData.id,
        created_by: user.id,
        liveblocks_room_id: id, // 使用会议ID作为Liveblocks房间ID
      })
      .select('id')
      .single();

    if (whiteboardError) {
      console.error('创建白板会话失败:', whiteboardError);
      return NextResponse.json({ error: '创建白板会话失败' }, { status: 500 });
    }

    // 这里可以添加与Liveblocks API的集成，创建实际的Liveblocks房间
    // 但由于Liveblocks会自动创建不存在的房间，所以这一步可以省略

    return NextResponse.json({
      roomId: id,
      whiteboardId: whiteboardData.id,
    });
  } catch (error) {
    console.error('初始化白板失败:', error);
    return NextResponse.json({ error: '初始化白板失败' }, { status: 500 });
  }
}