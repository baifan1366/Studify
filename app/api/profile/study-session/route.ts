import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * POST /api/profile/study-session - Create a study session record
 * Tracks learning time for gamification and analytics
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;

    // Parse request body
    const body = await request.json();
    const {
      lessonId,
      courseId,
      sessionStart,
      sessionEnd,
      durationMinutes,
      activityType = 'video_watching',
      engagementScore,
      progressMade,
      idempotencyKey,
    } = body;

    // Validation
    const startTime = new Date(sessionStart).getTime();
    const endIso = sessionEnd || new Date().toISOString();
    const endTime = new Date(endIso).getTime();
    const actualDurationMinutes = Math.round((endTime - startTime) / 60_000);

    if (
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      actualDurationMinutes <= 0 ||
      actualDurationMinutes > 720
    ) {
      return NextResponse.json(
        { error: 'Invalid duration' },
        { status: 400 }
      );
    }

    if (idempotencyKey) {
      const { data: existingSession } = await supabase
        .from('study_session')
        .select('public_id, duration_minutes')
        .eq('user_id', userId)
        .eq('idempotency_key', String(idempotencyKey).slice(0, 200))
        .eq('is_deleted', false)
        .maybeSingle();
      if (existingSession) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          data: { session: { id: existingSession.public_id, duration: existingSession.duration_minutes, pointsEarned: 0 } },
        });
      }
    }

    if (!sessionStart) {
      return NextResponse.json(
        { error: 'Session start time is required' },
        { status: 400 }
      );
    }

    // Get lesson internal ID if lessonId (public_id) is provided
    let lessonInternalId = null;
    if (lessonId) {
      const { data: lessonData } = await supabase
        .from('course_lesson')
        .select('id')
        .eq('public_id', lessonId)
        .maybeSingle();
      
      lessonInternalId = lessonData?.id || null;
    }

    // Get course internal ID if courseId (public_id) is provided
    let courseInternalId = null;
    if (courseId) {
      const { data: courseData } = await supabase
        .from('course')
        .select('id')
        .eq('public_id', courseId)
        .maybeSingle();
      
      courseInternalId = courseData?.id || null;
    }

    // Create study session record
    const { data: session, error: sessionError } = await supabase
      .from('study_session')
      .insert({
        user_id: userId,
        lesson_id: lessonInternalId,
        course_id: courseInternalId,
        session_start: sessionStart,
        session_end: endIso,
        duration_minutes: actualDurationMinutes,
        activity_type: activityType,
        engagement_score: engagementScore,
        progress_made: progressMade,
        idempotency_key: idempotencyKey ? String(idempotencyKey).slice(0, 200) : null,
        is_deleted: false
      })
      .select()
      .single();

    if (sessionError) {
      if (sessionError.code === '23505' && idempotencyKey) {
        return NextResponse.json({ success: true, duplicate: true, data: { pointsEarned: 0 } });
      }
      console.error('Error creating study session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create study session', details: sessionError.message },
        { status: 500 }
      );
    }

    // Award points for study time (1 point per 10 minutes)
    const pointsToAward = Math.floor(actualDurationMinutes / 10);
    if (pointsToAward > 0) {
      // The points ledger is the source of truth; its trigger synchronizes the profile balance.
      await supabase
        .from('community_points_ledger')
        .insert({
          user_id: userId,
          points: pointsToAward,
          reason: `Study session: ${activityType.replace('_', ' ')}`,
          ref: { session_id: session.id, duration_minutes: actualDurationMinutes },
          is_deleted: false
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.public_id,
          duration: actualDurationMinutes,
          activityType,
          pointsEarned: pointsToAward
        }
      },
      message: 'Study session recorded successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/profile/study-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/study-session - Get recent study sessions
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const days = parseInt(url.searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: sessions, error: sessionsError } = await supabase
      .from('study_session')
      .select(`
        *,
        lesson:lesson_id (
          public_id,
          title,
          kind
        ),
        course:course_id (
          public_id,
          title
        )
      `)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .gte('session_start', startDate.toISOString())
      .order('session_start', { ascending: false })
      .limit(limit);

    if (sessionsError) {
      console.error('Error fetching study sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch study sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map(s => ({
          id: s.public_id,
          sessionStart: s.session_start,
          sessionEnd: s.session_end,
          duration: s.duration_minutes,
          activityType: s.activity_type,
          lesson: s.lesson ? {
            id: s.lesson.public_id,
            title: s.lesson.title,
            kind: s.lesson.kind
          } : null,
          course: s.course ? {
            id: s.course.public_id,
            title: s.course.title
          } : null
        })),
        total: sessions.length
      }
    });

  } catch (error) {
    console.error('Error in GET /api/profile/study-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
