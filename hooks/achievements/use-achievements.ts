import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  category: 'learning' | 'consistency' | 'community' | 'performance' | 'habits';
}

export interface AchievementsData {
  achievements: Achievement[];
  totalPoints: number;
  unlockedCount: number;
  totalCount: number;
}

export function useAchievements() {
  return useQuery<AchievementsData>({
    queryKey: ['achievements'],
    queryFn: async () => {
      const response = await api.get('/achievements');
      return response.data;
    },
  });
}

export function useUnlockAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await api.post('/achievements', { achievementId });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch achievements
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      // Also invalidate user profile to update points
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
