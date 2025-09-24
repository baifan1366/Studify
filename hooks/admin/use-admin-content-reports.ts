import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';
import { Course } from '@/interface';
import { Post } from '@/interface/community/post-interface';
import { Comment } from '@/interface/community/comment-interface';

// Types for content reports
export interface ContentItem {
  id: number;
  type: 'course' | 'post' | 'comment';
  title?: string;
  content?: string;
  body?: string;
  author_id?: number;
  user_id?: number;
  created_at: string;
  updated_at?: string;
  status?: string;
  author_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  // Engagement metrics
  comment_count?: number;
  reaction_count?: number;
  reactions?: Record<string, number>;
  // Report metrics
  report_count?: number;
  recent_reports?: ReportInfo[];
}

export interface ReportInfo {
  id: string;
  reason: string;
  created_at: string;
  reporter_id: string;
  reporter_profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface EngagementStats {
  most_commented: ContentItem[];
  most_reacted: ContentItem[];
  top_creators: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    total_content: number;
    posts_count: number;
    comments_count: number;
    courses_count: number;
  }[];
}

export interface ContentReportsFilters {
  content_type?: 'all' | 'course' | 'post' | 'comment';
  time_period?: 'all' | 'today' | 'week' | 'month' | 'year';
  has_reports?: boolean;
  min_reports?: number;
  search?: string;
  sort_by?: 'created_at' | 'report_count' | 'engagement' | 'author';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Hook to get all content with reports and engagement data
export function useContentReports(filters?: ContentReportsFilters) {
  return useQuery<{
    data: ContentItem[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['admin-content-reports', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.content_type && filters.content_type !== 'all') {
        params.append('content_type', filters.content_type);
      }
      if (filters?.time_period && filters.time_period !== 'all') {
        params.append('time_period', filters.time_period);
      }
      if (filters?.has_reports !== undefined) {
        params.append('has_reports', filters.has_reports.toString());
      }
      if (filters?.min_reports) {
        params.append('min_reports', filters.min_reports.toString());
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.sort_by) {
        params.append('sort_by', filters.sort_by);
      }
      if (filters?.sort_order) {
        params.append('sort_order', filters.sort_order);
      }
      if (filters?.page) {
        params.append('page', filters.page.toString());
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }

      const queryString = params.toString();
      const url = `/api/admin/content-reports${queryString ? `?${queryString}` : ''}`;
      
      return apiGet<{
        data: ContentItem[];
        total: number;
        page: number;
        limit: number;
      }>(url);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to get engagement statistics
export function useEngagementStats(timePeriod?: string) {
  return useQuery<EngagementStats>({
    queryKey: ['admin-engagement-stats', timePeriod],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timePeriod && timePeriod !== 'all') {
        params.append('time_period', timePeriod);
      }
      
      const queryString = params.toString();
      const url = `/api/admin/engagement-stats${queryString ? `?${queryString}` : ''}`;
      
      return apiGet<EngagementStats>(url);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get content details by type and ID
export function useContentDetails(contentType: 'course' | 'post' | 'comment', contentId: number) {
  return useQuery<ContentItem>({
    queryKey: ['admin-content-details', contentType, contentId],
    queryFn: () => {
      return apiGet<ContentItem>(`/api/admin/content-details/${contentType}/${contentId}`);
    },
    enabled: Boolean(contentType && contentId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to get reports for specific content
export function useContentReportsList(contentType: string, contentId: number) {
  return useQuery<ReportInfo[]>({
    queryKey: ['admin-content-reports-list', contentType, contentId],
    queryFn: () => {
      return apiGet<ReportInfo[]>(`/api/admin/content-reports/${contentType}/${contentId}`);
    },
    enabled: Boolean(contentType && contentId),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

// Hook to create a ban request for content
export function useCreateContentBan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (banData: {
      target_type: 'course' | 'post' | 'comment' | 'user';
      target_id: number;
      reason: string;
      description?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      expires_at?: string;
    }) => {
      return apiSend({
        url: '/api/admin/create-content-ban',
        method: 'POST',
        body: banData,
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-content-reports'] });
      queryClient.invalidateQueries({ queryKey: ['ban'] });
      queryClient.invalidateQueries({ queryKey: ['admin-content-details'] });
    },
  });
}

// Hook to update content status (for courses/posts)
export function useUpdateContentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statusData: {
      content_type: 'course' | 'post' | 'comment';
      content_id: number;
      status: string;
      reason?: string;
    }) => {
      return apiSend({
        url: '/api/admin/update-content-status',
        method: 'PATCH',
        body: statusData,
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-content-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-content-details'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// Hook to get user activity summary
export function useUserActivitySummary(userId: string, timePeriod?: string) {
  return useQuery<{
    user_profile: {
      id: string;
      full_name: string;
      avatar_url?: string;
      created_at: string;
    };
    content_stats: {
      total_courses: number;
      total_posts: number;
      total_comments: number;
      total_reactions_given: number;
      total_reactions_received: number;
    };
    recent_activity: ContentItem[];
    report_stats: {
      total_reports_made: number;
      total_reports_received: number;
      recent_reports_made: ReportInfo[];
      recent_reports_received: ReportInfo[];
    };
  }>({
    queryKey: ['admin-user-activity-summary', userId, timePeriod],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timePeriod && timePeriod !== 'all') {
        params.append('time_period', timePeriod);
      }
      
      const queryString = params.toString();
      const url = `/api/admin/user-activity-summary/${userId}${queryString ? `?${queryString}` : ''}`;
      
      return apiGet(url);
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to get trending content
export function useTrendingContent(timePeriod?: string) {
  return useQuery<{
    trending_posts: ContentItem[];
    trending_courses: ContentItem[];
    most_reported: ContentItem[];
  }>({
    queryKey: ['admin-trending-content', timePeriod],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timePeriod && timePeriod !== 'all') {
        params.append('time_period', timePeriod);
      }
      
      const queryString = params.toString();
      const url = `/api/admin/trending-content${queryString ? `?${queryString}` : ''}`;
      
      return apiGet(url);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
