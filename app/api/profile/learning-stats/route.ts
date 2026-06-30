import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import {
  buildDailyStudyMinutes,
  calculateStudyStreak,
  intervalMinutes,
  mergeStudyIntervals,
} from '@/lib/learning/study-metrics';

// GET /api/profile/learning-stats - 获取用户学习统计数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const supabase = await createAdminClient();
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'week'; // week, month, all

    // 获取用户的profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, timezone')
      .eq('user_id', payload.sub)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;
    const timeZone = profile.timezone || 'Asia/Kuala_Lumpur';

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

    // 获取学习时长统计（从study_session表 - 表可能不存在，所以提供fallback）
    let studyTimeData: any[] = [];
    try {
      const { data, error } = await supabase
        .from('study_session')
        .select('duration_minutes, session_start, session_end, activity_type')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .gte('session_start', startDate);

      if (error) {
        console.warn('Study session table not found or accessible:', error);
        studyTimeData = [];
      } else {
        studyTimeData = data || [];
      }
    } catch (error) {
      console.warn('Study session query failed:', error);
      studyTimeData = [];
    }

    // 计算总学习时长
    const totalStudyMinutes = intervalMinutes(
      mergeStudyIntervals(studyTimeData, new Date(startDate), now)
    );
    const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

    // 按活动类型分组
    const activityTypes = [...new Set(studyTimeData.map((session: any) => session.activity_type || 'other'))];
    const activityBreakdown = Object.fromEntries(activityTypes.map((type) => [
      type,
      intervalMinutes(mergeStudyIntervals(
        studyTimeData.filter((session: any) => (session.activity_type || 'other') === type),
        new Date(startDate),
        now
      )),
    ]));

    // 获取课程完成统计 (使用fallback查询)
    let completedCourses: any[] = [];
    try {
      const { data: courseCompletionData, error: courseError } = await supabase
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
        .eq('user_id', userId);

      if (courseError) {
        console.warn('Course enrollment query failed:', courseError);
      } else {
        completedCourses = courseCompletionData?.filter((enrollment: any) => 
          enrollment.status === 'completed' && enrollment.completed_at
        ) || [];
      }
    } catch (error) {
      console.warn('Course enrollment table access failed:', error);
      completedCourses = [];
    }

    // 获取课程进度统计 (简化查询避免复杂join)
    let progressData: any[] = [];
    try {
      const { data, error } = await supabase
        .from('course_progress')
        .select('progress_pct, state, time_spent_sec, updated_at')
        .eq('user_id', userId)
        .eq('is_deleted', false);

      if (error) {
        console.warn('Course progress query failed:', error);
      } else {
        progressData = data || [];
      }
    } catch (error) {
      console.warn('Course progress table access failed:', error);
      progressData = [];
    }

    // 计算平均进度
    const avgProgress = progressData && progressData.length > 0 
      ? Math.round((progressData.reduce((sum: number, p: any) => sum + (p.progress_pct || 0), 0) / progressData.length) * 10) / 10
      : 0;

    // 计算已完成和进行中的课程数量
    const completedLessons = progressData?.filter((p: any) => p.state === 'completed').length || 0;
    const inProgressLessons = progressData?.filter((p: any) => p.state === 'in_progress').length || 0;

    // 获取学习连续天数 (使用fallback)
    let recentSessions: any[] = [];
    try {
      const { data, error } = await supabase
        .from('study_session')
        .select('session_start')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('session_start', { ascending: false })
        .gte('session_start', new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.warn('Study session streak query failed:', error);
      } else {
        recentSessions = data || [];
      }
    } catch (error) {
      console.warn('Study session streak table access failed:', error);
      recentSessions = [];
    }

    const studyStreak = calculateStudyStreak([
      ...recentSessions.map((session: any) => session.session_start),
      ...progressData.map((progress: any) => progress.updated_at).filter(Boolean),
    ], timeZone);

    // 获取积分统计 (使用fallback)
    let pointsEarned = 0;
    let pointsSpent = 0;
    try {
      const { data: pointsData, error: pointsError } = await supabase
        .from('community_points_ledger')
        .select('points, reason, created_at')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .gte('created_at', startDate);

      if (pointsError) {
        console.warn('Points ledger query failed:', pointsError);
      } else {
        pointsEarned = pointsData?.filter((p: any) => p.points > 0).reduce((sum: number, p: any) => sum + p.points, 0) || 0;
        pointsSpent = Math.abs(pointsData?.filter((p: any) => p.points < 0).reduce((sum: number, p: any) => sum + p.points, 0) || 0);
      }
    } catch (error) {
      console.warn('Points ledger table access failed:', error);
      pointsEarned = 0;
      pointsSpent = 0;
    }

    // 获取成就统计 (使用fallback)
    let unlockedAchievements: any[] = [];
    let recentAchievements: any[] = [];
    try {
      const { data: achievementsData, error: achievementsError } = await supabase
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

      if (achievementsError) {
        console.warn('Achievements query failed:', achievementsError);
      } else {
        unlockedAchievements = achievementsData?.filter((a: any) => a.unlocked) || [];
        recentAchievements = unlockedAchievements.filter((a: any) => 
          a.unlocked_at && new Date(a.unlocked_at) >= new Date(startDate)
        );
      }
    } catch (error) {
      console.warn('Achievements table access failed:', error);
      unlockedAchievements = [];
      recentAchievements = [];
    }

    // 获取用户当前积分
    let currentPoints = 0;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('Profile points query failed:', profileError);
      } else {
        currentPoints = profileData?.points || 0;
      }
    } catch (error) {
      console.warn('Profile table access failed:', error);
      currentPoints = 0;
    }

    // 每日学习时长趋势（最近7天）
    const dailyStats = buildDailyStudyMinutes(studyTimeData, timeZone, 7);

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
          currentPoints: currentPoints,
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
