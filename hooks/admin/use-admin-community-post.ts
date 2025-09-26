import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiSend } from '@/lib/api-config';

// Interfaces
export interface CommunityPost {
  id: number;
  public_id: string;
  title: string;
  body: string;
  slug: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  author_id: number;
  group_id: number | null;
  // Relations
  author: {
    id: number;
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  group?: {
    id: number;
    name: string;
    slug: string;
  };
  // Stats
  comment_count?: number;
  reaction_count?: number;
  total_reports?: number;
}

export interface CommunityComment {
  id: number;
  public_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  post_id: number;
  author_id: number;
  parent_id: number | null;
  // Relations
  author: {
    id: number;
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  // Stats
  reaction_count?: number;
  total_reports?: number;
}

export interface CommunityPostsResponse {
  posts: CommunityPost[];
  total: number;
  page: number;
  limit: number;
}

export interface CommunityCommentsResponse {
  comments: CommunityComment[];
  total: number;
  page: number;
  limit: number;
}

export interface CommunityStatsResponse {
  total_posts: number;
  total_comments: number;
  total_groups: number;
  total_reports: number;
  posts_with_reports: number;
  comments_with_reports: number;
  top_authors: Array<{
    author: {
      full_name: string;
      email: string;
      avatar_url?: string;
    };
    post_count: number;
  }>;
  top_commented_posts: Array<{
    id: number;
    title: string;
    comment_count: number;
    author: {
      full_name: string;
      email: string;
    };
  }>;
}

// Hooks for fetching community posts
export function useAdminCommunityPosts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'created_at' | 'title' | 'comment_count' | 'reaction_count' | 'total_reports';
  sortOrder?: 'asc' | 'desc';
  groupId?: number;
  authorId?: number;
  hasReports?: boolean;
}) {
  return useQuery<CommunityPostsResponse>({
    queryKey: ['admin-community-posts', params],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.search) queryParams.set('search', params.search);
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);
      if (params?.groupId) queryParams.set('groupId', params.groupId.toString());
      if (params?.authorId) queryParams.set('authorId', params.authorId.toString());
      if (params?.hasReports) queryParams.set('hasReports', params.hasReports.toString());

      const url = `/api/admin/community-post${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return apiGet<CommunityPostsResponse>(url);
    },
  });
}

// Hook for fetching single post details
export function useAdminCommunityPost(postId?: number) {
  return useQuery<CommunityPost>({
    queryKey: ['admin-community-post', postId],
    queryFn: () => {
      if (!postId) throw new Error('Post ID is required');
      return apiGet<CommunityPost>(`/api/admin/community-post/${postId}`);
    },
    enabled: Boolean(postId),
  });
}

// Hook for fetching post comments
export function useAdminPostComments(postId?: number, params?: {
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'reaction_count' | 'total_reports';
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery<CommunityCommentsResponse>({
    queryKey: ['admin-post-comments', postId, params],
    queryFn: () => {
      if (!postId) throw new Error('Post ID is required');
      
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);

      const url = `/api/admin/community-post/${postId}/comments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return apiGet<CommunityCommentsResponse>(url);
    },
    enabled: Boolean(postId),
  });
}

// Hook for community analytics/stats
export function useAdminCommunityStats() {
  return useQuery<CommunityStatsResponse>({
    queryKey: ['admin-community-stats'],
    queryFn: () => apiGet<CommunityStatsResponse>('/api/admin/community-post/stats'),
  });
}

// Hook for creating ban request for post
export function useCreatePostBan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      postId: number;
      reason: string;
      targetType: 'post';
      description?: string;
      expiresAt?: string;
    }) => {
      return apiSend({
        method: 'POST',
        url: '/api/ban',
        body: {
          target_type: data.targetType,
          target_id: data.postId,
          reason: data.reason,
          description: data.description,
          expires_at: data.expiresAt,
          status: 'pending',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['ban'] });
      toast({
        title: 'Ban Request Created',
        description: 'Post ban request has been created and is pending review.',
      });
    },
    onError: (error) => {
      console.error('Create post ban error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ban request.',
        variant: 'destructive',
      });
    },
  });
}

// Hook for creating ban request for comment
export function useCreateCommentBan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      commentId: number;
      reason: string;
      targetType: 'comment';
      description?: string;
      expiresAt?: string;
    }) => {
      return apiSend({
        method: 'POST',
        url: '/api/ban',
        body: {
          target_type: data.targetType,
          target_id: data.commentId,
          reason: data.reason,
          description: data.description,
          expires_at: data.expiresAt,
          status: 'pending',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-post-comments'] });
      queryClient.invalidateQueries({ queryKey: ['ban'] });
      toast({
        title: 'Ban Request Created',
        description: 'Comment ban request has been created and is pending review.',
      });
    },
    onError: (error) => {
      console.error('Create comment ban error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ban request.',
        variant: 'destructive',
      });
    },
  });
}

// Hook for creating user ban request from post/comment
export function useCreateUserBanFromContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      reason: string;
      targetType: 'user';
      description?: string;
      expiresAt?: string;
      sourceContentType?: 'post' | 'comment';
      sourceContentId?: number;
    }) => {
      return apiSend({
        method: 'POST',
        url: '/api/ban',
        body: {
          target_type: data.targetType,
          target_id: data.userId,
          reason: data.reason,
          description: data.description,
          expires_at: data.expiresAt,
          status: 'pending',
          metadata: data.sourceContentType && data.sourceContentId ? {
            source_content_type: data.sourceContentType,
            source_content_id: data.sourceContentId,
          } : undefined,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-post-comments'] });
      queryClient.invalidateQueries({ queryKey: ['ban'] });
      toast({
        title: 'Ban Request Created',
        description: 'User ban request has been created and is pending review.',
      });
    },
    onError: (error) => {
      console.error('Create user ban error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ban request.',
        variant: 'destructive',
      });
    },
  });
}