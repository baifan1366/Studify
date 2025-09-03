'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';
import { apiSend } from "@/lib/api-config";

interface CreateCommentParams {
  classroomId: string;
  postId: string;
  content: string;
}

/**
 * 创建帖子评论的 mutation hook
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CreateCommentParams>({
    mutationFn: ({ classroomId, postId, content }) =>
      apiSend({
        url: classroomApi.posts.comment(classroomId, postId),
        method: 'POST',
        body: { content },
      }),
    onSuccess: (_, { classroomId }) => {
      // 成功后刷新帖子列表
      queryClient.invalidateQueries({ queryKey: ['classroom-posts', classroomId] });
    },
  });
}
