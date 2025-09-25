import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const user = authResult.user;
    
    const { lessonId, progressPct, timeSpentSec } = await request.json();

    if (!lessonId || progressPct === undefined) {
      return NextResponse.json(
        { error: 'Lesson ID and progress percentage are required' },
        { status: 400 }
      );
    }

    // Get lesson details with course price info
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('*, course!inner(id, title, price, public_id)')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if user is enrolled in the course or if it's a free course
    const { data: enrollment } = await supabase
      .from('course_enrollment')
      .select('id')
      .eq('course_id', lesson.course.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    // If not enrolled and course is paid, check enrollment
    if (!enrollment && lesson.course.price > 0) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // For free courses (price = 0) or enrolled users, allow access
    // Auto-enroll in free courses if not already enrolled
    if (!enrollment && lesson.course.price === 0) {
      await supabase
        .from('course_enrollment')
        .insert({
          user_id: user.profile?.id || user.id,
          course_id: lesson.course.id,
          status: 'active',
          enrolled_at: new Date().toISOString()
        });
    }

    // Determine state based on progress
    let state = 'not_started';
    if (progressPct > 0 && progressPct < 100) {
      state = 'in_progress';
    } else if (progressPct >= 100) {
      state = 'completed';
    }

    // Upsert progress record
    const { data: progress, error: progressError } = await supabase
      .from('course_progress')
      .upsert({
        user_id: user.profile?.id || user.id,
        lesson_id: lesson.id,
        state,
        progress_pct: progressPct,
        last_seen_at: new Date().toISOString(),
        time_spent_sec: timeSpentSec || 0,
        completion_date: progressPct >= 100 ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,lesson_id'
      })
      .select()
      .single();

    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    // Log analytics event
    await supabase
      .from('course_analytics')
      .insert({
        user_id: user.profile?.id || user.id,
        course_id: lesson.course.id,
        lesson_id: lesson.id,
        event_type: progressPct >= 100 ? 'lesson_complete' : 'lesson_progress',
        event_data: {
          progress_pct: progressPct,
          time_spent_sec: timeSpentSec,
          previous_state: state
        }
      });

    return NextResponse.json({
      success: true,
      progress: {
        lessonId: lesson.public_id,
        state,
        progressPct,
        lastSeenAt: progress.last_seen_at,
        timeSpentSec: progress.time_spent_sec
      }
    });

  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createClient();
    const user = authResult.user;
    
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    if (!courseId && !lessonId) {
      return NextResponse.json(
        { error: 'Course ID or Lesson ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('course_progress')
      .select(`
        *,
        course_lesson!inner(
          public_id,
          title,
          position,
          course!inner(public_id, title)
        )
      `)
      .eq('user_id', user.profile?.id || user.id);

    if (lessonId) {
      // Get specific lesson progress
      const { data: lesson } = await supabase
        .from('course_lesson')
        .select('id')
        .eq('public_id', lessonId)
        .single();

      if (!lesson) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      }

      query = query.eq('lesson_id', lesson.id);
    } else if (courseId) {
      // Get all progress for a course
      const { data: course } = await supabase
        .from('course')
        .select('id')
        .eq('public_id', courseId)
        .single();

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      query = query.eq('course_lesson.course.id', course.id);
    }

    const { data: progressData, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const formattedProgress = progressData.map(p => ({
      lessonId: p.course_lesson.public_id,
      lessonTitle: p.course_lesson.title,
      lessonPosition: p.course_lesson.position,
      courseId: p.course_lesson.course.public_id,
      courseTitle: p.course_lesson.course.title,
      state: p.state,
      progressPct: p.progress_pct,
      lastSeenAt: p.last_seen_at,
      timeSpentSec: p.time_spent_sec,
      completionDate: p.completion_date
    }));

    return NextResponse.json({
      success: true,
      progress: lessonId ? formattedProgress[0] : formattedProgress
    });

  } catch (error) {
    console.error('Progress fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
