import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

// 数据类型定义
export interface DailyPlanTask {
  id: number;
  public_id: string;
  plan_id: number;
  task_title: string;
  task_description: string;
  task_type: 'study' | 'review' | 'quiz' | 'reading' | 'practice' | 'video' | 'exercise' | 'project';
  related_course_id?: number;
  related_lesson_id?: number;
  related_content_type?: string;
  related_content_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_minutes: number;
  actual_minutes?: number;
  points_reward: number;
  is_completed: boolean;
  completion_progress: number;
  completed_at?: string;
  position: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyLearningPlan {
  id: number;
  public_id: string;
  user_id: number;
  plan_date: string;
  plan_title: string;
  plan_description: string;
  ai_insights: string;
  motivation_message: string;
  total_tasks: number;
  completed_tasks: number;
  total_points: number;
  earned_points: number;
  estimated_duration_minutes: number;
  actual_duration_minutes: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  completion_rate: number;
  ai_model_version: string;
  generation_context: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tasks?: DailyPlanTask[];
}

export interface LearningRetrospective {
  id: number;
  public_id: string;
  user_id: number;
  plan_id?: number;
  retro_date: string;
  retro_type: 'daily' | 'weekly' | 'monthly';
  self_rating?: number;
  mood_rating?: 'very_bad' | 'bad' | 'neutral' | 'good' | 'excellent';
  energy_level?: number;
  focus_quality?: number;
  achievements_today?: string;
  challenges_faced?: string;
  lessons_learned?: string;
  improvements_needed?: string;
  tomorrow_goals?: string;
  ai_analysis?: string;
  ai_suggestions?: string;
  ai_next_focus?: string;
  strengths_identified?: string;
  weaknesses_identified?: string;
  learning_patterns?: string;
  study_time_minutes: number;
  tasks_completed: number;
  points_earned: number;
  courses_progressed: number;
  achievements_unlocked: number;
  ai_model_version?: string;
  analysis_context?: any;
  created_at: string;
  updated_at: string;
}

export interface CoachSettings {
  id: number;
  user_id: number;
  daily_plan_time: string;
  evening_retro_time: string;
  preferred_difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  target_daily_minutes: number;
  max_daily_tasks: number;
  enable_daily_plan: boolean;
  enable_task_reminders: boolean;
  enable_evening_retro: boolean;
  enable_motivation_messages: boolean;
  enable_achievement_celebrations: boolean;
  enable_streak_reminders: boolean;
  coaching_style: 'gentle' | 'balanced' | 'intensive' | 'adaptive';
  motivation_type: 'achievement' | 'progress' | 'social' | 'learning' | 'mixed';
  preferred_session_length: number;
  break_reminder_interval: number;
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
}

// 1. 获取今日学习计划
export function useDailyPlan(date?: string) {
  return useQuery({
    queryKey: ['daily-plan', date || 'today'],
    queryFn: async () => {
      const params = date ? `?date=${date}` : '';
      const response = await apiGet<any>(`/api/ai/coach/daily-plan${params}`);
      // API returns { success: true, plan: plan || null, date }
      return (response as any).plan || null;
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
    gcTime: 10 * 60 * 1000, // 10分钟后垃圾回收
  });
}

// 2. 生成每日学习计划
export function useGenerateDailyPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiPost<any>('/api/ai/coach/daily-plan', {});
      // API returns { success: true, plan: savedPlan, message: string }
      return response;
    },
    onSuccess: (data) => {
      // 刷新今日计划缓存
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      
      const response = data as any;
      toast({
        title: "学习计划生成成功",
        description: `为您生成了 ${response.plan?.total_tasks || 0} 个学习任务`,
      });
    },
    onError: (error: any) => {
      console.error('Generate daily plan error:', error);
      toast({
        title: "生成计划失败",
        description: "请稍后重试或联系客服",
        variant: "destructive",
      });
    },
  });
}

// 3. 更新任务完成状态
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      isCompleted, 
      actualMinutes 
    }: { 
      taskId: string; 
      isCompleted: boolean; 
      actualMinutes?: number;
    }) => {
      const response = await apiPatch('/api/ai/coach/daily-plan', {
        taskId,
        isCompleted,
        actualMinutes
      });
      // API returns { success: true, task: updatedTask, pointsEarned: number }
      return response;
    },
    onSuccess: (data, variables) => {
      // 刷新计划缓存
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      
      const response = data as any;
      if (variables.isCompleted && response.pointsEarned > 0) {
        toast({
          title: "任务完成！",
          description: `恭喜获得 ${response.pointsEarned} 积分 🎉`,
        });
      }
    },
    onError: (error: any) => {
      console.error('Update task status error:', error);
      toast({
        title: "更新失败",
        description: "任务状态更新失败，请重试",
        variant: "destructive",
      });
    },
  });
}

// 4. 创建学习复盘
export function useCreateRetrospective() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (retroData: {
      retroDate?: string;
      retroType?: 'daily' | 'weekly' | 'monthly';
      selfRating?: number;
      moodRating?: 'very_bad' | 'bad' | 'neutral' | 'good' | 'excellent';
      energyLevel?: number;
      focusQuality?: number;
      achievementsToday?: string;
      challengesFaced?: string;
      lessonsLearned?: string;
      improvementsNeeded?: string;
      tomorrowGoals?: string;
    }) => {
      const response = await apiPost<any>('/api/ai/coach/retro', retroData);
      return (response as any).data;
    },
    onSuccess: (data) => {
      // 刷新复盘缓存
      queryClient.invalidateQueries({ queryKey: ['retrospectives'] });
      
      toast({
        title: "学习复盘完成",
        description: "AI已为您生成深度分析和改进建议",
      });
    },
    onError: (error: any) => {
      console.error('Create retrospective error:', error);
      toast({
        title: "复盘保存失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });
}

// 5. 获取学习复盘记录
export function useRetrospectives(options?: {
  date?: string;
  type?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}) {
  const { date, type = 'daily', limit = 10 } = options || {};
  
  return useQuery({
    queryKey: ['retrospectives', date, type, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (type) params.append('type', type);
      if (limit) params.append('limit', limit.toString());
      
      const response = await apiGet<any>(`/api/ai/coach/retro?${params.toString()}`);
      return (response as any).data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// 6. 获取今日复盘
export function useTodayRetrospective() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['retrospective', 'today'],
    queryFn: async () => {
      const response = await apiGet<any>(`/api/ai/coach/retro?date=${today}&type=daily`);
      return (response as any).data.retrospectives?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// 7. 辅助函数：计算学习计划统计
export function usePlanStats(plan: DailyLearningPlan | null) {
  if (!plan) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      totalPoints: 0,
      earnedPoints: 0,
      estimatedTime: 0,
      actualTime: 0,
      remainingTime: 0,
      isCompleted: false
    };
  }

  const completedTasks = plan.tasks?.filter(task => task.is_completed).length || 0;
  const totalTasks = plan.tasks?.length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const earnedPoints = plan.tasks?.filter(task => task.is_completed)
    .reduce((sum, task) => sum + task.points_reward, 0) || 0;
  const actualTime = plan.tasks?.filter(task => task.is_completed)
    .reduce((sum, task) => sum + (task.actual_minutes || 0), 0) || 0;
  const remainingTime = Math.max(0, plan.estimated_duration_minutes - actualTime);

  return {
    totalTasks,
    completedTasks,
    completionRate,
    totalPoints: plan.total_points,
    earnedPoints,
    estimatedTime: plan.estimated_duration_minutes,
    actualTime,
    remainingTime,
    isCompleted: completionRate >= 100
  };
}

// 8. 辅助函数：格式化时间
export function formatDuration(minutes: number): string {
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

// 9. 辅助函数：获取任务类型图标和颜色
export function getTaskTypeInfo(type: DailyPlanTask['task_type']) {
  const typeMap = {
    study: { icon: '📚', color: 'blue', label: '学习' },
    review: { icon: '🔄', color: 'green', label: '复习' },
    quiz: { icon: '📝', color: 'orange', label: '测验' },
    reading: { icon: '📖', color: 'purple', label: '阅读' },
    practice: { icon: '⚡', color: 'yellow', label: '练习' },
    video: { icon: '🎥', color: 'red', label: '视频' },
    exercise: { icon: '🏃', color: 'teal', label: '作业' },
    project: { icon: '🛠️', color: 'gray', label: '项目' }
  };
  
  return typeMap[type] || { icon: '📌', color: 'gray', label: '任务' };
}

// 10. 辅助函数：获取优先级信息
export function getPriorityInfo(priority: DailyPlanTask['priority']) {
  const priorityMap = {
    low: { color: 'gray', label: '低', order: 1 },
    medium: { color: 'blue', label: '中', order: 2 },
    high: { color: 'orange', label: '高', order: 3 },
    urgent: { color: 'red', label: '紧急', order: 4 }
  };
  
  return priorityMap[priority] || { color: 'gray', label: '普通', order: 1 };
}

// 11. 辅助函数：获取心情评级信息
export function getMoodInfo(mood: LearningRetrospective['mood_rating']) {
  const moodMap = {
    very_bad: { emoji: '😰', color: 'red', label: '很糟糕' },
    bad: { emoji: '😔', color: 'orange', label: '不太好' },
    neutral: { emoji: '😐', color: 'gray', label: '一般' },
    good: { emoji: '😊', color: 'blue', label: '不错' },
    excellent: { emoji: '🤩', color: 'green', label: '很棒' }
  };
  
  return mood ? moodMap[mood] : { emoji: '😐', color: 'gray', label: '未评价' };
}
