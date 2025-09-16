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

    // Get course enrollment and progress data
    const { data: courseProgress } = await supabase
      .from('course_progress')
      .select(`
        *,
        course:courses(
          public_id,
          title,
          description,
          thumbnail_url,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // Calculate stats
    const coursesEnrolled = courseProgress?.length || 0;
    const coursesCompleted = courseProgress?.filter(p => p.completion_percentage >= 100).length || 0;
    const totalStudyTime = courseProgress?.reduce((total, p) => total + (p.time_spent_sec || 0), 0) || 0;

    // Get recent courses (last 3 accessed)
    const recentCourses = courseProgress?.slice(0, 3).map(p => ({
      id: p.course?.public_id,
      title: p.course?.title,
      progress: p.completion_percentage || 0,
      lastAccessed: formatTimeAgo(p.updated_at),
      thumbnail: p.course?.thumbnail_url || '/api/placeholder/300/200'
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

    // Get recent notes count for streak calculation (simplified)
    const { data: recentNotes } = await supabase
      .from('course_notes')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Calculate current streak (simplified - days with activity)
    const currentStreak = calculateStreak(recentNotes?.map(n => n.created_at) || []);

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
