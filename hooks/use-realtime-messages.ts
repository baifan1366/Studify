'use client';

import { useState, useEffect } from 'react';
import { Message } from './use-chat-history';
import { subscribeToClassroomChat } from '@/lib/supabase-realtime';
import { supabase } from '@/lib/supabase-realtime';

/**
 * 使用Supabase Realtime获取实时消息的hook
 * @param classroomId 课程ID
 * @param initialMessages 初始消息列表
 */
export function useRealtimeMessages(classroomId: string, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);
  
  useEffect(() => {
    if (!classroomId) return;
    
    // 订阅消息表的变化
    const channel = supabase
      .channel(`classroom-chat-${classroomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `classroom_id=eq.${classroomId}`,
        },
        async (payload) => {
          // 获取新消息的详细信息
          const { data: messageData } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              user_id,
              profiles(id, full_name, email),
              classroom_members!inner(role)
            `)
            .eq('id', payload.new.id)
            .eq('classroom_members.user_id', payload.new.user_id)
            .eq('classroom_members.classroom_id', classroomId)
            .single();
          
          if (messageData) {
            const newMessage: Message = {
              id: messageData.id,
              content: messageData.content,
              authorId: messageData.user_id,
              authorName: messageData.profiles.full_name || messageData.profiles.email.split('@')[0],
              authorRole: messageData.classroom_members.role,
              createdAt: messageData.created_at,
            };
            
            // 添加新消息到列表
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();
    
    // 清理函数
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId]);
  
  return { messages };
}