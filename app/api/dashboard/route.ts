import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get course enrollment data (more accurate than progress)
    const { data: enrollments } = await supabase
      .from('course_enrollment')
      .select(`
        id,
        status,
        completed_at,
        course:course_id (
          id,
          public_id,
          slug,
          title,
          thumbnail_url
        )
      `)
      .eq('user_id', profile.id)
      .eq('status', 'active');

    // Get course enrollment and progress data with lessons
    const { data: courseProgress } = await supabase
      .from('course_progress')
      .select(`
        *,
        course_lesson!inner(
          id,
          public_id,
          title,
          kind,
          duration_sec,
          course_module!inner(
            title,
            position,
            course!inner(
              id,
              public_id,
              slug,
              title,
              description,
              thumbnail_url
            )
          )
        )
      `)
      .eq('user_id', profile.id)
      .eq('lesson_kind', 'video')
      .gt('video_position_sec', 0)
      .lt('progress_pct', 100)
      .order('last_accessed_at', { ascending: false });

    // Get unique courses from progress data
    const uniqueCourses = new Map();
    courseProgress?.forEach(p => {
      const courseId = p.course_lesson?.course_module?.course?.id;
      if (courseId && !uniqueCourses.has(courseId)) {
        uniqueCourses.set(courseId, {
          id: p.course_lesson?.course_module?.course?.public_id,
          slug: p.course_lesson?.course_module?.course?.slug,
          title: p.course_lesson?.course_module?.course?.title,
          thumbnail: p.course_lesson?.course_module?.course?.thumbnail_url
        });
      }
    });

    // Calculate stats from enrollments and progress
    const coursesEnrolled = enrollments?.length || 0;
    
    // Count completed courses from enrollments
    const coursesCompleted = enrollments?.filter(e => e.status === 'completed' && e.completed_at).length || 0;
    
    // Calculate total study time from progress data
    const totalStudyTime = courseProgress?.reduce((total, p) => total + (p.time_spent_sec || 0), 0) || 0;

    // Get recent courses (last 3 accessed) - for continue watching
    const recentCourses = courseProgress?.slice(0, 3).map(p => ({
      id: p.course_lesson?.course_module?.course?.public_id,
      slug: p.course_lesson?.course_module?.course?.slug,
      title: p.course_lesson?.course_module?.course?.title,
      progress: p.progress_pct || 0,
      lastAccessed: formatTimeAgo(p.last_accessed_at || p.updated_at),
      thumbnail: p.course_lesson?.course_module?.course?.thumbnail_url || '/api/placeholder/300/200',
      lessonId: p.course_lesson?.public_id,
      lessonTitle: p.course_lesson?.title,
      moduleTitle: p.course_lesson?.course_module?.title,
      videoPosition: p.video_position_sec || 0,
      videoDuration: p.video_duration_sec || 0
    })) || [];

    // Get upcoming events (assignments, live sessions)
    const { data: upcomingAssignments } = await supabase
      .from('classroom_assignment')
      .select(`
        public_id,
        title,
        due_date,
        classroom:classroom(title)
      `)
      .eq('status', 'active')
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(5);

    const { data: upcomingLiveSessions } = await supabase
      .from('classroom_live_session')
      .select(`
        public_id,
        title,
        scheduled_start_time,
        classroom:classroom(title)
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_start_time', new Date().toISOString())
      .order('scheduled_start_time', { ascending: true })
      .limit(5);

    const upcomingEvents = [
      ...(upcomingAssignments?.map(a => ({
        id: a.public_id,
        title: `Assignment: ${a.title}`,
        date: new Date(a.due_date).toISOString().split('T')[0],
        time: new Date(a.due_date).toTimeString().slice(0, 5),
        type: 'assignment' as const,
        classroom: (a.classroom as any)?.title || 'Unknown'
      })) || []),
      ...(upcomingLiveSessions?.map(s => ({
        id: s.public_id,
        title: s.title,
        date: new Date(s.scheduled_start_time).toISOString().split('T')[0],
        time: new Date(s.scheduled_start_time).toTimeString().slice(0, 5),
        type: 'live_session' as const,
        classroom: (s.classroom as any)?.title || 'Unknown'
      })) || [])
    ].sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime())
     .slice(0, 5);

    // Get study sessions for streak calculation (more accurate)
    const { data: studySessions } = await supabase
      .from('study_session')
      .select('session_start')
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .gte('session_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('session_start', { ascending: false });

    // Calculate current streak from study sessions
    const currentStreak = studySessions && studySessions.length > 0 
      ? calculateStreak(studySessions.map(s => s.session_start))
      : 0;

    const dashboardData = {
      stats: {
        coursesEnrolled,
        coursesCompleted,
        totalStudyTime: Math.round(totalStudyTime / 3600), // Convert to hours
        currentStreak,
        points: profile.points || 0
      },
      recentCourses,
      upcomingEvents,
      profile: {
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        points: profile.points
      }
    };

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Dashboard API Response:', {
        userId: user.id,
        profileId: profile.id,
        enrollmentsCount: enrollments?.length,
        progressCount: courseProgress?.length,
        studySessionsCount: studySessions?.length,
        stats: dashboardData.stats
      });
    }

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const uniqueDates = [...new Set(dates.map(d => new Date(d).toDateString()))];
  uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const dateStr of uniqueDates) {
    const date = new Date(dateStr);
    const diffDays = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak) {
      streak++;
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}
