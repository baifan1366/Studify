// hooks/admin/use-admin-analytics.ts

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export interface AdminAnalytics {
  userStats: {
    total: number;
    new: number;
    active: number;
    banned: number;
    roleDistribution: Record<string, number>;
  };
  contentStats: {
    courses: number;
    classrooms: number;
    communityPosts: number;
    enrollments: number;
  };
  recentActivity: Array<{
    id: number;
    action: string;
    subject_type: string;
    created_at: string;
    meta: any;
    profiles?: {
      display_name?: string;
      email?: string;
    };
  }>;
  dailyRegistrations: Record<string, number>;
  period: number;
}

export interface RoleStats {
  roleStats: {
    admin: number;
    tutor: number;
    student: number;
    total: number;
  };
  rolePermissions: Record<string, {
    name: string;
    description: string;
    permissions: string[];
  }>;
}

// Get system analytics
export function useAdminAnalytics(period: number = 30) {
  return useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: () => adminApi.getAnalytics(period),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Get role statistics and permissions
export function useAdminRoles() {
  return useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminApi.getRoles(),
    staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes
  });
}
