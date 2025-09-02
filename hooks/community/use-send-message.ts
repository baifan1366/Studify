'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';
import { apiSend } from '@/lib/api-config';

interface SendMessageParams {
  classroomId: string;
  content: string;
}

interface SendMessageResponse {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<SendMessageResponse, Error, SendMessageParams>({
    mutationFn: async ({ classroomId, content }) =>
      apiSend<SendMessageResponse>({
        url: classroomApi.chat.send(classroomId),
        method: 'POST',
        body: { content },
      }),

    onSuccess: (_, variables) => {
      // ✅ 自动刷新聊天记录
      queryClient.invalidateQueries({
        queryKey: ['chat-history', variables.classroomId],
      });
    },
  });
}
