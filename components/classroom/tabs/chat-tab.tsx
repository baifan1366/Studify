'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@/hooks/profile/use-user';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 导入聊天相关hooks
import { useChatHistory } from '@/hooks/community/use-chat-history';
import { useSendMessage } from '@/hooks/community/use-send-message';
import { useRealtimeMessages } from '@/hooks/community/use-realtime-messages';
import type { ChatMessage } from '@/interface/classroom/chat-message-interface';

export function ChatTab({ classroomId }: { classroomId: string }) {
  const { data: user } = useUser();
  const t = useTranslations('ClassroomDetailPage.chat');
  const { toast } = useToast();
  
  const [messageContent, setMessageContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: chatHistory, isLoading } = useChatHistory(classroomId);

  const sendMessageMutation = useSendMessage();
  
  const mappedChatHistory = chatHistory?.map((message) => ({
    id: parseInt(message.id, 10),
    public_id: message.id, // Default value
    session_id: 1, // Default value
    sender_id: parseInt(message.authorId, 10),
    sender: {
      id: parseInt(message.authorId, 10),
      avatar_url: '', // Default value
      name: message.authorName,
    },
    message: message.content,
    content: message.content,
    sent_at: new Date(message.createdAt),
    is_deleted: false, // Default value
    created_at: new Date(message.createdAt),
    updated_at: new Date(), // Default value
    author_id: parseInt(message.authorId, 10),
    author_name: message.authorName,
    author_role: message.authorRole,
  } as ChatMessage)) || [];
  
  const { messages } = useRealtimeMessages(classroomId, mappedChatHistory);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      toast({
        title: t('message_empty_error_title'),
        description: t('message_empty_error_description'),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await sendMessageMutation.mutateAsync({
        classroomId,
        content: messageContent,
      });
      
      setMessageContent('');
      
      scrollToBottom();
    } catch (error) {
      toast({
        title: t('message_error_title'),
        description: t('message_error_description'),
        variant: 'destructive',
      });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  const isSameDay = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };
  
  const formatDateHeader = (date: Date | string) => {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(parsedDate.toISOString(), today.toISOString())) {
      return t('today');
    } else if (isSameDay(parsedDate.toISOString(), yesterday.toISOString())) {
      return t('yesterday');
    } else {
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(parsedDate);
    }
  };
  

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';
    let currentGroup: ChatMessage[] = [];

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toDateString(); // Parse created_at as Date
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            date: currentDate,
            messages: [...currentGroup],
          });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });
    if (currentGroup.length > 0) {
      groups.push({
        date: currentDate,
        messages: currentGroup,
      });
    }
    return groups;
  };
  
  const messageGroups = groupMessagesByDate(messages);
  
  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      {/* 聊天区域 */}
      <Card className="flex-1 bg-white/10 backdrop-blur-lg border-white/20 shadow-xl overflow-hidden flex flex-col">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            // 加载状态
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : messageGroups.length > 0 ? (
            // 消息列表
            <div className="space-y-6">
              {messageGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* 日期分隔线 */}
                  <div className="flex items-center justify-center">
                    <div className="bg-white/20 text-white/70 text-xs px-2 py-1 rounded-full">
                      {formatDateHeader(group.messages[0].created_at)}
                    </div>
                  </div>
                  
                  {/* 消息组 */}
                  {group.messages.map((message, index) => {
                    const isCurrentUser = message.author_id === parseInt(user?.user?.id || '', 10);
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                      >
                        {/* 头像 */}
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${message.author_id}?size=32`} />
                          <AvatarFallback>{message.author_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        
                        {/* 消息内容 */}
                        <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                          {/* 作者名称和时间 */}
                          <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm font-medium text-white/90">
                              {message.author_name}
                              {message.author_role === 'tutor' && (
                                <span className="ml-1 text-xs bg-blue-500/20 text-blue-300 px-1 rounded">
                                  {t('tutor_badge')}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-white/60">{formatDate(message.created_at.toISOString())}</span>
                          </div>
                          
                          {/* 消息气泡 */}
                          <div 
                            className={`p-3 rounded-lg ${isCurrentUser
                              ? 'bg-blue-600/80 text-white'
                              : 'bg-white/20 text-white/90'
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex as any]}
                              className="prose prose-invert max-w-none prose-p:my-1 prose-headings:my-2"
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            // 无消息状态
            <div className="h-full flex items-center justify-center">
              <p className="text-white/70">{t('no_messages')}</p>
            </div>
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Textarea
              placeholder={t('message_placeholder')}
              className="min-h-12 bg-white/5 border-white/10 text-white/80"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={sendMessageMutation.status === 'pending'} // Replace `loading` with `pending`
              className="self-end"
            >
              {sendMessageMutation.status === 'pending' ? t('sending') : t('send')}
            </Button>
          </div>
          <p className="text-xs text-white/50 mt-1">{t('send_tip')}</p>
        </div>
      </Card>
    </div>
  );
}