import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export interface UserPreferences {
  weekly_study_goal_hours: number;
  daily_study_goal_minutes: number;
  preferred_study_time: 'morning' | 'afternoon' | 'evening' | 'night';
  difficulty_preference: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  notification_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  break_reminder_interval: number; // minutes
  auto_play_next_lesson: boolean;
  progress_visibility: 'public' | 'friends' | 'private';
  achievement_notifications: boolean;
}

export interface UserPreferencesResponse {
  preferences: UserPreferences;
  theme: string;
  language: string;
  notification_settings: any;
  privacy_settings: any;
}

export interface UpdatePreferencesArgs {
  preferences?: Partial<UserPreferences>;
  theme?: string;
  language?: string;
  notification_settings?: any;
  privacy_settings?: any;
}

// 获取用户偏好设置
export function useUserPreferences() {
  return useQuery<UserPreferencesResponse>({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const response = await api.get('/api/user-preferences');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    refetchOnWindowFocus: false,
  });
}

// 更新用户偏好设置
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const t = useTranslations('ProfileContent');

  return useMutation({
    mutationFn: async (data: UpdatePreferencesArgs) => {
      const response = await api.patch('/api/user-preferences', data);
      return response.data;
    },
    onSuccess: (data) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast.success(t('preferences_updated'));
    },
    onError: (error: any) => {
      console.error('Error updating preferences:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update preferences';
      toast.error(errorMessage);
    },
  });
}

// 快捷函数：仅更新学习偏好
export function useUpdateLearningPreferences() {
  const queryClient = useQueryClient();
  const t = useTranslations('ProfileContent');

  return useMutation({
    mutationFn: async (preferences: Partial<UserPreferences>) => {
      const response = await api.patch('/api/user-preferences', { preferences });
      return response.data;
    },
    onSuccess: (data) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast.success(t('learning_preferences_updated'));
    },
    onError: (error: any) => {
      console.error('Error updating learning preferences:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update learning preferences';
      toast.error(errorMessage);
    },
  });
}

// 快捷函数：设置每周学习目标
export function useSetWeeklyStudyGoal() {
  const updateMutation = useUpdateLearningPreferences();
  const t = useTranslations('ProfileContent');

  return useMutation({
    mutationFn: async (hours: number) => {
      if (hours < 1 || hours > 168) {
        throw new Error('Weekly study goal must be between 1 and 168 hours');
      }
      return updateMutation.mutateAsync({ weekly_study_goal_hours: hours });
    },
    onSuccess: () => {
      toast.success(t('weekly_goal_updated'));
    },
    onError: (error: any) => {
      console.error('Error setting weekly goal:', error);
      toast.error(error.message || 'Failed to update weekly goal');
    },
  });
}

// 快捷函数：设置每日学习目标
export function useSetDailyStudyGoal() {
  const updateMutation = useUpdateLearningPreferences();
  const t = useTranslations('ProfileContent');

  return useMutation({
    mutationFn: async (minutes: number) => {
      if (minutes < 5 || minutes > 480) {
        throw new Error('Daily study goal must be between 5 minutes and 8 hours');
      }
      return updateMutation.mutateAsync({ daily_study_goal_minutes: minutes });
    },
    onSuccess: () => {
      toast.success(t('daily_goal_updated'));
    },
    onError: (error: any) => {
      console.error('Error setting daily goal:', error);
      toast.error(error.message || 'Failed to update daily goal');
    },
  });
}
