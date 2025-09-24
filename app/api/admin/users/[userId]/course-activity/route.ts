import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/users/[userId]/course-activity - Get user's course activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userId } = await params;
    const supabase = await createAdminClient();

    // Get user profile first to get the profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get user's course enrollments
    const { data: enrollments } = await supabase
      .from('course_enrollment')
      .select(`
        id,
        status,
        enrolled_at,
        completed_at,
        course!inner(
          id,
          title
        )
      `)
      .eq('student_id', profile.id)
      .order('enrolled_at', { ascending: false })
      .limit(20);

    // Get user's course progress
    const { data: progress } = await supabase
      .from('course_progress')
      .select(`
        course_id,
        last_accessed,
        course!inner(
          title
        )
      `)
      .eq('user_id', profile.id)
      .order('last_accessed', { ascending: false })
      .limit(20);

    // Calculate progress percentages by getting lesson counts
    const progressWithPercentage = [];
    for (const prog of progress || []) {
      // Get total lessons in course
      const { count: totalLessons } = await supabase
        .from('course_lesson')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', prog.course_id);

      // Get completed lessons for user
      const { count: completedLessons } = await supabase
        .from('course_lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', prog.course_id)
        .eq('user_id', profile.id)
        .eq('completed', true);

      const percentage = totalLessons ? Math.round((completedLessons || 0) / totalLessons * 100) : 0;

      progressWithPercentage.push({
        course_id: prog.course_id,
        course_title: prog.course.title,
        completed_lessons: completedLessons || 0,
        total_lessons: totalLessons || 0,
        last_accessed: prog.last_accessed,
        percentage,
      });
    }

    // Format enrollments
    const formattedEnrollments = (enrollments || []).map(enrollment => ({
      id: enrollment.id,
      status: enrollment.status,
      enrolled_at: enrollment.enrolled_at,
      completed_at: enrollment.completed_at,
      course_title: enrollment.course.title,
      course_id: enrollment.course.id,
    }));

    return NextResponse.json({
      enrollments: formattedEnrollments,
      progress: progressWithPercentage,
    });

  } catch (error) {
    console.error('Admin user course activity GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
