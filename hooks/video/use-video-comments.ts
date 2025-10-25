import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api-config';

export interface VideoComment {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  timestamp: number;
  likes: number;
  replies: VideoComment[];
  isLiked: boolean;
  parentId?: string;
}

interface UseVideoCommentsOptions {
  videoId: string | null; // lesson public_id, null when no lesson is selected
  userId?: string;
}

/**
 * Hook to manage video comments with real API integration
 */
export function useVideoComments({ videoId, userId }: UseVideoCommentsOptions) {
  const queryClient = useQueryClient();

  // Fetch comments from API
  const { data: commentsData, isLoading: loading } = useQuery({
    queryKey: ['video-comments', videoId],
    queryFn: async () => {
      const response = await apiSend<any>({
        url: `/api/video/comments?lessonId=${videoId}&sortBy=newest`,
        method: 'GET'
      });
      return response;
    },
    enabled: !!videoId
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      return await apiSend<any>({
        url: '/api/video/comments',
        method: 'POST',
        body: {
          lessonId: videoId,
          content: content.trim(),
          parentId
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
    }
  });

  // Toggle like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      return await apiSend<any>({
        url: `/api/video/comments/${commentId}/likes`,
        method: 'POST',
        body: { isLiked }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await apiSend<any>({
        url: `/api/video/comments/${commentId}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
    }
  });

  // Transform API data to component format
  const comments: VideoComment[] = commentsData?.comments?.map((comment: any) => ({
    id: comment.public_id,
    userId: comment.author?.id || '',
    username: comment.author?.full_name || comment.author?.display_name || 'Anonymous',
    avatar: comment.author?.avatar_url || '/default-avatar.png',
    content: comment.content,
    timestamp: new Date(comment.created_at).getTime(),
    likes: comment.likes_count || 0,
    isLiked: comment.user_has_liked || false,
    replies: comment.replies?.map((reply: any) => ({
      id: reply.public_id,
      userId: reply.author?.id || '',
      username: reply.author?.full_name || reply.author?.display_name || 'Anonymous',
      avatar: reply.author?.avatar_url || '/default-avatar.png',
      content: reply.content,
      timestamp: new Date(reply.created_at).getTime(),
      likes: reply.likes_count || 0,
      isLiked: reply.user_has_liked || false,
      replies: [],
      parentId: comment.public_id
    })) || [],
    parentId: comment.parent_id
  })) || [];

  return {
    comments,
    loading,
    sortBy: 'newest' as const,
    setSortBy: () => {}, // Sorting handled by API
    addComment: (content: string, parentId?: string) => {
      addCommentMutation.mutate({ content, parentId });
      return Promise.resolve('pending');
    },
    toggleLike: (commentId: string) => {
      const comment = comments.find(c => c.id === commentId);
      toggleLikeMutation.mutate({ 
        commentId, 
        isLiked: !comment?.isLiked 
      });
    },
    deleteComment: (commentId: string) => {
      deleteCommentMutation.mutate(commentId);
    },
    loadComments: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
    }
  };
}
