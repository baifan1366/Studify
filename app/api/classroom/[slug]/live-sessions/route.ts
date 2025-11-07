import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * 创建直播课程
 * POST /api/classroom/live-session
 * 输入：classroom_id, title, starts_at
 * 权限: host / admin
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    // 验证用户身份
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const { title, starts_at, ends_at } = await request.json();

    // 验证必填字段
    if (!title || !starts_at) {
      return NextResponse.json(
        { error: 'title and starts_at are required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get user's profile ID from JWT user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 验证时间格式
    const startTime = new Date(starts_at);
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid starts_at timestamp' },
        { status: 400 }
      );
    }

    let endTime = null;
    if (ends_at && ends_at.trim() !== '') {
      endTime = new Date(ends_at);
      if (isNaN(endTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid ends_at timestamp' },
          { status: 400 }
        );
      }
      
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'ends_at must be after starts_at' },
          { status: 400 }
        );
      }
    }
    
    console.log('⏰ [POST] Session time validation:', {
      starts_at: startTime.toISOString(),
      ends_at: endTime?.toISOString() || 'No end time (open-ended)',
      hasEndTime: !!endTime
    });

    // Check if classroom exists
    const { data: classroomExists, error: existsError } = await supabase
      .from('classroom')
      .select('id, slug, name')
      .eq('slug', slug)
      .single();

    if (existsError || !classroomExists) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of this classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroomExists.id)
      .eq('user_id', profile.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied - not a member of this classroom' },
        { status: 403 }
      );
    }

    const userRole = membership.role;
    const classroom = classroomExists;

    // 检查权限：只有 owner 和 tutor 可以创建直播课程
    if (!['owner', 'tutor'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only classroom owners and tutors can create live sessions' },
        { status: 403 }
      );
    }

    // Use the classroom's slug for the foreign key reference
    // Determine initial status based on start time
    const now = new Date();
    let initialStatus: 'scheduled' | 'live' = 'scheduled';
    
    // If start time is now or in the past (within 5 minutes), set to live immediately
    const timeDiffMs = startTime.getTime() - now.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);
    
    if (timeDiffMinutes <= 5) {
      initialStatus = 'live';
      console.log('🎬 [POST] Auto-starting session:', {
        title,
        startTime: startTime.toISOString(),
        now: now.toISOString(),
        timeDiffMinutes,
        status: 'live'
      });
    } else {
      console.log('📅 [POST] Scheduling session:', {
        title,
        startTime: startTime.toISOString(),
        now: now.toISOString(),
        timeDiffMinutes,
        status: 'scheduled'
      });
    }
    
    // 创建直播课程
    const { data: liveSession, error: sessionError } = await supabase
      .from('classroom_live_session')
      .insert({
        classroom_id: classroom.id,
        title: title.trim(),
        host_id: profile.id,
        starts_at: startTime.toISOString(),
        ends_at: endTime?.toISOString() || null,
        status: initialStatus,
        slug: slug,
      })
      .select(`
        id,
        public_id,
        classroom_id,
        title,
        slug,
        host_id,
        starts_at,
        ends_at,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (sessionError) {
      console.error('Error creating live session:', sessionError);
      return NextResponse.json(
        { 
          error: 'Failed to create live session',
          details: sessionError.message,
          code: sessionError.code
        },
        { status: 500 }
      );
    }

    console.log('✅ [POST] Live session created:', {
      id: liveSession.id,
      title: liveSession.title,
      status: liveSession.status,
      starts_at: liveSession.starts_at,
      isLiveNow: liveSession.status === 'live'
    });

    return NextResponse.json({
      success: true,
      message: liveSession.status === 'live' 
        ? 'Live session created and started successfully' 
        : 'Live session scheduled successfully',
      session: {
        ...liveSession,
        classroom_name: classroom.name,
        host_name: profile?.display_name || authResult.user.email?.split('@')[0] || 'Unknown',
        host_email: authResult.user.email,
        is_host: true,
        can_manage: true,
      },
    });

  } catch (error) {
    console.error('Error creating live session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取课堂的直播课程列表
 * GET /api/classroom/live-session?classroom_id=xxx
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    // 验证用户身份
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 可选过滤条件

    const supabase = await createAdminClient();

    // Get user's profile ID from JWT user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('GET Debug - slug:', slug, 'profileId:', profile.id);

    // First check if classroom exists at all
    const { data: classroomExists, error: existsError } = await supabase
      .from('classroom')
      .select('id, slug, name')
      .eq('slug', slug)
      .single();

    console.log('Classroom exists check:', { classroomExists, existsError });

    if (existsError || !classroomExists) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of this classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroomExists.id)
      .eq('user_id', profile.id)
      .single();

    console.log('Membership check:', { membership, membershipError });

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied - not a member of this classroom' },
        { status: 403 }
      );
    }

    const userRole = membership.role;
    const classroom = classroomExists;

    // 构建查询
    let query = supabase
      .from('classroom_live_session')
      .select(`
        id,
        public_id,
        classroom_id,
        title,
        slug,
        host_id,
        starts_at,
        ends_at,
        status,
        created_at,
        updated_at
      `)
      .eq('classroom_id', classroom.id)
      .eq('is_deleted', false);

    // 如果指定了状态过滤
    if (status && ['scheduled', 'live', 'ended', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: sessions, error: sessionsError } = await query
      .order('starts_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching live sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch live sessions' },
        { status: 500 }
      );
    }

    // 格式化返回数据
    const formattedSessions = sessions.map(session => {
      return {
        ...session,
        host_name: session.host_id === profile.id 
          ? (profile.display_name || authResult.user.email?.split('@')[0] || 'Unknown')
          : 'Host', // For other hosts, we'd need to fetch their profile separately if needed
        host_email: session.host_id === profile.id ? authResult.user.email : undefined,
        is_host: session.host_id === profile.id,
        can_manage: ['owner', 'tutor'].includes(userRole),
      };
    });

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      current_user_role: userRole,
    });

  } catch (error) {
    console.error('Error fetching live sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 更新直播课程状态
 * PATCH /api/classroom/live-session
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    // 验证用户身份
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const { session_id, status, title, starts_at, ends_at } = await request.json();

    // 验证必填字段
    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get user's profile ID from JWT user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 验证状态值
    if (status && !['scheduled', 'live', 'ended', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: scheduled, live, ended, cancelled' },
        { status: 400 }
      );
    }

    // Check if classroom exists
    const { data: classroomExists, error: existsError } = await supabase
      .from('classroom')
      .select('id, slug, name')
      .eq('slug', slug)
      .single();

    if (existsError || !classroomExists) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of this classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroomExists.id)
      .eq('user_id', profile.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied - not a member of this classroom' },
        { status: 403 }
      );
    }

    const userRole = membership.role;
    const classroom = classroomExists;

    // 获取直播课程信息
    const { data: session, error: sessionError } = await supabase
      .from('classroom_live_session')
      .select('id, classroom_id, host_id, status')
      .eq('id', session_id)
      .eq('classroom_id', classroom.id)
      .eq('is_deleted', false)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Live session not found' },
        { status: 404 }
      );
    }

    console.log('🔍 [PATCH] Current session data:', {
      id: session.id,
      status: session.status,
      status_type: typeof session.status,
      has_status: !!session.status
    });

    // Check if current status is invalid - this requires manual database fix
    if (session.status && !['scheduled', 'live', 'ended', 'cancelled'].includes(session.status)) {
      console.error(`❌ [PATCH] Session ${session_id} has invalid status: "${session.status}"`);
      console.error('This session cannot be updated until the status is fixed in the database.');
      console.error('Run this SQL in Supabase SQL Editor:');
      console.error(`UPDATE classroom_live_session SET status = 'live', updated_at = NOW() WHERE id = ${session_id};`);
      
      return NextResponse.json(
        { 
          error: 'Session has invalid status',
          details: `Current status "${session.status}" is not valid. Valid values are: scheduled, live, ended, cancelled`,
          fix_instructions: 'Run the SQL script in db/fix-active-status.sql in your Supabase SQL Editor',
          quick_fix_sql: `UPDATE classroom_live_session SET status = 'live', updated_at = NOW() WHERE id = ${session_id};`,
          session_id: session_id,
          current_status: session.status
        },
        { status: 400 }
      );
    }

    // 检查权限：只有主持人或课堂管理员可以更新
    const canUpdate = session.host_id === profile.id || ['owner', 'tutor'].includes(userRole);
    
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'You do not have permission to update this live session' },
        { status: 403 }
      );
    }

    // 构建更新数据
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (status) {
      console.log('🔍 [PATCH] Status value received:', {
        status,
        type: typeof status,
        isValid: ['scheduled', 'live', 'ended', 'cancelled'].includes(status),
        lowercase: status.toLowerCase(),
        uppercase: status.toUpperCase()
      });
      // Ensure status is lowercase to match database constraint
      updateData.status = status.toLowerCase();
    }
    if (title) updateData.title = title.trim();
    if (starts_at) {
      const startTime = new Date(starts_at);
      if (isNaN(startTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid starts_at timestamp' },
          { status: 400 }
        );
      }
      updateData.starts_at = startTime.toISOString();
    }
    if (ends_at) {
      const endTime = new Date(ends_at);
      if (isNaN(endTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid ends_at timestamp' },
          { status: 400 }
        );
      }
      updateData.ends_at = endTime.toISOString();
    }

    // Log the update data before sending to database
    console.log('📝 [PATCH] Update data being sent to database:', {
      session_id,
      updateData,
      classroom_id: classroom.id
    });

    // 更新直播课程
    const { data: updatedSession, error: updateError } = await supabase
      .from('classroom_live_session')
      .update(updateData)
      .eq('id', session_id)
      .select(`
        id,
        public_id,
        classroom_id,
        title,
        slug,
        host_id,
        starts_at,
        ends_at,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating live session:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        session_id,
        updateData
      });
      return NextResponse.json(
        { 
          error: 'Failed to update live session',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Live session updated successfully',
      session: updatedSession,
    });

  } catch (error) {
    console.error('Error updating live session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


/**
 * Sync live session statuses based on current time
 * PUT /api/classroom/[slug]/live-sessions (with action=sync)
 * This endpoint triggers immediate status synchronization
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action !== 'sync') {
    return NextResponse.json(
      { error: 'Invalid action. Use action=sync' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createAdminClient();
    
    // Call the database function for precise timing
    const { data, error } = await supabase.rpc('auto_update_live_session_status');

    if (error) {
      console.error('Error syncing live session statuses:', error);
      return NextResponse.json(
        { error: 'Failed to sync session statuses' },
        { status: 500 }
      );
    }

    const result = data?.[0] || { activated_count: 0, ended_count: 0 };

    if (result.activated_count > 0 || result.ended_count > 0) {
      console.log(`✅ Synced sessions - Activated: ${result.activated_count}, Ended: ${result.ended_count}`);
    }

    return NextResponse.json({
      success: true,
      activated: result.activated_count,
      ended: result.ended_count,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error syncing live session statuses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
