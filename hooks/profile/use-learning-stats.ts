import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';

// 学习统计数据接口
export interface LearningStats {
  summary: {
    totalStudyMinutes: number;
    totalStudyHours: number;
    completedCourses: number;
    completedLessons: number;
    inProgressLessons: number;
    avgProgress: number;
    studyStreak: number;
    pointsEarned: number;
    pointsSpent: number;
    currentPoints: number;
    unlockedAchievements: number;
    recentAchievements: number;
  };
  charts: {
    dailyStudyTime: Array<{
      date: string;
      minutes: number;
      hours: number;
    }>;
    activityBreakdown: Record<string, number>;
    recentCourses: Array<{
      title: string;
      thumbnail: string;
      completedAt: string;
    }>;
  };
  period: string;
}

// 积分数据接口
export interface PointsData {
  currentPoints: number;
  totalEarned: number;
  totalSpent: number;
  pointsHistory: Array<{
    id: number;
    public_id: string;
    points: number;
    reason: string;
    ref: any;
    created_at: string;
  }>;
  redemptionHistory: Array<{
    id: number;
    public_id: string;
    points_spent: number;
    original_price_cents: number;
    status: string;
    redemption_date: string;
    completion_date: string;
    course: {
      id: number;
      title: string;
      thumbnail_url: string;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// 成就数据接口
export interface Achievement {
  id: number;
  public_id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  targetValue: number;
  pointsReward: number;
  currentValue: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number;
  rule: any;
}

export interface AchievementsData {
  achievements: Achievement[];
  categories: Record<string, {
    name: string;
    achievements: Achievement[];
    icon: string;
  }>;
  stats: {
    total: number;
    unlocked: number;
    inProgress: number;
    totalPointsEarned: number;
    recentUnlocks: Achievement[];
  };
}

// 获取学习统计数据
export function useLearningStats(period: 'week' | 'month' | 'all' = 'week') {
  return useQuery<{ success: boolean; data: LearningStats }>({
    queryKey: ['learning-stats', period],
    queryFn: () => apiGet(`/api/profile/learning-stats?period=${period}`),
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 10 * 60 * 1000,   // 10分钟
  });
}

// 获取积分数据
export function usePointsData(page = 1, limit = 10) {
  return useQuery<{ success: boolean; data: PointsData }>({
    queryKey: ['points-data', page, limit],
    queryFn: () => apiGet(`/api/profile/points?page=${page}&limit=${limit}`),
    staleTime: 2 * 60 * 1000, // 2分钟
    gcTime: 5 * 60 * 1000,    // 5分钟
  });
}

// 获取成就数据
export function useAchievements(category?: string) {
  return useQuery<{ success: boolean; data: AchievementsData }>({
    queryKey: ['achievements', category],
    queryFn: () => {
      const url = category 
        ? `/api/profile/achievements?category=${category}`
        : '/api/profile/achievements';
      return apiGet(url);
    },
    staleTime: 10 * 60 * 1000, // 10分钟
    gcTime: 30 * 60 * 1000,    // 30分钟
  });
}

// 积分兑换课程
export function useRedeemCourse() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; data: any },
    Error,
    { courseId: number }
  >({
    mutationFn: ({ courseId }) =>
      apiSend({
        url: '/api/profile/points/redeem',
        method: 'POST',
        body: { courseId },
      }),
    onSuccess: () => {
      // 刷新相关数据
      queryClient.invalidateQueries({ queryKey: ['points-data'] });
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// 创建学习会话记录
export function useCreateStudySession() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; data: any },
    Error,
    {
      lessonId?: number;
      courseId?: number;
      sessionStart: string;
      sessionEnd?: string;
      durationMinutes: number;
      activityType: 'video_watching' | 'quiz_taking' | 'reading' | 'practice';
      engagementScore?: number;
      progressMade?: number;
    }
  >({
    mutationFn: (sessionData) =>
      apiSend({
        url: '/api/profile/study-session',
        method: 'POST',
        body: sessionData,
      }),
    onSuccess: () => {
      // 刷新学习统计
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
    },
  });
}

// 辅助函数：格式化学习时间
export function formatStudyTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${remainingMinutes}分钟`;
}

// 辅助函数：计算成就完成度
export function calculateAchievementProgress(current: number, target: number): number {
  return Math.min((current / target) * 100, 100);
}

// 辅助函数：获取成就图标
export function getAchievementIcon(category: string): string {
  const icons = {
    learning: '📚',
    consistency: '🔥',
    social: '👥',
    mastery: '🎯',
    rewards: '💎',
    general: '⭐'
  };
  return icons[category as keyof typeof icons] || '⭐';
}

// 辅助函数：格式化积分历史原因
export function formatPointsReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    'Course redemption': '兑换课程',
    'Achievement unlocked': '解锁成就',
    'Daily check-in': '每日签到',
    'Quiz completion': '完成测验',
    'Course completion': '完成课程',
    'Post creation': '发布帖子',
    'Comment helpful': '有用回复'
  };
  
  return reasonMap[reason] || reason;
}
