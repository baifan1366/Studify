'use client';

import { useState, useEffect, useRef } from 'react';
import { useStorage, useMutation, useMyPresence, useOthers, useBroadcastEvent, useEventListener } from '@/lib/liveblocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Users, Smile, Heart, ThumbsUp } from 'lucide-react';

const REACTIONS = [
  { emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { emoji: '❤️', icon: Heart, label: 'Love' },
  { emoji: '😊', icon: Smile, label: 'Smile' },
  { emoji: '👏', label: 'Applause' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '💡', label: 'Idea' },
];

function ChatMessages() {
  const messages = useStorage((root) => root.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages?.length]);
  
  if (!messages) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No messages yet, start chatting!</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div key={index} className="flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={message.userAvatar} />
              <AvatarFallback className="text-xs">
                {message.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {message.userName}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {message.type === 'reaction' ? (
                <div className="text-2xl">{message.text}</div>
              ) : message.type === 'system' ? (
                <div className="text-sm text-gray-500 italic">{message.text}</div>
              ) : (
                <div className="text-sm text-gray-700 break-words">
                  {message.text}
                </div>
              )}
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInput() {
  const [message, setMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [myPresence] = useMyPresence();
  const broadcast = useBroadcastEvent();
  
  const addMessage = useMutation(({ storage }, newMessage) => {
    const messages = storage.get('messages');
    if (messages) {
      messages.push(newMessage);
    }
  }, []);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    
    const newMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text: trimmedMessage,
      userId: myPresence.userName, // Should use actual user ID here
      userName: myPresence.userName,
      userAvatar: myPresence.userAvatar,
      timestamp: Date.now(),
      type: 'text' as const,
    };
    
    addMessage(newMessage);
    broadcast({ type: 'CHAT_MESSAGE', data: { message: trimmedMessage } });
    setMessage('');
  };

  const handleReaction = (emoji: string) => {
    const reactionMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text: emoji,
      userId: myPresence.userName,
      userName: myPresence.userName,
      userAvatar: myPresence.userAvatar,
      timestamp: Date.now(),
      type: 'reaction' as const,
    };
    
    addMessage(reactionMessage);
    broadcast({ type: 'USER_REACTION', data: { emoji, x: 0, y: 0 } });
    setShowReactions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t bg-gray-50">
      {/* Quick reactions */}
      {showReactions && (
        <div className="mb-3 p-2 bg-white rounded-lg border shadow-sm">
          <div className="flex gap-2 flex-wrap">
            {REACTIONS.map((reaction, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(reaction.emoji)}
                className="text-lg hover:bg-gray-100"
                title={reaction.label}
              >
                {reaction.emoji}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowReactions(!showReactions)}
          className="shrink-0"
        >
          <Smile className="w-4 h-4" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message... (Enter to send)"
          onKeyPress={handleKeyPress}
          className="flex-1"
          maxLength={500}
        />
        <Button 
          onClick={handleSend} 
          size="icon"
          disabled={!message.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Character count */}
      {message.length > 0 && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {message.length}/500
        </div>
      )}
    </div>
  );
}

function OnlineUsers() {
  const others = useOthers();
  const [myPresence] = useMyPresence();
  
  const allUsers = [
    {
      id: 'me',
      name: myPresence.userName,
      avatar: myPresence.userAvatar,
      role: myPresence.userRole,
      isMe: true,
    },
    ...others.map(({ connectionId, presence }) => ({
      id: connectionId.toString(),
      name: presence.userName,
      avatar: presence.userAvatar,
      role: presence.userRole,
      isMe: false,
    })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Online Users ({allUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {allUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-xs">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.name || 'Unknown'} {user.isMe && '(Me)'}
                </div>
              </div>
              <Badge 
                variant={user.role === 'tutor' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {user.role === 'tutor' ? 'Tutor' : 'Student'}
              </Badge>
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemNotifications() {
  const [notifications, setNotifications] = useState<string[]>([]);

  // Listen for system events
  useEventListener(({ event, user }) => {
    if (event.type === 'CHAT_MESSAGE') {
      // Can add message notification logic here
    } else if (event.type === 'USER_REACTION') {
      setNotifications(prev => [
        ...prev,
        `${user?.info?.name || 'Unknown User'} sent emoji ${event.data.emoji}`,
      ]);
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);
    }
  });

  if (notifications.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm animate-slide-in"
        >
          {notification}
        </div>
      ))}
    </div>
  );
}

export function CollaborativeChat() {
  return (
    <div className="h-full flex flex-col relative">
      {/* System notifications */}
      <SystemNotifications />
      
      {/* Online users */}
      <div className="p-4 border-b">
        <OnlineUsers />
      </div>
      
      {/* Chat messages */}
      <ChatMessages />
      
      {/* Input field */}
      <ChatInput />
    </div>
  );
}
