import { authorize } from '@/utils/auth/server-guard';
import { Liveblocks } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

// 检查环境变量
if (!process.env.LIVEBLOCKS_SECRET_KEY) {
  console.error('❌ LIVEBLOCKS_SECRET_KEY not found in environment variables');
}

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || 'dummy-secret-for-dev',
});

export async function POST(request: NextRequest) {
  try {
    // 首先检查环境变量
    if (!process.env.LIVEBLOCKS_SECRET_KEY) {
      console.error('❌ LIVEBLOCKS_SECRET_KEY not configured');
      return NextResponse.json({ 
        error: 'LIVEBLOCKS_SECRET_KEY not configured',
        details: 'Please set LIVEBLOCKS_SECRET_KEY in your environment variables',
        hint: 'Get your key from https://liveblocks.io/dashboard/apikeys'
      }, { status: 500 });
    }

    if (!process.env.LIVEBLOCKS_SECRET_KEY.startsWith('sk_') && process.env.NODE_ENV !== 'development') {
      console.error('❌ Invalid LIVEBLOCKS_SECRET_KEY format:', process.env.LIVEBLOCKS_SECRET_KEY?.substring(0, 10) + '...');
      return NextResponse.json({ 
        error: 'Invalid LIVEBLOCKS_SECRET_KEY format',
        details: 'LIVEBLOCKS_SECRET_KEY should start with sk_'
      }, { status: 500 });
    }

    // 验证用户身份
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      console.error('❌ Liveblocks auth: User authorization failed');
      return authResult;
    }

    const { user } = authResult;
    
    // 解析请求体
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: 'Please provide valid JSON with room parameter'
      }, { status: 400 });
    }

    const { room } = requestData;
    
    if (!room) {
      return NextResponse.json({ 
        error: 'Missing room parameter',
        details: 'Room ID is required for Liveblocks authentication'
      }, { status: 400 });
    }

    // 解析房间ID获取classroom信息
    // 格式: classroom:slug:type:sessionId 或 classroom:slug:type
    const roomParts = room.split(':');
    if (roomParts.length < 3 || roomParts[0] !== 'classroom') {
      return NextResponse.json({ error: 'Invalid room format' }, { status: 400 });
    }

    const classroomSlug = roomParts[1];
    const roomType = roomParts[2]; // whiteboard, chat, document
    
    // 验证用户是否是该classroom的成员
    const supabase = await createAdminClient();
    
    // 获取用户profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 获取classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', classroomSlug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // 检查用户是否是classroom成员
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied: Not a classroom member' }, { status: 403 });
    }

    // 创建Liveblocks会话
    const session = liveblocks.prepareSession(
      user.id,
      {
        userInfo: {
          name: user.display_name || user.email || 'Unknown User',
          avatar: user.avatar_url || '',
          role: membership.role,
        },
      }
    );

    // 根据用户角色和房间类型分配权限
    const permissions = getRoomPermissions(membership.role, roomType);
    session.allow(room, permissions);

    const { status, body } = await session.authorize();
    return new Response(body, { status });

  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

function getRoomPermissions(role: string, roomType: string) {
  // 根据角色返回权限数组
  if (role === 'tutor') {
    return ['room:read', 'room:presence:write', 'room:write', 'comments:write', 'comments:read'] as const;
  }
  
  // 学生权限
  return ['room:read', 'room:presence:write', 'room:write', 'comments:write', 'comments:read'] as const;
}
