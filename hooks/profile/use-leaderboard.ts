import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-config';

// 排行榜用户数据接口
export interface LeaderboardUser {
  rank: number;
  userId: number;
  publicId: string;
  displayName: string;
  avatarUrl: string;
  points: number;
  isCurrentUser: boolean;
  badge?: string;
}

// 排行榜数据接口
export interface LeaderboardData {
  period: 'weekly' | 'monthly' | 'all-time';
  users: LeaderboardUser[];
  currentUserRank?: {
    rank: number;
    points: number;
    percentile: number;
  };
  totalParticipants: number;
  updatedAt: string;
}

// 获取周排行榜
export function useWeeklyLeaderboard(limit = 10) {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'weekly', limit],
    queryFn: () => apiGet(`/api/leaderboard/weekly?limit=${limit}`),
    staleTime: 2 * 60 * 1000, // 2分钟
    gcTime: 5 * 60 * 1000,    // 5分钟
  });
}

// 获取月排行榜
export function useMonthlyLeaderboard(limit = 10) {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'monthly', limit],
    queryFn: () => apiGet(`/api/leaderboard/monthly?limit=${limit}`),
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 10 * 60 * 1000,   // 10分钟
  });
}

// 获取全时排行榜
export function useAllTimeLeaderboard(limit = 10) {
  return useQuery<LeaderboardData>({
    queryKey: ['leaderboard', 'all-time', limit],
    queryFn: () => apiGet(`/api/leaderboard/all-time?limit=${limit}`),
    staleTime: 10 * 60 * 1000, // 10分钟
    gcTime: 30 * 60 * 1000,    // 30分钟
  });
}

// 辅助函数：获取排名徽章
export function getRankBadge(rank: number): string {
  if (rank === 1) return '👑';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

// 辅助函数：获取排名颜色类
export function getRankColorClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500 text-black';
  if (rank === 2) return 'bg-gray-400 text-black';
  if (rank === 3) return 'bg-orange-500 text-black';
  return 'bg-white/20 text-white';
}
