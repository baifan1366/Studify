'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-realtime';
import { Post } from './classroom/use-classroom-posts';
import { apiGet, apiSend } from "@/lib/api-config";

/**
 * 使用Supabase Realtime获取实时帖子的hook
 * @param classroomId 课程ID
 * @param initialPosts 初始帖子列表
 */
export function useRealtimePosts(classroomId: string, initialPosts: Post[]) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);
  
  useEffect(() => {
    if (!classroomId) return;
    
    // 订阅帖子表的变化
    const channel = supabase
      .channel(`classroom-posts-${classroomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `classroom_id=eq.${classroomId}`,
        },
        async (payload) => {
          // 获取新帖子的详细信息
          const { data: postData } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              attachments,
              created_at,
              user_id,
              profiles(id, full_name, email),
              classroom_members!inner(role)
            `)
            .eq('id', payload.new.id)
            .eq('classroom_members.user_id', payload.new.user_id)
            .eq('classroom_members.classroom_id', classroomId)
            .single();
          
          if (postData) {
            const newPost: Post = {
              id: postData.id,
              content: postData.content,
              attachments: postData.attachments || [],
              authorId: postData.user_id,
              authorName: postData.profiles.full_name || postData.profiles.email.split('@')[0],
              authorRole: postData.classroom_members.role,
              createdAt: postData.created_at,
              comments: [],
            };
            
            // 添加新帖子到列表
            setPosts(prev => [newPost, ...prev]);
          }
        }
      )
      .subscribe();
    
    // 清理函数
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId]);
  
  return { posts };
}