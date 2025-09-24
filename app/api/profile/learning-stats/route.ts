import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// GET /api/profile/learning-stats - 获取用户学习统计数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'week'; // week, month, all

    const userId = user.profile?.id || user.id;

    // 计算日期范围
    let startDate: string;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        startDate = '1970-01-01T00:00:00.000Z'; // All time
    }

    // 获取学习时长统计（从study_session表）
    const { data: studyTimeData, error: studyTimeError } = await client
      .from('study_session')
      .select('duration_minutes, session_start, activity_type')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('session_start', startDate);

    if (studyTimeError) {
      console.error('Error fetching study time data:', studyTimeError);
    }

    // 计算总学习时长
    const totalStudyMinutes = studyTimeData?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0;
    const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

    // 按活动类型分组
    const activityBreakdown = studyTimeData?.reduce((acc, session) => {
      const type = session.activity_type || 'other';
      acc[type] = (acc[type] || 0) + (session.duration_minutes || 0);
      return acc;
    }, {} as Record<string, number>) || {};

    // 获取课程完成统计
    const { data: courseCompletionData, error: courseError } = await client
      .from('course_enrollment')
      .select(`
        status,
        completed_at,
        course:course_id (
          title,
          thumbnail_url,
          total_lessons
        )
      `)
      .eq('user_id', userId)
      .gte('completed_at', startDate);

    if (courseError) {
      console.error('Error fetching course completion data:', courseError);
    }

    const completedCourses = courseCompletionData?.filter(enrollment => 
      enrollment.status === 'completed' && enrollment.completed_at
    ) || [];

    // 获取课程进度统计
    const { data: progressData, error: progressError } = await client
      .from('course_progress')
      .select(`
        progress_pct,
        state,
        time_spent_sec,
        lesson:lesson_id (
          title,
          course:course_id (
            title
          )
        )
      `)
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching progress data:', progressError);
    }

    // 计算平均进度
    const avgProgress = progressData && progressData.length > 0 
      ? Math.round((progressData.reduce((sum, p) => sum + (p.progress_pct || 0), 0) / progressData.length) * 10) / 10
      : 0;

    // 计算已完成和进行中的课程数量
    const completedLessons = progressData?.filter(p => p.state === 'completed').length || 0;
    const inProgressLessons = progressData?.filter(p => p.state === 'in_progress').length || 0;

    // 获取学习连续天数
    const { data: recentSessions, error: streakError } = await client
      .from('study_session')
      .select('session_start')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('session_start', { ascending: false })
      .limit(30);

    let studyStreak = 0;
    if (recentSessions && recentSessions.length > 0) {
      const today = new Date().toDateString();
      const sessionDates = recentSessions.map(s => new Date(s.session_start).toDateString());
      const uniqueDates = [...new Set(sessionDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      // 计算连续学习天数
      let currentDate = new Date();
      for (const dateStr of uniqueDates) {
        const sessionDate = new Date(dateStr);
        const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === studyStreak) {
          studyStreak++;
        } else if (daysDiff === studyStreak + 1 && studyStreak === 0) {
          studyStreak = 1; // 昨天学习了但今天还没学习
        } else {
          break;
        }
        currentDate = sessionDate;
      }
    }

    // 获取积分统计
    const { data: pointsData, error: pointsError } = await client
      .from('community_points_ledger')
      .select('points, reason, created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', startDate);

    const pointsEarned = pointsData?.filter(p => p.points > 0).reduce((sum, p) => sum + p.points, 0) || 0;
    const pointsSpent = Math.abs(pointsData?.filter(p => p.points < 0).reduce((sum, p) => sum + p.points, 0) || 0);

    // 获取成就统计
    const { data: achievementsData, error: achievementsError } = await client
      .from('community_user_achievement')
      .select(`
        unlocked,
        unlocked_at,
        achievement:achievement_id (
          name,
          description,
          rule
        )
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false);

    const unlockedAchievements = achievementsData?.filter(a => a.unlocked) || [];
    const recentAchievements = unlockedAchievements.filter(a => 
      a.unlocked_at && new Date(a.unlocked_at) >= new Date(startDate)
    );

    // 每日学习时长趋势（最近7天）
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const dayMinutes = studyTimeData?.filter(session => 
        new Date(session.session_start).toDateString() === dateStr
      ).reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0;

      return {
        date: date.toISOString().split('T')[0],
        minutes: dayMinutes,
        hours: Math.round((dayMinutes / 60) * 10) / 10
      };
    }).reverse();

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalStudyMinutes,
          totalStudyHours,
          completedCourses: completedCourses.length,
          completedLessons,
          inProgressLessons,
          avgProgress,
          studyStreak,
          pointsEarned,
          pointsSpent,
          currentPoints: user.profile?.points || 0,
          unlockedAchievements: unlockedAchievements.length,
          recentAchievements: recentAchievements.length
        },
        charts: {
          dailyStudyTime: dailyStats,
          activityBreakdown,
          recentCourses: completedCourses.slice(0, 5).map(c => ({
            title: (c as any).course?.title || 'Unknown Course',
            thumbnail: (c as any).course?.thumbnail_url || '',
            completedAt: c.completed_at
          }))
        },
        period
      }
    });

  } catch (error) {
    console.error('Error in GET /api/profile/learning-stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
