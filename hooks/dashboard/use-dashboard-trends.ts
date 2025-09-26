import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TrendData {
  thisWeek: number;
  change: number;
  trend: string;
}

export interface StreakData {
  current: number;
  trend: string;
}

export interface DashboardTrends {
  courseCompletion: TrendData;
  studyTime: TrendData;
  points: TrendData;
  streak: StreakData;
}

export function useDashboardTrends() {
  return useQuery<DashboardTrends>({
    queryKey: ['dashboard-trends'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard/trends');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    refetchOnWindowFocus: true,
  });
}
