'use client';

import { useQuery } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';

// 消息接口
export interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'tutor' | 'student';
  createdAt: string;
}

/**
 * 获取课程聊天历史的hook
 * @param classroomId 课程ID
 */
export function useChatHistory(classroomId: string) {
  return useQuery<Message[]>(
    ['chat-history', classroomId],
    async () => {
      const response = await fetch(classroomApi.chat.history(classroomId));
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      
      return response.json();
    },
    {
      enabled: !!classroomId,
      staleTime: 1000 * 60 * 1, // 1分钟缓存
      refetchOnWindowFocus: false,
    }
  );
}