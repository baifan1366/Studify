'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-realtime';
import { Comment } from './use-classroom-posts';

/**
 * 使用Supabase Realtime获取实时帖子评论的hook
 * @param postId 帖子ID
 * @param initialComments 初始评论列表
 */
export function useRealtimeComments(postId: string, initialComments: Comment[]) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);
  
  useEffect(() => {
    if (!postId) return;
    
    // 订阅评论表的变化
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          // 获取新评论的详细信息
          const { data: commentData } = await supabase
            .from('post_comments')
            .select(`
              id,
              content,
              created_at,
              user_id,
              profiles(id, full_name, email)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (commentData) {
            const newComment: Comment = {
              id: commentData.id,
              content: commentData.content,
              authorId: commentData.user_id,
              authorName: commentData.profiles.full_name || commentData.profiles.email.split('@')[0],
              createdAt: commentData.created_at,
            };
            
            // 添加新评论到列表
            setComments(prev => [...prev, newComment]);
          }
        }
      )
      .subscribe();
    
    // 清理函数
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);
  
  return { comments };
}