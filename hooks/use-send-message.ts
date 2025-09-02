'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';

interface SendMessageParams {
  classroomId: string;
  content: string;
}

/**
 * 发送聊天消息的mutation hook
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, SendMessageParams>(
    async ({ classroomId, content }) => {
      const response = await fetch(classroomApi.chat.send(classroomId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    {
      onSuccess: (_, variables) => {
        // 成功后刷新聊天历史
        queryClient.invalidateQueries(['chat-history', variables.classroomId]);
      },
    }
  );
}