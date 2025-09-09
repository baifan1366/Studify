'use client';

import { createClient } from '@supabase/supabase-js';

// 创建Supabase客户端，用于前端实时功能
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      // 配置实时功能
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * 订阅课程聊天频道
 * @param classroomId 课程ID
 * @param callback 新消息回调函数
 */
export function subscribeToClassroomChat(classroomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`classroom-chat-${classroomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `classroom_id=eq.${classroomId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * 订阅课程帖子频道
 * @param classroomId 课程ID
 * @param callback 新帖子回调函数
 */
export function subscribeToClassroomPosts(classroomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`classroom-posts-${classroomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `classroom_id=eq.${classroomId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * 订阅课程帖子评论频道
 * @param postId 帖子ID
 * @param callback 新评论回调函数
 */
export function subscribeToPostComments(postId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`post-comments-${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * 订阅课程作业频道
 * @param classroomId 课程ID
 * @param callback 新作业回调函数
 */
export function subscribeToClassroomAssignments(classroomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`classroom-assignments-${classroomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'assignments',
        filter: `classroom_id=eq.${classroomId}`,
      },
      callback
    )
    .subscribe();
}