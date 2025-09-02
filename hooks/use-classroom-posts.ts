'use client';

import { useQuery } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';

// 帖子接口
export interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'tutor' | 'student';
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
    authorRole: 'tutor' | 'student';
    createdAt: string;
  }>;
}

/**
 * 获取课程帖子列表的hook
 * @param classroomId 课程ID
 */
export function useClassroomPosts(classroomId: string) {
  return useQuery<Post[]>(
    ['classroom-posts', classroomId],
    async () => {
      const response = await fetch(classroomApi.posts.list(classroomId));
      
      if (!response.ok) {
        throw new Error('Failed to fetch classroom posts');
      }
      
      return response.json();
    },
    {
      enabled: !!classroomId,
      staleTime: 1000 * 60 * 1, // 1分钟缓存
      refetchOnWindowFocus: true,
    }
  );
}