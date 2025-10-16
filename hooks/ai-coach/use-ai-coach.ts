import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

// Data type definitions
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

// 1. Get today's learning plan
export function useDailyPlan(date?: string) {
  return useQuery({
    queryKey: ['daily-plan', date || 'today'],
    queryFn: async () => {
      const params = date ? `?date=${date}` : '';
      const response = await apiGet<any>(`/api/ai/coach/daily-plan${params}`);
      // API returns { success: true, plan: plan || null, date }
      return (response as any).plan || null;
    },
    staleTime: 5 * 60 * 1000, // Don't refetch within 5 minutes
    gcTime: 10 * 60 * 1000, // Garbage collect after 10 minutes
  });
}

// 2. Generate daily learning plan
// Enhanced with learning paths and AI notes context for personalized planning
export function useGenerateDailyPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Force regeneration even if plan exists for today
      const response = await apiPost<any>('/api/ai/coach/daily-plan', {
        forceRegenerate: true
      });
      // API returns { success: true, plan: savedPlan, message: string }
      return response;
    },
    onSuccess: (data) => {
      const response = data as any;
      const today = new Date().toISOString().split('T')[0];
      
      // Immediately update the cache with new data
      queryClient.setQueryData(['daily-plan', 'today'], response.plan);
      queryClient.setQueryData(['daily-plan', today], response.plan);
      
      // Also invalidate to ensure fresh data on next mount
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      
      toast({
        title: "Learning Plan Generated Successfully",
        description: `Generated ${response.plan?.total_tasks || 0} learning tasks for you`,
      });
    },
    onError: (error: any) => {
      console.error('Generate daily plan error:', error);
      toast({
        title: "Plan Generation Failed",
        description: "Please try again later or contact support",
        variant: "destructive",
      });
    },
  });
}

// 3. Update task completion status
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
    onMutate: async (variables) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['daily-plan'] });
      
      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData(['daily-plan', 'today']);
      
      // Optimistically update the cache
      queryClient.setQueryData(['daily-plan', 'today'], (old: any) => {
        if (!old || !old.tasks) return old;
        
        return {
          ...old,
          tasks: old.tasks.map((task: any) => 
            task.public_id === variables.taskId
              ? { 
                  ...task, 
                  is_completed: variables.isCompleted,
                  actual_minutes: variables.actualMinutes || task.actual_minutes,
                  completed_at: variables.isCompleted ? new Date().toISOString() : null
                }
              : task
          )
        };
      });
      
      return { previousPlan };
    },
    onSuccess: (data, variables) => {
      // Refresh plan cache to sync with server
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      
      const response = data as any;
      if (variables.isCompleted && response.pointsEarned > 0) {
        toast({
          title: "Task Completed!",
          description: `Congratulations! You earned ${response.pointsEarned} points 🎉`,
        });
      }
    },
    onError: (error: any, variables, context: any) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(['daily-plan', 'today'], context.previousPlan);
      }
      
      console.error('Update task status error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update task status, please try again",
        variant: "destructive",
      });
    },
  });
}

// 4. Create learning retrospective
// Enhanced with learning paths and AI notes context for comprehensive analysis
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
      // Refresh retrospectives cache
      queryClient.invalidateQueries({ queryKey: ['retrospectives'] });
      
      toast({
        title: "Learning Reflection Completed",
        description: "AI has generated in-depth analysis and improvement suggestions for you",
      });
    },
    onError: (error: any) => {
      console.error('Create retrospective error:', error);
      toast({
        title: "Reflection Save Failed",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });
}

// 5. Get learning retrospective records
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

// 6. Get today's retrospective
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

// 7. Helper function: Calculate learning plan statistics
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

// 8. Helper function: Format duration
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hours`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

// 9. Helper function: Get task type icon and color
export function getTaskTypeInfo(type: DailyPlanTask['task_type']) {
  const typeMap = {
    study: { icon: '📚', color: 'blue', label: 'Study' },
    review: { icon: '🔄', color: 'green', label: 'Review' },
    quiz: { icon: '📝', color: 'orange', label: 'Quiz' },
    reading: { icon: '📖', color: 'purple', label: 'Reading' },
    practice: { icon: '⚡', color: 'yellow', label: 'Practice' },
    video: { icon: '🎥', color: 'red', label: 'Video' },
    exercise: { icon: '🏃', color: 'teal', label: 'Exercise' },
    project: { icon: '🛠️', color: 'gray', label: 'Project' }
  };
  
  return typeMap[type] || { icon: '📌', color: 'gray', label: 'Task' };
}

// 10. Helper function: Get priority info
export function getPriorityInfo(priority: DailyPlanTask['priority']) {
  const priorityMap = {
    low: { color: 'gray', label: 'Low', order: 1 },
    medium: { color: 'blue', label: 'Medium', order: 2 },
    high: { color: 'orange', label: 'High', order: 3 },
    urgent: { color: 'red', label: 'Urgent', order: 4 }
  };
  
  return priorityMap[priority] || { color: 'gray', label: 'Normal', order: 1 };
}

// 11. Helper function: Get mood rating info
export function getMoodInfo(mood: LearningRetrospective['mood_rating']) {
  const moodMap = {
    very_bad: { emoji: '😰', color: 'red', label: 'Very Bad' },
    bad: { emoji: '😔', color: 'orange', label: 'Not Good' },
    neutral: { emoji: '😐', color: 'gray', label: 'Neutral' },
    good: { emoji: '😊', color: 'blue', label: 'Good' },
    excellent: { emoji: '🤩', color: 'green', label: 'Excellent' }
  };
  
  return mood ? moodMap[mood] : { emoji: '😐', color: 'gray', label: 'Not Rated' };
}
