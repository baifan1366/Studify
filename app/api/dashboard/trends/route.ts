import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if ('status' in authResult) {
      return authResult;
    }

    // 获取用户的profile ID
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.payload.sub)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;

    // 获取时间范围
    const now = new Date();
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 获取课程进度数据
    const { data: courseProgress } = await supabase
      .from('course_progress')
      .select('completion_percentage, time_spent_sec, updated_at, created_at')
      .eq('user_id', userId);

    // 获取学习统计数据
    const { data: studyStats } = await supabase
      .from('course_lesson_progress')
      .select('completed_at, time_spent_sec, created_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    // 获取积分历史
    const { data: pointsHistory } = await supabase
      .from('user_points_history')
      .select('points_earned, created_at, action_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    // 计算本周vs上周的趋势
    const thisWeekProgress = courseProgress?.filter(p => 
      new Date(p.updated_at) >= thisWeekStart
    ) || [];

    const lastWeekProgress = courseProgress?.filter(p => {
      const date = new Date(p.updated_at);
      return date >= lastWeekStart && date < thisWeekStart;
    }) || [];

    // 计算课程完成趋势
    const thisWeekCompleted = thisWeekProgress.filter(p => p.completion_percentage >= 100).length;
    const lastWeekCompleted = lastWeekProgress.filter(p => p.completion_percentage >= 100).length;
    const courseCompletionTrend = thisWeekCompleted - lastWeekCompleted;

    // 计算学习时间趋势
    const thisWeekStudyTime = thisWeekProgress.reduce((total, p) => total + (p.time_spent_sec || 0), 0);
    const lastWeekStudyTime = lastWeekProgress.reduce((total, p) => total + (p.time_spent_sec || 0), 0);
    const studyTimeTrend = (thisWeekStudyTime - lastWeekStudyTime) / 3600; // 转换为小时

    // 计算积分趋势
    const thisWeekPoints = pointsHistory?.filter(p => 
      new Date(p.created_at) >= thisWeekStart
    ).reduce((sum, p) => sum + p.points_earned, 0) || 0;

    const lastWeekPoints = pointsHistory?.filter(p => {
      const date = new Date(p.created_at);
      return date >= lastWeekStart && date < thisWeekStart;
    }).reduce((sum, p) => sum + p.points_earned, 0) || 0;

    const pointsTrend = thisWeekPoints - lastWeekPoints;

    // 计算连续学习天数趋势
    const recentActivity = studyStats?.filter(s => 
      new Date(s.completed_at!) >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    ) || [];

    const thisWeekActiveDays = new Set(
      recentActivity
        .filter(s => new Date(s.completed_at!) >= thisWeekStart)
        .map(s => new Date(s.completed_at!).toDateString())
    ).size;

    const lastWeekActiveDays = new Set(
      recentActivity
        .filter(s => {
          const date = new Date(s.completed_at!);
          return date >= lastWeekStart && date < thisWeekStart;
        })
        .map(s => new Date(s.completed_at!).toDateString())
    ).size;

    // 计算当前连续天数
    const currentStreak = calculateCurrentStreak(recentActivity.map(s => s.completed_at!));
    const streakTrend = thisWeekActiveDays > 0;

    // 构建趋势数据
    const trends = {
      courseCompletion: {
        thisWeek: thisWeekCompleted,
        change: courseCompletionTrend,
        trend: courseCompletionTrend > 0 ? `+${courseCompletionTrend} this week` : 
               courseCompletionTrend < 0 ? `${courseCompletionTrend} this week` :
               'No change this week'
      },
      studyTime: {
        thisWeek: thisWeekStudyTime / 3600,
        change: studyTimeTrend,
        trend: studyTimeTrend > 0 ? `+${studyTimeTrend.toFixed(1)}h this week` : 
               studyTimeTrend < 0 ? `${studyTimeTrend.toFixed(1)}h this week` :
               'Same as last week'
      },
      points: {
        thisWeek: thisWeekPoints,
        change: pointsTrend,
        trend: pointsTrend > 0 ? `+${pointsTrend} earned` : 
               pointsTrend < 0 ? `${pointsTrend} this week` :
               'No points earned'
      },
      streak: {
        current: currentStreak,
        trend: streakTrend ? '🔥 Keep going!' : 'Start today!'
      }
    };

    return NextResponse.json({
      success: true,
      data: trends
    });

  } catch (error) {
    console.error('Error fetching dashboard trends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate current streak
function calculateCurrentStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  // Get unique dates and sort them
  const uniqueDates = [...new Set(completedDates.map(d => new Date(d).toDateString()))]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
