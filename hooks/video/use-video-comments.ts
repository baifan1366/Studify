import { useState, useCallback } from 'react';

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
  videoId: string;
  userId?: string;
}

export function useVideoComments({ videoId, userId }: UseVideoCommentsOptions) {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'likes'>('newest');

  const addComment = useCallback((content: string, parentId?: string) => {
    const newComment: VideoComment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      userId: userId || 'anonymous',
      username: '当前用户',
      avatar: '/default-avatar.png',
      content: content.trim(),
      timestamp: Date.now(),
      likes: 0,
      replies: [],
      isLiked: false,
      parentId
    };

    setComments(prev => {
      if (parentId) {
        // Add as reply to existing comment
        return prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...comment.replies, newComment]
            };
          }
          return comment;
        });
      } else {
        // Add as top-level comment
        return [newComment, ...prev];
      }
    });

    return newComment.id;
  }, [userId]);

  const toggleLike = useCallback((commentId: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      
      // Check replies
      if (comment.replies.some(reply => reply.id === commentId)) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply.id === commentId) {
              return {
                ...reply,
                isLiked: !reply.isLiked,
                likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
              };
            }
            return reply;
          })
        };
      }
      
      return comment;
    }));
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    setComments(prev => {
      // Remove top-level comment
      const filtered = prev.filter(comment => comment.id !== commentId);
      
      // Remove from replies
      return filtered.map(comment => ({
        ...comment,
        replies: comment.replies.filter(reply => reply.id !== commentId)
      }));
    });
  }, []);

  const getSortedComments = useCallback(() => {
    const sorted = [...comments];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.timestamp - a.timestamp);
      case 'oldest':
        return sorted.sort((a, b) => a.timestamp - b.timestamp);
      case 'likes':
        return sorted.sort((a, b) => b.likes - a.likes);
      default:
        return sorted;
    }
  }, [comments, sortBy]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API
      const mockComments: VideoComment[] = [
        {
          id: 'comment-1',
          userId: 'user-1',
          username: '小明同学',
          avatar: '/avatars/user1.jpg',
          content: '这个视频讲得真好！学到了很多东西',
          timestamp: Date.now() - 3600000,
          likes: 12,
          isLiked: false,
          replies: [
            {
              id: 'reply-1',
              userId: 'user-2',
              username: '学习达人',
              avatar: '/avatars/user2.jpg',
              content: '同感！老师讲得很清楚',
              timestamp: Date.now() - 3000000,
              likes: 3,
              isLiked: true,
              replies: []
            }
          ]
        },
        {
          id: 'comment-2',
          userId: 'user-3',
          username: '编程小白',
          avatar: '/avatars/user3.jpg',
          content: '有没有相关的练习题？想巩固一下',
          timestamp: Date.now() - 7200000,
          likes: 8,
          isLiked: false,
          replies: []
        }
      ];
      
      setComments(mockComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  return {
    comments: getSortedComments(),
    loading,
    sortBy,
    setSortBy,
    addComment,
    toggleLike,
    deleteComment,
    loadComments
  };
}
