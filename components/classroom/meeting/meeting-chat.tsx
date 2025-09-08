'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/utils/supabase/client';
import { ChatMessage } from '@/interface/classroom/chat-message-interface';

interface MeetingChatProps {
  meetingId: string;
  userId: string;
}

export default function MeetingChat({ meetingId, userId }: MeetingChatProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Convert userId to a number
  const userIdNumber = parseInt(userId, 10);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat-messages', meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/meeting/${meetingId}/chat`);
      if (!response.ok) {
        throw new Error('获取聊天历史失败');
      }
      const data = await response.json();
      return data.messages || [];
    },
    refetchInterval: 5000, 
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/meeting/${meetingId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error('发送消息失败');
      }

      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', meetingId] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '发送消息失败',
        description: error.message,
      });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'classroom',
          table: 'chat_message',
          filter: `session_id=eq.${meetingId}`,
        },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', meetingId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${msg.sender.id === userIdNumber ? 'justify-end' : ''}`}
            >
              {msg.sender.id !== userIdNumber && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.sender.avatar_url} />
                  <AvatarFallback>
                    {msg.sender.name?.substring(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] ${msg.sender.id === userIdNumber
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
                  } rounded-lg p-2 text-sm`}
              >
                {msg.sender.id !== userIdNumber && (
                  <div className="font-medium text-xs mb-1">{msg.sender.name}</div>
                )}
                <div>{msg.content}</div>
                <div className="text-xs opacity-70 text-right mt-1">
                  {formatTime(msg.sent_at.toString())}
                </div>
              </div>
              {msg.sender.id === userIdNumber && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.sender.avatar_url} />
                  <AvatarFallback>
                    {msg.sender.name?.substring(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-8">
            暂无消息，发送第一条消息开始聊天
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="border-t border-border p-4 flex gap-2"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入消息..."
          className="flex-1"
          disabled={sendMessageMutation.isPending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}