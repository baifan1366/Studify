import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import {
  calculateStudyStreak,
  intervalMinutes,
  mergeStudyIntervals,
} from '@/lib/learning/study-metrics';

export async function GET(_request: NextRequest) {
  try {
    const auth = await authorize(['student', 'tutor', 'admin']);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, timezone')
      .eq('user_id', auth.payload.sub)
      .single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const now = new Date();
    const timeZone = profile.timezone || 'Asia/Kuala_Lumpur';
    const thisWeekStart = new Date(now);
    thisWeekStart.setUTCHours(0, 0, 0, 0);
    thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - thisWeekStart.getUTCDay());
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86_400_000);

    const [{ data: sessions }, { data: enrollments }, { data: points }, { data: progress }] =
      await Promise.all([
        supabase
          .from('study_session')
          .select('session_start, session_end, duration_minutes, activity_type')
          .eq('user_id', profile.id)
          .eq('is_deleted', false)
          .gte('session_start', lastWeekStart.toISOString()),
        supabase
          .from('course_enrollment')
          .select('completed_at')
          .eq('user_id', profile.id)
          .eq('status', 'completed')
          .not('completed_at', 'is', null)
          .gte('completed_at', lastWeekStart.toISOString()),
        supabase
          .from('community_points_ledger')
          .select('points, created_at')
          .eq('user_id', profile.id)
          .eq('is_deleted', false)
          .gte('created_at', lastWeekStart.toISOString()),
        supabase
          .from('course_progress')
          .select('updated_at')
          .eq('user_id', profile.id)
          .eq('is_deleted', false)
          .gte('updated_at', new Date(now.getTime() - 370 * 86_400_000).toISOString()),
      ]);

    const thisWeekMinutes = intervalMinutes(mergeStudyIntervals(sessions || [], thisWeekStart, now));
    const lastWeekMinutes = intervalMinutes(mergeStudyIntervals(sessions || [], lastWeekStart, thisWeekStart));
    const thisWeekCompleted = (enrollments || []).filter((item) => new Date(item.completed_at!) >= thisWeekStart).length;
    const lastWeekCompleted = (enrollments || []).length - thisWeekCompleted;
    const thisWeekPoints = (points || []).filter((item) => new Date(item.created_at) >= thisWeekStart)
      .reduce((sum, item) => sum + item.points, 0);
    const lastWeekPoints = (points || []).filter((item) => new Date(item.created_at) < thisWeekStart)
      .reduce((sum, item) => sum + item.points, 0);
    const studyHourChange = (thisWeekMinutes - lastWeekMinutes) / 60;
    const studyTimePercentChange = lastWeekMinutes > 0
      ? ((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100
      : null;
    const pointChange = thisWeekPoints - lastWeekPoints;
    const completionChange = thisWeekCompleted - lastWeekCompleted;
    const currentStreak = calculateStudyStreak([
      ...(sessions || []).map((session) => session.session_start),
      ...(progress || []).map((item) => item.updated_at),
    ], timeZone);

    return NextResponse.json({
      success: true,
      data: {
        courseCompletion: {
          thisWeek: thisWeekCompleted,
          change: completionChange,
          trend: completionChange > 0 ? `+${completionChange} this week` :
            completionChange < 0 ? `${completionChange} this week` : 'No change this week',
        },
        studyTime: {
          thisWeek: thisWeekMinutes / 60,
          lastWeek: lastWeekMinutes / 60,
          change: studyHourChange,
          percentChange: studyTimePercentChange,
          trend: studyHourChange > 0 ? `+${studyHourChange.toFixed(1)}h this week` :
            studyHourChange < 0 ? `${studyHourChange.toFixed(1)}h this week` : 'Same as last week',
        },
        points: {
          thisWeek: thisWeekPoints,
          change: pointChange,
          trend: pointChange > 0 ? `+${pointChange} this week` :
            pointChange < 0 ? `${pointChange} this week` : 'No change this week',
        },
        streak: {
          current: currentStreak,
          trend: currentStreak > 0 ? 'Keep going!' : 'Start today!',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard trends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
