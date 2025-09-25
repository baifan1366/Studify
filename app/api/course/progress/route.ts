import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const supabase = await createAdminClient();
    const userId = authResult.user?.profile?.id;
    
    const { lessonId, progressPct, timeSpentSec } = await request.json();

    if (!lessonId || progressPct === undefined) {
      return NextResponse.json(
        { error: 'Lesson ID and progress percentage are required' },
        { status: 400 }
      );
    }

    // First check if lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id, public_id, course_id, title, position, is_deleted')
      .eq('public_id', lessonId)
      .eq('is_deleted', false)
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson lookup error:', lessonError);
      console.error('Lesson ID:', lessonId);
      return NextResponse.json(
        { error: 'Lesson not found', details: lessonError?.message },
        { status: 404 }
      );
    }

    // Then get course details
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('id, title, price_cents, is_free, public_id')
      .eq('id', lesson.course_id)
      .eq('is_deleted', false)
      .single();

    if (courseError || !course) {
      console.error('Course lookup error:', courseError);
      return NextResponse.json(
        { error: 'Course not found for this lesson' },
        { status: 404 }
      );
    }

    // Check if user is enrolled in the course or if it's a free course
    const { data: enrollment } = await supabase
      .from('course_enrollment')
      .select('id')
      .eq('course_id', course.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // If not enrolled and course is paid, check enrollment
    if (!enrollment && !course.is_free && course.price_cents > 0) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // For free courses (price = 0) or enrolled users, allow access
    // Auto-enroll in free courses if not already enrolled
    if (!enrollment && (course.is_free || course.price_cents === 0)) {
      await supabase
        .from('course_enrollment')
        .insert({
          user_id: userId,
          course_id: course.id,
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

    // Upsert progress record (update both timestamp fields for compatibility)
    const now = new Date().toISOString();
    const { data: progress, error: progressError } = await supabase
      .from('course_progress')
      .upsert({
        user_id: userId,
        lesson_id: lesson.id,
        state,
        progress_pct: progressPct,
        last_seen_at: now,
        time_spent_sec: timeSpentSec || 0,
        completion_date: progressPct >= 100 ? now : null
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
        user_id: userId,
        course_id: course.id,
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
    
    const supabase = await createAdminClient();
    const userId = authResult.user?.profile?.id;
    
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
      // Get all progress for a course (courseId can be slug or public_id)
      let course = null;
      
      // First try to find by slug
      const { data: courseBySlug } = await supabase
        .from('course')
        .select('id')
        .eq('slug', courseId)
        .single();
      
      if (courseBySlug) {
        course = courseBySlug;
      } else {
        // If not found by slug, try by public_id (only if it looks like a UUID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
        if (isUUID) {
          const { data: courseByPublicId } = await supabase
            .from('course')
            .select('id')
            .eq('public_id', courseId)
            .single();
          
          course = courseByPublicId;
        }
      }

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      // Get lessons for this course first, then filter progress
      const { data: lessons } = await supabase
        .from('course_lesson')
        .select('id')
        .eq('course_id', course.id)
        .eq('is_deleted', false);
      
      if (!lessons || lessons.length === 0) {
        return NextResponse.json({
          success: true,
          progress: []
        });
      }
      
      const lessonIds = lessons.map(l => l.id);
      query = query.in('lesson_id', lessonIds);
    }

    const { data: progressData, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const formattedProgress = progressData.map((p: any) => ({
      lessonId: p.course_lesson.public_id,
      lessonTitle: p.course_lesson.title,
      lessonPosition: p.course_lesson.position,
      courseId: p.course_lesson.course.public_id,
      courseTitle: p.course_lesson.course.title,
      state: p.state,
      progressPct: p.progress_pct,
      lastSeenAt: p.last_accessed_at || p.last_seen_at,
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
