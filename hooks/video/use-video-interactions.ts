'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

// Types
interface VideoStats {
  views: number;
  likes: number;
  dislikes: number;
  publishedAt: string;
  duration: number;
}

interface DanmakuMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  videoTimeSec: number;
  color: string;
  size: 'small' | 'medium' | 'large';
  createdAt: string;
}

interface VideoComment {
  id: string;
  public_id?: string;
  user_id: string;
  userId?: string; // Backward compatibility
  username: string;
  displayName?: string;
  display_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  avatar?: string; // Backward compatibility
  content: string;
  videoTimeSec?: number;
  video_time_sec?: number;
  likesCount?: number;
  likes_count: number;
  likes?: number; // Backward compatibility
  repliesCount?: number;
  replies_count: number;
  parentId?: string;
  parent_id?: string;
  replyToUserId?: string;
  reply_to_user_id?: string;
  replyToUserName?: string;
  reply_to_user_name?: string;
  createdAt?: string;
  created_at: string;
  updatedAt?: string;
  updated_at?: string;
  timestamp?: number; // Backward compatibility
  isLiked?: boolean;
  is_liked?: boolean;
  replies?: VideoComment[];
}

interface VideoView {
  id: string;
  watchDurationSec: number;
  totalDurationSec?: number;
  watchPercentage: number;
  lastPositionSec: number;
  isCompleted: boolean;
  sessionStartTime: string;
  sessionEndTime?: string;
}

// Video Views Hooks
export function useVideoViews(lessonId: string) {
  return useQuery({
    queryKey: ['video-views', lessonId],
    queryFn: async () => {
      const response = await fetch(`/api/video/views?lessonId=${lessonId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch video views');
      }
      
      return response.json();
    },
    enabled: !!lessonId,
    staleTime: 30000, // 30 seconds
  });
}

export function useTrackVideoView() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      lessonId: string;
      attachmentId?: number;
      watchDurationSec: number;
      totalDurationSec?: number;
      lastPositionSec: number;
      isCompleted?: boolean;
      deviceInfo?: any;
    }) => {
      const response = await fetch('/api/video/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to track video view');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the video views cache
      queryClient.invalidateQueries({
        queryKey: ['video-views', variables.lessonId]
      });
    },
    onError: (error) => {
      console.error('Error tracking video view:', error);
    }
  });
}

// Video Likes Hooks
export function useVideoLikes(lessonId: string) {
  return useQuery({
    queryKey: ['video-likes', lessonId],
    queryFn: async () => {
      const response = await fetch(`/api/video/likes?lessonId=${lessonId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch video likes');
      }
      
      return response.json();
    },
    enabled: !!lessonId,
    staleTime: 10000, // 10 seconds
  });
}

export function useToggleVideoLike() {
  const queryClient = useQueryClient();
  const t = useTranslations('VideoPlayer');
  
  return useMutation({
    mutationFn: async (data: {
      lessonId: string;
      attachmentId?: number;
      isLiked?: boolean;
    }) => {
      const response = await fetch('/api/video/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle video like');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the video likes cache
      queryClient.invalidateQueries({
        queryKey: ['video-likes', variables.lessonId]
      });
      
      // Show feedback to user
      if (data.action === 'created') {
        toast.success(data.like?.is_liked ? t('video_liked') : t('video_disliked'));
      } else if (data.action === 'removed') {
        toast.success(t('like_removed'));
      } else if (data.action === 'updated') {
        toast.success(data.like?.is_liked ? t('changed_to_like') : t('changed_to_dislike'));
      }
    },
    onError: (error) => {
      toast.error(t('like_update_failed'));
      console.error('Error toggling video like:', error);
    }
  });
}

// Danmaku Hooks
export function useVideoDanmaku(lessonId: string, startTime?: number, endTime?: number) {
  const params = new URLSearchParams({ lessonId });
  if (startTime !== undefined) params.append('startTime', startTime.toString());
  if (endTime !== undefined) params.append('endTime', endTime.toString());
  
  return useQuery({
    queryKey: ['video-danmaku', lessonId, startTime, endTime],
    queryFn: async () => {
      const response = await fetch(`/api/video/danmaku?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch danmaku');
      }
      
      return response.json();
    },
    enabled: !!lessonId,
    staleTime: 5000, // 5 seconds for real-time feel
  });
}

export function useSendDanmaku() {
  const queryClient = useQueryClient();
  const t = useTranslations('VideoPlayer');
  
  return useMutation({
    mutationFn: async (data: {
      lessonId: string;
      attachmentId?: number;
      content: string;
      videoTimeSec: number;
      color?: string;
      size?: 'small' | 'medium' | 'large';
      displayType?: 'scroll' | 'top' | 'bottom';
    }) => {
      const response = await fetch('/api/video/danmaku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send danmaku');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the danmaku cache
      queryClient.invalidateQueries({
        queryKey: ['video-danmaku', variables.lessonId]
      });
      
      toast.success(t('danmaku_sent'));
    },
    onError: (error: any) => {
      if (error.message.includes('Rate limit')) {
        toast.error(t('danmaku_rate_limit'));
      } else {
        toast.error(t('danmaku_send_failed'));
      }
      console.error('Error sending danmaku:', error);
    }
  });
}

// Video Comments Hooks
export function useVideoComments(
  lessonId: string, 
  parentId?: string, 
  page: number = 1, 
  limit: number = 20,
  sortBy: 'newest' | 'oldest' | 'popular' = 'newest'
) {
  const params = new URLSearchParams({ 
    lessonId, 
    page: page.toString(), 
    limit: limit.toString(),
    sortBy
  });
  if (parentId) params.append('parentId', parentId);
  
  return useQuery({
    queryKey: ['video-comments', lessonId, parentId, page, limit, sortBy],
    queryFn: async () => {
      const response = await fetch(`/api/video/comments?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      return response.json();
    },
    enabled: !!lessonId,
    staleTime: 10000, // 10 seconds
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const t = useTranslations('VideoPlayer');
  
  return useMutation({
    mutationFn: async (data: {
      lessonId: string;
      attachmentId?: number;
      content: string;
      parentId?: string;
      replyToUserId?: string;
      videoTimeSec?: number;
      contentType?: 'text' | 'markdown';
    }) => {
      const response = await fetch('/api/video/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create comment');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant comment queries
      queryClient.invalidateQueries({
        queryKey: ['video-comments', variables.lessonId]
      });
      
      if (variables.parentId) {
        queryClient.invalidateQueries({
          queryKey: ['video-comments', variables.lessonId, variables.parentId]
        });
      }
      
      toast.success(t('comment_posted'));
    },
    onError: (error) => {
      toast.error(t('comment_post_failed'));
      console.error('Error creating comment:', error);
    }
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  const t = useTranslations('VideoPlayer');
  
  return useMutation({
    mutationFn: async (data: {
      commentId: string;
      content: string;
      contentType?: 'text' | 'markdown';
    }) => {
      const response = await fetch('/api/video/comments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update comment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all comment queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['video-comments']
      });
      
      toast.success(t('comment_updated'));
    },
    onError: (error) => {
      toast.error(t('comment_update_failed'));
      console.error('Error updating comment:', error);
    }
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const t = useTranslations('VideoPlayer');
  
  return useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/video/comments?commentId=${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all comment queries
      queryClient.invalidateQueries({
        queryKey: ['video-comments']
      });
      
      toast.success(t('comment_deleted'));
    },
    onError: (error) => {
      toast.error(t('comment_delete_failed'));
      console.error('Error deleting comment:', error);
    }
  });
}

// Comment Likes Hooks
export function useCommentLikes(commentId: string) {
  return useQuery({
    queryKey: ['comment-likes', commentId],
    queryFn: async () => {
      const response = await fetch(`/api/video/comments/${commentId}/likes`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comment likes');
      }
      
      return response.json();
    },
    enabled: !!commentId,
    staleTime: 10000, // 10 seconds
  });
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  const t = useTranslations('VideoPlayer');
  
  return useMutation({
    mutationFn: async (data: {
      commentId: string;
      isLiked?: boolean;
    }) => {
      const response = await fetch(`/api/video/comments/${data.commentId}/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isLiked: data.isLiked }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle comment like');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update comment likes cache
      queryClient.invalidateQueries({
        queryKey: ['comment-likes', variables.commentId]
      });
      
      // Also update comments cache to reflect new like counts
      queryClient.invalidateQueries({
        queryKey: ['video-comments']
      });
    },
    onError: (error) => {
      toast.error(t('like_update_failed'));
      console.error('Error toggling comment like:', error);
    }
  });
}

// Export types for use in components
export type { VideoStats, DanmakuMessage, VideoComment, VideoView };
