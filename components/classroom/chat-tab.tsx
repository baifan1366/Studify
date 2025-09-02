'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/hooks/profile/use-user';
import { useChatHistory } from '@/hooks/community/use-chat-history';
import { useSendMessage } from '@/hooks/community/use-send-message';
import { useRealtimeMessages } from '@/hooks/community/use-realtime-messages';
import { Message } from '@/hooks/community/use-chat-history';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { PaperPlaneIcon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ChatTabProps {
  classroomId: string;
}

// 消息分组类型
type MessageGroup = {
  date: string;
  messages: Message[];
};

// 格式化日期
const formatMessageDate = (date: string) => {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (messageDate.toDateString() === today.toDateString()) {
    return '今天';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    return format(messageDate, 'yyyy年MM月dd日', { locale: zhCN });
  }
};

// 将消息按日期分组
const groupMessagesByDate = (messages: Message[]): MessageGroup[] => {
  const groups: Record<string, Message[]> = {};
  
  messages.forEach(message => {
    const dateKey = formatMessageDate(message.createdAt);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });
  
  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages,
  }));
};

export function ChatTab({ classroomId }: ChatTabProps) {
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // 获取聊天历史
  const { data: chatHistory, isLoading } = useChatHistory(classroomId);
  
  // 使用实时消息
  const { messages } = useRealtimeMessages(classroomId, chatHistory || []);
  
  // 发送消息mutation
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  
  // 消息分组
  const messageGroups = groupMessagesByDate(messages);
  
  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息列表更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 处理发送消息
  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    sendMessage(
      { classroomId, content: message.trim() },
      {
        onSuccess: () => {
          setMessage('');
        },
        onError: (error) => {
          toast.error('发送消息失败：' + error.message);
        },
      }
    );
  };
  
  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter 发送消息
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* 聊天区域 */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-background/50 backdrop-blur-sm rounded-md"
      >
        {isLoading ? (
          // 加载状态
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-16 w-[300px]" />
                </div>
              </div>
            ))}
          </div>
        ) : messageGroups.length > 0 ? (
          // 消息列表
          <div className="space-y-6">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                <div className="flex justify-center">
                  <Badge variant="outline" className="bg-background/80">
                    {group.date}
                  </Badge>
                </div>
                
                {group.messages.map((msg, msgIndex) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: msgIndex * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <Avatar className="h-10 w-10">
                      <div className="bg-primary text-primary-foreground rounded-full h-full w-full flex items-center justify-center text-sm font-medium">
                        {msg.authorName.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{msg.authorName}</span>
                        {msg.authorRole === 'tutor' && (
                          <Badge variant="secondary" className="text-xs">
                            导师
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      
                      <div className="p-3 rounded-md bg-card">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          className="prose prose-sm dark:prose-invert max-w-none break-words"
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          // 无消息
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>暂无消息，开始聊天吧！</p>
          </div>
        )}
      </div>
      
      {/* 输入区域 */}
      <div className="p-4 bg-background/80 backdrop-blur-sm rounded-md mt-4">
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，支持Markdown和LaTeX公式...（Ctrl+Enter发送）"
            className="min-h-[100px] resize-none"
            disabled={isSending}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              支持Markdown和LaTeX公式
            </span>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              className="gap-2"
            >
              <PaperPlaneIcon className="h-4 w-4" />
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}