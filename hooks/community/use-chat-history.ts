"use client";

import { useQuery } from "@tanstack/react-query";
import { classroomApi } from "@/lib/api";
import { apiGet } from "@/lib/api-config"; // ✅ only keep apiGet, remove apiSend

// 消息接口
export interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: "tutor" | "student";
  createdAt: string;
}

/**
 * 获取课程聊天历史的hook
 * @param classroomId 课程ID
 */
export function useChatHistory(classroomId: string) {
  return useQuery<Message[]>({
    queryKey: ["chat-history", classroomId],
    queryFn: () => apiGet<Message[]>(classroomApi.chat.history(classroomId)), // ✅ Use apiGet
    enabled: !!classroomId,
    staleTime: 1000 * 60 * 1, // 1分钟缓存
    refetchOnWindowFocus: false,
  });
}
