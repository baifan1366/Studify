import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";

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
  categories: Record<
    string,
    {
      nameKey: string; // i18n key for category name
      achievements: Achievement[];
      iconKey: string; // i18n key for category icon
    }
  >;
  stats: {
    total: number;
    unlocked: number;
    inProgress: number;
    totalPointsEarned: number;
    recentUnlocks: Achievement[];
  };
}

// 获取学习统计数据
export function useLearningStats(period: "week" | "month" | "all" = "week") {
  return useQuery<LearningStats>({
    queryKey: ["learning-stats", period],
    queryFn: () => apiGet(`/api/profile/learning-stats?period=${period}`),
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 10 * 60 * 1000, // 10分钟
  });
}

// 获取积分数据
export function usePointsData(page = 1, limit = 10) {
  return useQuery<PointsData>({
    queryKey: ["points-data", page, limit],
    queryFn: () => apiGet(`/api/profile/points?page=${page}&limit=${limit}`),
    staleTime: 2 * 60 * 1000, // 2分钟
    gcTime: 5 * 60 * 1000, // 5分钟
  });
}

// 获取成就数据
export function useAchievements(category?: string) {
  return useQuery<AchievementsData>({
    queryKey: ["achievements", category],
    queryFn: () => {
      const url = category
        ? `/api/profile/achievements?category=${category}`
        : "/api/profile/achievements";
      return apiGet(url);
    },
    staleTime: 10 * 60 * 1000, // 10分钟
    gcTime: 30 * 60 * 1000, // 30分钟
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
        url: "/api/profile/points/redeem",
        method: "POST",
        body: { courseId },
      }),
    onSuccess: () => {
      // 刷新相关数据
      queryClient.invalidateQueries({ queryKey: ["points-data"] });
      queryClient.invalidateQueries({ queryKey: ["learning-stats"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] }); // Fixed: match the actual query key
      queryClient.invalidateQueries({ queryKey: ["enrolledCourse"] }); // Also invalidate individual enrollment checks
      queryClient.invalidateQueries({ queryKey: ["profile"] });
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
      lessonId?: string; // Changed to string (UUID/public_id)
      courseId?: string; // Changed to string (UUID/public_id)
      sessionStart: string;
      sessionEnd?: string;
      durationMinutes: number;
      activityType: "video_watching" | "quiz_taking" | "reading" | "practice";
      engagementScore?: number;
      progressMade?: number;
      idempotencyKey?: string;
    }
  >({
    mutationFn: (sessionData) =>
      apiSend({
        url: "/api/profile/study-session",
        method: "POST",
        body: sessionData,
      }),
    onSuccess: () => {
      // 刷新学习统计
      queryClient.invalidateQueries({ queryKey: ["learning-stats"] });
    },
  });
}

// Helper function: Format study time
// Note: This function returns time in a locale-agnostic format (e.g., "2h 30m")
// For full i18n support, use the translation keys in your component
export function formatStudyTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

// Helper function: Get study time parts for i18n
// Returns an object with hours and minutes for use with translation keys
export function getStudyTimeParts(minutes: number): { hours: number; minutes: number; totalMinutes: number } {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return {
    hours,
    minutes: remainingMinutes,
    totalMinutes: minutes,
  };
}

// 辅助函数：计算成就完成度
export function calculateAchievementProgress(
  current: number,
  target: number
): number {
  return Math.min((current / target) * 100, 100);
}

// 辅助函数：获取成就图标
export function getAchievementIcon(category: string): string {
  const icons = {
    learning: "📚",
    consistency: "🔥",
    social: "👥",
    mastery: "🎯",
    rewards: "💎",
    general: "⭐",
  };
  return icons[category as keyof typeof icons] || "⭐";
}

// Helper function: Get points reason translation key
// Returns the translation key for the reason, to be used with useTranslations
export function getPointsReasonKey(reason: string): string {
  const reasonKeyMap: Record<string, string> = {
    "Course redemption": "course_redemption",
    "Achievement unlocked": "achievement_unlocked",
    "Daily check-in": "daily_check_in",
    "Quiz completion": "quiz_completion",
    "Course completion": "course_completion",
    "Post creation": "post_creation",
    "Comment helpful": "comment_helpful",
  };

  return reasonKeyMap[reason] || "unknown_reason";
}

// Legacy function for backward compatibility
// Note: For i18n, use getPointsReasonKey() with useTranslations instead
export function formatPointsReason(reason: string): string {
  return reason;
}
