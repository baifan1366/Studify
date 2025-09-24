import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// POST /api/profile/study-session - 创建学习会话记录
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const body = await request.json();
    
    const {
      lessonId,
      courseId,
      sessionStart,
      sessionEnd,
      durationMinutes,
      activityType,
      engagementScore,
      progressMade
    } = body;

    const userId = user.profile?.id || user.id;

    // 验证必需字段
    if (!sessionStart || !durationMinutes || !activityType) {
      return NextResponse.json({ 
        error: 'sessionStart, durationMinutes, and activityType are required' 
      }, { status: 400 });
    }

    // 创建学习会话记录
    const { data: studySession, error: sessionError } = await client
      .from('study_session')
      .insert({
        user_id: userId,
        lesson_id: lessonId || null,
        course_id: courseId || null,
        session_start: sessionStart,
        session_end: sessionEnd || null,
        duration_minutes: durationMinutes,
        activity_type: activityType,
        engagement_score: engagementScore || null,
        progress_made: progressMade || null,
        is_deleted: false
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating study session:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to create study session' 
      }, { status: 500 });
    }

    // 更新用户的学习统计缓存（如果存在）
    await client
      .from('learning_statistics')
      .upsert({
        user_id: userId,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    return NextResponse.json({
      success: true,
      data: studySession
    });

  } catch (error) {
    console.error('Error in POST /api/profile/study-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
