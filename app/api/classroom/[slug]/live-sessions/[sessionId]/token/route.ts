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
    const authResult = await authorize(['student', 'tutor']);
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
  console.log('🔍 [Token API] Checking classroom membership:', {
    slug,
    profileId: profile.id,
    userId
  });

  // First, get the classroom
  const { data: classroomData, error: classroomFetchError } = await supabase
    .from('classroom')
    .select('id, name')
    .eq('slug', slug)
    .single();

  console.log('🏫 [Token API] Classroom fetch result:', {
    classroom: classroomData,
    error: classroomFetchError
  });

  if (classroomFetchError || !classroomData) {
    return NextResponse.json(
      { message: 'Classroom not found' },
      { status: 404 }
    );
  }

  // Then check membership separately for better debugging
  const { data: membershipData, error: membershipError } = await supabase
    .from('classroom_member')
    .select('user_id, role')
    .eq('classroom_id', classroomData.id)
    .eq('user_id', profile.id)
    .single();

  console.log('👥 [Token API] Membership check result:', {
    membership: membershipData,
    error: membershipError,
    errorCode: membershipError?.code,
    errorMessage: membershipError?.message,
    errorDetails: membershipError?.details
  });

  if (membershipError || !membershipData) {
    return NextResponse.json(
      { 
        message: 'Not a member of this classroom',
        debug: {
          code: membershipError?.code,
          details: membershipError?.details,
          message: membershipError?.message
        }
      },
      { status: 403 }
    );
  }

  // Combine the data
  const classroom = {
    ...classroomData,
    classroom_member: [membershipData]
  };

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
    console.log('🔢 [Token API] Trying numeric ID lookup');
    const result = await supabase
      .from('classroom_live_session')
      .select('*')
      .eq('id', parseInt(sessionId))
      .eq('classroom_id', classroom.id)
      .single();
    
    console.log('🔢 [Token API] Numeric ID result:', { data: result.data, error: result.error });
    liveSession = result.data;
    sessionError = result.error;
  } else {
    console.log('🔤 [Token API] SessionId is not numeric, skipping numeric lookup');
  }

  // If numeric ID fails or sessionId is not numeric, try slug or public_id
  if (!liveSession) {
    console.log('🔄 [Token API] Trying public_id and slug lookup');
    
    // First try public_id
    console.log('🆔 [Token API] Trying public_id lookup');
    const publicIdResult = await supabase
      .from('classroom_live_session')
      .select('*')
      .eq('classroom_id', classroom.id)
      .eq('public_id', sessionId)
      .single();
    
    console.log('🆔 [Token API] Public ID result:', { data: publicIdResult.data, error: publicIdResult.error });
    
    if (publicIdResult.data) {
      liveSession = publicIdResult.data;
      sessionError = null;
    } else {
      // If public_id fails, try slug
      console.log('🏷️ [Token API] Trying slug lookup');
      const slugResult = await supabase
        .from('classroom_live_session')
        .select('*')
        .eq('classroom_id', classroom.id)
        .eq('slug', sessionId)
        .single();
      
      console.log('🏷️ [Token API] Slug result:', { data: slugResult.data, error: slugResult.error });
      liveSession = slugResult.data;
      sessionError = slugResult.error;
    }
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

  // 检查会话状态
  if (liveSession.status !== 'live' && liveSession.status !== 'scheduled') {
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

    // 更新会话状态为 live（如果还是 scheduled）
    if (liveSession.status === 'scheduled') {
      await supabase
        .from('classroom_live_session')
        .update({ 
          status: 'live',
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
    const authResult = await authorize(['student', 'tutor']);
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
