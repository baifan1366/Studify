// app/api/classroom/[slug]/live-sessions/[sessionId]/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { liveKitTokenService } from '@/lib/livekit/token-service';
import redis from '@/utils/redis/redis';

interface TokenRequestBody {
  participantName?: string;
  metadata?: string;
}

/**
 * 生成 LiveKit 访问令牌
 * POST /api/classroom/[slug]/live-sessions/[sessionId]/token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string }> }
) {
  try {
    const { slug, sessionId } = await params;
    
    // 验证用户身份（学生和导师都可以加入）
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      // 尝试导师权限
      const tutorAuthResult = await authorize('tutor');
      if (tutorAuthResult instanceof NextResponse) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      // 使用导师权限结果
      const tutorAuth = tutorAuthResult;
      return await generateToken(request, slug, sessionId, tutorAuth, 'host');
    }
    
    // 使用学生权限结果
    return await generateToken(request, slug, sessionId, authResult, 'participant');
    
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateToken(
  request: NextRequest,
  slug: string,
  sessionId: string,
  authResult: any,
  defaultRole: 'host' | 'participant'
) {
  const supabase = await createAdminClient();
  const userId = authResult.payload.sub;
  
  // 解析请求体
  let body: TokenRequestBody = {};
  try {
    body = await request.json();
  } catch {
    // 请求体为空或无效，使用默认值
  }

  // 获取用户 profile ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { message: 'User profile not found' },
      { status: 404 }
    );
  }

  // 验证教室权限
  const { data: classroom, error: classroomError } = await supabase
    .from('classroom')
    .select(`
      id,
      name,
      classroom_member!classroom_member_classroom_id_fkey!inner(user_id, role)
    `)
    .eq('slug', slug)
    .eq('classroom_member.user_id', profile.id)
    .single();

  if (classroomError || !classroom) {
    return NextResponse.json(
      { message: 'Classroom not found or access denied' },
      { status: 404 }
    );
  }

  // 验证直播会话
  console.log('🔍 [Token API] Looking for session:', {
    sessionId,
    parsedSessionId: parseInt(sessionId),
    classroomId: classroom.id,
    classroomSlug: slug
  });

  // Try to find session by ID first, then by slug/public_id if numeric fails
  let liveSession = null;
  let sessionError = null;

  // First try numeric ID
  if (!isNaN(parseInt(sessionId))) {
    const result = await supabase
      .from('classroom_live_session')
      .select('*')
      .eq('id', parseInt(sessionId))
      .eq('classroom_id', classroom.id)
      .single();
    
    liveSession = result.data;
    sessionError = result.error;
  }

  // If numeric ID fails, try slug or public_id
  if (!liveSession && sessionError) {
    console.log('🔄 [Token API] Numeric ID failed, trying slug/public_id');
    const result = await supabase
      .from('classroom_live_session')
      .select('*')
      .eq('classroom_id', classroom.id)
      .or(`slug.eq.${sessionId},public_id.eq.${sessionId}`)
      .single();
    
    liveSession = result.data;
    sessionError = result.error;
  }

  console.log('📊 [Token API] Session query result:', {
    liveSession,
    sessionError,
    errorMessage: sessionError?.message,
    errorDetails: sessionError?.details
  });

  if (sessionError || !liveSession) {
    return NextResponse.json(
      { message: 'Live session not found' },
      { status: 404 }
    );
  }

  // 检查会话状态 - Allow 'live' status as well for debugging
  if (liveSession.status !== 'active' && liveSession.status !== 'scheduled' && liveSession.status !== 'live') {
    return NextResponse.json(
      { message: 'Live session is not available' },
      { status: 400 }
    );
  }

  // 确定用户角色
  const memberRole = classroom.classroom_member[0]?.role;
  const isHost = memberRole === 'tutor' || liveSession.host_id === profile.id;
  const role = isHost ? 'host' : 'participant';

  // 生成房间名称（使用会话的 slug 或 ID）
  const roomName = liveSession.slug || `session-${sessionId}`;
  
  // 参与者身份和名称
  const participantIdentity = `user-${profile.id}`;
  const participantName = body.participantName || profile.display_name || `User ${profile.id}`;

  // 生成 Token 缓存键
  const tokenCacheKey = `livekit_token:${sessionId}:${profile.id}`;

  try {
    // 检查是否有缓存的有效 Token
    const cachedToken = await redis.get(tokenCacheKey);
    if (cachedToken) {
      return NextResponse.json({
        token: cachedToken,
        roomName,
        participantIdentity,
        participantName,
        role,
        wsUrl: process.env.LIVEKIT_URL
      });
    }

    // 创建或获取 LiveKit 房间
    await liveKitTokenService.createRoom({
      roomName,
      maxParticipants: 50,
      emptyTimeout: 300,
      metadata: JSON.stringify({
        classroomId: classroom.id,
        sessionId: liveSession.id,
        sessionTitle: liveSession.title
      })
    });

    // 生成访问令牌
    const token = await liveKitTokenService.generateAccessToken({
      roomName,
      participantName,
      participantIdentity,
      role,
      metadata: JSON.stringify({
        userId: profile.id,
        classroomId: classroom.id,
        sessionId: liveSession.id,
        role: memberRole
      }),
      ttl: 3600 // 1 小时
    });

    // 缓存 Token（50 分钟，比实际过期时间短一点）
    await redis.set(tokenCacheKey, token, { ex: 3000 });

    // 更新会话状态为 active（如果还是 scheduled）
    if (liveSession.status === 'scheduled') {
      await supabase
        .from('classroom_live_session')
        .update({ 
          status: 'active',
          starts_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    return NextResponse.json({
      token,
      roomName,
      participantIdentity,
      participantName,
      role,
      wsUrl: process.env.LIVEKIT_URL
    });

  } catch (error) {
    console.error('LiveKit token generation failed:', error);
    return NextResponse.json(
      { message: 'Failed to generate access token' },
      { status: 500 }
    );
  }
}

/**
 * 刷新 LiveKit 访问令牌
 * PUT /api/classroom/[slug]/live-sessions/[sessionId]/token
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string }> }
) {
  try {
    const { slug, sessionId } = await params;
    
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      const tutorAuthResult = await authorize('tutor');
      if (tutorAuthResult instanceof NextResponse) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const userId = authResult instanceof NextResponse ? 
      (await authorize('tutor') as any).payload.sub : 
      authResult.payload.sub;

    // 获取用户 profile ID
    const supabase = await createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { message: 'User profile not found' },
        { status: 404 }
      );
    }

    // 清除缓存的 Token
    const tokenCacheKey = `livekit_token:${sessionId}:${profile.id}`;
    await redis.del(tokenCacheKey);

    // 重新生成 Token（复用 POST 逻辑）
    return await POST(request, { params: Promise.resolve({ slug, sessionId }) });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
