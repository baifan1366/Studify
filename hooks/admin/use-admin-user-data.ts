"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";

// User profile data with additional admin info
export interface AdminUserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'student' | 'tutor' | 'admin';
  status: 'active' | 'inactive' | 'banned' | 'pending';
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  // Stats
  total_posts?: number;
  total_comments?: number;
  total_reactions?: number;
  total_messages?: number;
  total_enrolled_courses?: number;
  total_completed_courses?: number;
  total_spent?: number;
}

// Community activity data
export interface UserCommunityActivity {
  posts: {
    id: number;
    title: string;
    created_at: string;
    group_slug: string;
    group_name: string;
    reactions_count: number;
    comments_count: number;
  }[];
  comments: {
    id: number;
    content: string;
    created_at: string;
    post_title: string;
    group_name: string;
  }[];
  reactions: {
    id: number;
    type: string;
    created_at: string;
    post_title: string;
    group_name: string;
  }[];
}

// Chat activity data
export interface UserChatActivity {
  messages: {
    id: number;
    content: string;
    created_at: string;
    classroom_name: string;
    course_title: string;
  }[];
}

// Course activity data
export interface UserCourseActivity {
  enrollments: {
    id: number;
    status: string;
    enrolled_at: string;
    completed_at?: string;
    course_title: string;
    course_id: number;
    progress_percentage?: number;
  }[];
  progress: {
    course_id: number;
    course_title: string;
    completed_lessons: number;
    total_lessons: number;
    last_accessed: string;
    percentage: number;
  }[];
}

// Purchase data
export interface UserPurchaseData {
  orders: {
    id: number;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
    course_title: string;
  }[];
  total_spent_cents: number;
  currency: string;
}

/**
 * Hook to get all users with basic info and stats for admin reports
 */
export function useAdminUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  sortBy?: 'created_at' | 'full_name' | 'total_spent' | 'total_posts';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.search) queryParams.append('search', params.search);
  if (params?.role && params.role !== 'all') queryParams.append('role', params.role);
  if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const url = `/api/admin/users${queryString ? `?${queryString}` : ''}`;

  return useQuery<{
    users: AdminUserProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ["admin-users", params],
    queryFn: () => apiGet(url),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to get detailed user profile for admin
 */
export function useAdminUserProfile(userId: string) {
  return useQuery<AdminUserProfile>({
    queryKey: ["admin-user-profile", userId],
    queryFn: () => apiGet(`/api/admin/users/${userId}`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get user's community activity
 */
export function useUserCommunityActivity(userId: string) {
  return useQuery<UserCommunityActivity>({
    queryKey: ["user-community-activity", userId],
    queryFn: () => apiGet(`/api/admin/users/${userId}/community-activity`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

/**
 * Hook to get user's chat activity
 */
export function useUserChatActivity(userId: string) {
  return useQuery<UserChatActivity>({
    queryKey: ["user-chat-activity", userId],
    queryFn: () => apiGet(`/api/admin/users/${userId}/chat-activity`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

/**
 * Hook to get user's course activity
 */
export function useUserCourseActivity(userId: string) {
  return useQuery<UserCourseActivity>({
    queryKey: ["user-course-activity", userId],
    queryFn: () => apiGet(`/api/admin/users/${userId}/course-activity`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

/**
 * Hook to get user's purchase data
 */
export function useUserPurchaseData(userId: string) {
  return useQuery<UserPurchaseData>({
    queryKey: ["user-purchase-data", userId],
    queryFn: () => apiGet(`/api/admin/users/${userId}/purchase-data`),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update user status (for banning users)
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { userId: string; status: 'active' | 'inactive' | 'banned'; reason?: string }
  >({
    mutationFn: ({ userId, status, reason }) =>
      apiSend({
        url: `/api/admin/users/${userId}/status`,
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: (_, { userId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-profile", userId] });
    },
  });
}

/**
 * Hook to create ban request for a user
 */
export function useCreateUserBan() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; banId: string },
    Error,
    {
      userId: string;
      reason: string;
      targetType: 'user';
      targetId: string;
      expiresAt?: string;
      description?: string;
    }
  >({
    mutationFn: (banData) =>
      apiSend({
        url: "/api/admin/ban/user",
        method: "POST",
        body: banData,
      }),
    onSuccess: () => {
      // Invalidate admin users queries
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["ban-list"] });
    },
  });
}
