import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardStats {
  coursesEnrolled: number;
  coursesCompleted: number;
  totalStudyTime: number;
  currentStreak: number;
  points: number;
}

export interface RecentCourse {
  id: string;
  title: string;
  progress: number;
  lastAccessed: string;
  thumbnail: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'assignment' | 'live_session';
  classroom?: string;
}

export interface DashboardProfile {
  displayName: string;
  avatarUrl: string;
  points: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentCourses: RecentCourse[];
  upcomingEvents: UpcomingEvent[];
  profile: DashboardProfile;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
