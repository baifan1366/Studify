'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Send,
  Users,
  Smile,
  Heart,
  ThumbsUp
} from 'lucide-react';
import { useDataChannel } from '@livekit/components-react';

/**
 * Chat message interface
 */
interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: number;
  type: 'text' | 'system' | 'reaction';
}

/**
 * Component Props
 */
interface SessionChatPanelProps {
  isOpen: boolean;
  classroomSlug: string;
  sessionId?: string;
  userInfo?: {
    id: string;
    name: string;
    avatar: string;
    role: 'student' | 'tutor' | 'owner';
  };
  // Real participants list from LiveKit
  participants?: Array<{
    identity: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  }>;
}

const REACTIONS = [
  { emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { emoji: '❤️', icon: Heart, label: 'Heart' },
  { emoji: '😊', icon: Smile, label: 'Smile' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '💡', label: 'Idea' },
];

/**
 * Session chat Hook - integrates LiveKit DataChannel for real-time communication
 * localStorage only serves as auxiliary, used to restore local history when offline
 */
function useSessionChat(
  classroomSlug: string,
  sessionId: string,
  userInfo?: any
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🎯 Use LiveKit DataChannel for real-time communication
  const { message: dataChannelMessage, send: sendData } = useDataChannel('chat');

  // Load history from localStorage (only for initialization)
  const loadLocalHistory = useCallback(() => {
    try {
      setIsLoading(true);

      if (!classroomSlug || !sessionId || sessionId === 'undefined' || sessionId === 'null') {
        console.warn('⚠️ Invalid chat parameters:', { classroomSlug, sessionId });
        setError('Invalid chat parameters');
        setIsLoading(false);
        return;
      }

      setError(null);


      const cacheKey = `chat:${classroomSlug}:${sessionId}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const parsedMessages = JSON.parse(cachedData);
          const formattedMessages: ChatMessage[] = parsedMessages.map((msg: any) => ({
            id: msg.id || `${msg.timestamp}-${Math.random()}`,
            text: msg.text || msg.message,
            userId: msg.userId,
            userName: msg.userName || 'Unknown User',
            userAvatar: msg.userAvatar || '',
            timestamp: msg.timestamp,
            type: msg.type || 'text'
          }));

          setMessages(formattedMessages);
        } catch (parseError) {
          console.error('❌ Failed to parse cached messages:', parseError);
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('💥 Error loading local history:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [classroomSlug, sessionId]);

  // Save message to localStorage (as backup)
  const saveToLocalHistory = useCallback((message: ChatMessage) => {
    try {
      if (!classroomSlug || !sessionId || sessionId === 'undefined' || sessionId === 'null') {
        return;
      }

      const cacheKey = `chat:${classroomSlug}:${sessionId}`;
      const existingData = localStorage.getItem(cacheKey);
      let existingMessages = [];

      if (existingData) {
        try {
          existingMessages = JSON.parse(existingData);
        } catch (parseError) {
          existingMessages = [];
        }
      }

      existingMessages.push({
        id: message.id,
        text: message.text,
        userId: message.userId,
        userName: message.userName,
        userAvatar: message.userAvatar,
        type: message.type,
        timestamp: message.timestamp
      });

      // Limit to save last 100 messages
      if (existingMessages.length > 100) {
        existingMessages = existingMessages.slice(-100);
      }

      localStorage.setItem(cacheKey, JSON.stringify(existingMessages));
    } catch (error) {
      console.error('💥 Error saving to local history:', error);
    }
  }, [classroomSlug, sessionId]);

  // Clear local history
  const clearLocalHistory = useCallback(() => {
    try {
      if (!classroomSlug || !sessionId || sessionId === 'undefined' || sessionId === 'null') {
        return;
      }

      const cacheKey = `chat:${classroomSlug}:${sessionId}`;
      localStorage.removeItem(cacheKey);
      setMessages([]);
    } catch (error) {
      console.error('💥 Error clearing local history:', error);
    }
  }, [classroomSlug, sessionId]);

  // Get local history when component loads
  useEffect(() => {
    if (classroomSlug && sessionId) {
      loadLocalHistory();
    }
  }, [classroomSlug, sessionId, loadLocalHistory]);

  // 🎯 Listen to LiveKit DataChannel for receiving messages
  useEffect(() => {
    if (dataChannelMessage) {
      try {
        const decoder = new TextDecoder();
        const messageStr = decoder.decode(dataChannelMessage.payload);
        const data = JSON.parse(messageStr);

        // Only handle chat message types
        if (data.type === 'chat') {
          const newMessage: ChatMessage = {
            id: data.id,
            text: data.text,
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar || '',
            timestamp: data.timestamp,
            type: data.messageType || 'text'
          };


          // Add to message list
          setMessages(prev => {
            // Prevent duplicate messages
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Backup to local
          saveToLocalHistory(newMessage);
        }
      } catch (error) {
        console.error('❌ Error processing DataChannel message:', error);
      }
    }
  }, [dataChannelMessage, saveToLocalHistory]);

  // 🎯 Send message via LiveKit DataChannel
  const sendMessage = useCallback((text: string, messageType: 'text' | 'reaction' = 'text') => {
    if (!userInfo || !text.trim() || !sendData) {
      console.warn('⚠️ Cannot send message:', { hasUserInfo: !!userInfo, hasText: !!text.trim(), hasSendData: !!sendData });
      return;
    }

    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      text: text.trim(),
      userId: userInfo.id,
      userName: userInfo.name,
      userAvatar: userInfo.avatar,
      timestamp: Date.now(),
      type: messageType,
    };

    // Immediately add to local display (optimistic update)
    setMessages(prev => [...prev, newMessage]);

    // Backup to local
    saveToLocalHistory(newMessage);

    // 🎯 Send to other participants via LiveKit DataChannel
    try {
      const payload = {
        type: 'chat',
        id: newMessage.id,
        text: newMessage.text,
        userId: newMessage.userId,
        userName: newMessage.userName,
        userAvatar: newMessage.userAvatar,
        timestamp: newMessage.timestamp,
        messageType: newMessage.type
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));

      sendData(data, { reliable: true }); // Use reliable transmission to ensure message delivery
    } catch (error) {
      console.error('❌ Error sending message via DataChannel:', error);
      // Can show error message when sending fails
      setError('Message sending failed, please retry');
      setTimeout(() => setError(null), 3000);
    }
  }, [userInfo, sendData, saveToLocalHistory]);

  const sendTextMessage = useCallback((text: string) => {
    sendMessage(text, 'text');
  }, [sendMessage]);

  const sendReaction = useCallback((emoji: string) => {
    sendMessage(emoji, 'reaction');
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage: sendTextMessage,
    sendReaction,
    clearLocalHistory,
  };
}

/**
 * Chat message list component
 */
function ChatMessages({ messages, isLoading }: { messages: ChatMessage[], isLoading: boolean }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
          <p>Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No messages yet, start chatting!</p>
        </div>
      ) : (
        messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={message.userAvatar} />
              <AvatarFallback className="text-xs bg-slate-600 text-white">
                {message.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">
                  {message.userName}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {message.type === 'reaction' ? (
                <div className="text-2xl">{message.text}</div>
              ) : message.type === 'system' ? (
                <div className="text-sm text-slate-400 italic">{message.text}</div>
              ) : (
                <div className="text-sm text-slate-200 break-words bg-slate-700/30 rounded-lg p-2">
                  {message.text}
                </div>
              )}
            </div>
          </motion.div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * Chat input component
 */
function ChatInput({ onSendMessage, onSendReaction }: {
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full p-2 sm:p-4 border-t border-slate-700/50">
      {/* Quick reactions */}
      {showReactions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-3 p-2 bg-slate-700/30 rounded-lg w-full"
        >
          <div className="flex gap-2 flex-wrap">
            {REACTIONS.map((reaction, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSendReaction(reaction.emoji);
                  setShowReactions(false);
                }}
                className="text-lg hover:bg-slate-600/50 text-white"
                title={reaction.label}
              >
                {reaction.emoji}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 输入框 - 确保宽度与 panel 一致 */}
      <div className="w-full space-y-2">
        {/* 输入框占满整行 */}
        <div className="relative w-full">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message..."
            onKeyPress={handleKeyPress}
            className="w-full pr-20 bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:ring-indigo-500"
            maxLength={500}
          />
          {/* 发送按钮放在输入框内部右侧 */}
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* 表情按钮单独一行 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReactions(!showReactions)}
          className="w-full text-slate-400 hover:text-white hover:bg-slate-600/50"
        >
          <Smile className="w-4 h-4 mr-2" />
          <span className="text-xs">Add Reaction</span>
        </Button>
      </div>

      {/* Character count */}
      {message.length > 0 && (
        <div className="text-xs text-slate-400 mt-1 text-right w-full">
          {message.length}/500
        </div>
      )}
    </div>
  );
}

/**
 * Online participants list component - uses real LiveKit participant data
 */
function OnlineParticipants({ participants }: {
  participants: Array<{
    identity: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  }>;
}) {
  return (
    <div className="p-4 border-b border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-white">Online Participants ({participants.length})</span>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {participants.map((participant, index) => (
          <div key={participant.identity} className="flex items-center gap-2">
            <Avatar className="w-5 h-5 flex-shrink-0">
              <AvatarImage src={participant.avatarUrl} />
              <AvatarFallback className="text-xs bg-slate-600 text-white">
                {participant.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-300 truncate">
                {participant.displayName}
              </div>
            </div>
            <Badge
              variant={participant.role === 'tutor' || participant.role === 'owner' ? 'default' : 'secondary'}
              className="text-xs flex-shrink-0"
            >
              {participant.role === 'tutor' || participant.role === 'owner' ? 'Tutor' : 'Student'}
            </Badge>
            <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" title="Online"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Session chat panel main component
 * 
 * ✅ Uses LiveKit DataChannel for real-time communication
 * ✅ Uses real participants list
 * ✅ localStorage only serves as auxiliary (offline history)
 */
export function SessionChatPanel({
  isOpen,
  classroomSlug,
  sessionId,
  userInfo,
  participants = []
}: SessionChatPanelProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    sendReaction,
    clearLocalHistory,
  } = useSessionChat(classroomSlug, sessionId || '', userInfo);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="w-full h-full bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 flex flex-col"
          style={{
            minWidth: '200px',
            maxWidth: '600px',
            width: '100%'
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Real-time Chat
            </h3>

          </div>

          {/* Online participants list - uses real LiveKit data */}
          {participants.length > 0 && (
            <OnlineParticipants participants={participants} />
          )}


          {/* Chat messages */}
          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* Input box */}
          <ChatInput onSendMessage={sendMessage} onSendReaction={sendReaction} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
