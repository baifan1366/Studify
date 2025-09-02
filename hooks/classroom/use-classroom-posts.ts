"use client";

import { useQuery } from "@tanstack/react-query";
import { classroomApi } from "@/lib/api";
import { apiGet } from "@/lib/api-config"; // ✅ Removed apiSend, we don't need it here

// 帖子接口
export interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: "tutor" | "student";
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  comments?: Array<{
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorRole: "tutor" | "student";
    createdAt: string;
  }>;
}

/**
 * 获取课程帖子列表的hook
 * @param classroomId 课程ID
 */
export function useClassroomPosts(classroomId: string) {
  return useQuery<Post[]>({
    queryKey: ["classroom-posts", classroomId],
    queryFn: () => apiGet<Post[]>(classroomApi.posts.list(classroomId)), // ✅ Use apiGet here
    enabled: !!classroomId,
    staleTime: 1000 * 60 * 1, // 1分钟缓存
    refetchOnWindowFocus: true,
  });
}
