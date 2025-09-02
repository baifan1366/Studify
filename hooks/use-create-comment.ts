'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';

interface CreateCommentParams {
  classroomId: string;
  postId: string;
  content: string;
}

/**
 * 创建帖子评论的mutation hook
 */
export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, CreateCommentParams>(
    async ({ classroomId, postId, content }) => {
      const response = await fetch(classroomApi.posts.comment(classroomId, postId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create comment');
      }
      
      return response.json();
    },
    {
      onSuccess: (_, variables) => {
        // 成功后刷新帖子列表
        queryClient.invalidateQueries(['classroom-posts', variables.classroomId]);
      },
    }
  );
}