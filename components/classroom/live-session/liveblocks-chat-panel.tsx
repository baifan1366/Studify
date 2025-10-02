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
 * 聊天消息接口
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
 * 组件 Props
 */
interface SessionChatPanelProps {
  isOpen: boolean;
  classroomSlug: string;
  sessionId?: string;
  userInfo?: {
    id: string;
    name: string;
    avatar: string;
    role: 'student' | 'tutor';
  };
  // 从 LiveKit 获取的真实参与者列表
  participants?: Array<{
    identity: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  }>;
}

const REACTIONS = [
  { emoji: '👍', icon: ThumbsUp, label: '赞' },
  { emoji: '❤️', icon: Heart, label: '爱心' },
  { emoji: '😊', icon: Smile, label: '微笑' },
  { emoji: '👏', label: '鼓掌' },
  { emoji: '🔥', label: '火' },
  { emoji: '💡', label: '想法' },
];

/**
 * 会话聊天 Hook - 集成 LiveKit DataChannel 实现实时通信
 * localStorage 仅作为辅助，用于恢复离线时的本地历史
 */
function useSessionChat(
  classroomSlug: string, 
  sessionId: string, 
  userInfo?: any
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🎯 使用 LiveKit DataChannel 进行实时通信
  const { message: dataChannelMessage, send: sendData } = useDataChannel('chat');

  // 从 localStorage 加载历史记录（仅用于初始化）
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
      
      console.log('📝 Loading local chat history from localStorage for:', { classroomSlug, sessionId });
      
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
          console.log('📨 Loaded', formattedMessages.length, 'messages from local history');
        } catch (parseError) {
          console.error('❌ Failed to parse cached messages:', parseError);
          setMessages([]);
        }
      } else {
        console.log('📝 No local history found, starting with empty chat');
        setMessages([]);
      }
    } catch (error) {
      console.error('💥 Error loading local history:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [classroomSlug, sessionId]);

  // 保存消息到 localStorage（作为备份）
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
      
      // 限制保存最近100条
      if (existingMessages.length > 100) {
        existingMessages = existingMessages.slice(-100);
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(existingMessages));
    } catch (error) {
      console.error('💥 Error saving to local history:', error);
    }
  }, [classroomSlug, sessionId]);

  // 清除本地历史
  const clearLocalHistory = useCallback(() => {
    try {
      if (!classroomSlug || !sessionId || sessionId === 'undefined' || sessionId === 'null') {
        return;
      }
      
      console.log('🗑️ Clearing local chat history...');
      const cacheKey = `chat:${classroomSlug}:${sessionId}`;
      localStorage.removeItem(cacheKey);
      setMessages([]);
      console.log('✅ Local history cleared');
    } catch (error) {
      console.error('💥 Error clearing local history:', error);
    }
  }, [classroomSlug, sessionId]);

  // 组件加载时获取本地历史
  useEffect(() => {
    if (classroomSlug && sessionId) {
      loadLocalHistory();
    }
  }, [classroomSlug, sessionId, loadLocalHistory]);

  // 🎯 监听 LiveKit DataChannel 接收消息
  useEffect(() => {
    if (dataChannelMessage) {
      try {
        const decoder = new TextDecoder();
        const messageStr = decoder.decode(dataChannelMessage.payload);
        const data = JSON.parse(messageStr);
        
        // 只处理聊天消息类型
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
          
          console.log('📨 Received chat message via DataChannel:', newMessage.text.substring(0, 50));
          
          // 添加到消息列表
          setMessages(prev => {
            // 防止重复消息
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          
          // 备份到本地
          saveToLocalHistory(newMessage);
        }
      } catch (error) {
        console.error('❌ Error processing DataChannel message:', error);
      }
    }
  }, [dataChannelMessage, saveToLocalHistory]);

  // 🎯 发送消息通过 LiveKit DataChannel
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
    
    // 立即添加到本地显示（乐观更新）
    setMessages(prev => [...prev, newMessage]);
    
    // 备份到本地
    saveToLocalHistory(newMessage);
    
    // 🎯 通过 LiveKit DataChannel 发送给其他参与者
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
      
      sendData(data, { reliable: true }); // 使用可靠传输确保消息送达
      console.log('✅ Message sent via DataChannel:', text.substring(0, 50));
    } catch (error) {
      console.error('❌ Error sending message via DataChannel:', error);
      // 发送失败时可以显示错误提示
      setError('消息发送失败，请重试');
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
 * 聊天消息列表组件
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
          <p>正在加载聊天记录...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>还没有消息，开始聊天吧！</p>
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
 * 聊天输入框组件
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
    <div className="p-2 sm:p-4 border-t border-slate-700/50">
      {/* 快速反应 */}
      {showReactions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-3 p-2 bg-slate-700/30 rounded-lg"
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

      {/* 输入框 */}
      <div className="flex gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowReactions(!showReactions)}
          className="shrink-0 text-slate-400 hover:text-white hover:bg-slate-600/50"
        >
          <Smile className="w-4 h-4" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入消息..."
          onKeyPress={handleKeyPress}
          className="flex-1 min-w-0 bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:ring-indigo-500"
          maxLength={500}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          className="shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* 字数统计 */}
      {message.length > 0 && (
        <div className="text-xs text-slate-400 mt-1 text-right">
          {message.length}/500
        </div>
      )}
    </div>
  );
}

/**
 * 在线参与者列表组件 - 使用真实的 LiveKit 参与者数据
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
        <span className="text-sm font-medium text-white">在线参与者 ({participants.length})</span>
        <Badge variant="default" className="ml-auto text-xs bg-green-500">
          实时同步
        </Badge>
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
              variant={participant.role === 'tutor' ? 'default' : 'secondary'}
              className="text-xs flex-shrink-0"
            >
              {participant.role === 'tutor' ? '导师' : '学生'}
            </Badge>
            <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" title="在线"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 会话聊天面板主组件
 * 
 * ✅ 使用 LiveKit DataChannel 实现真正的实时通信
 * ✅ 使用真实的参与者列表
 * ✅ localStorage 仅作为辅助（离线历史记录）
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
          {/* 头部 */}
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              实时聊天
            </h3>
            
            {/* 开发调试面板 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-slate-400 bg-slate-700/30 rounded p-2">
                <div className="font-medium mb-1">🔧 调试信息</div>
                <div>📨 消息数量: {messages.length}</div>
                <div>👥 在线参与者: {participants.length}</div>
                {error && <div className="text-red-400">❌ 错误: {error}</div>}
                <div className="mt-1 text-green-400">✅ LiveKit DataChannel 实时通信</div>
                <div className="mt-2">
                  <button
                    onClick={() => {
                      clearLocalHistory();
                      console.log('🧹 Debug: Local history cleared');
                    }}
                    className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    🗑️ 清除本地历史
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 在线参与者列表 - 使用真实的 LiveKit 数据 */}
          {participants.length > 0 && (
            <OnlineParticipants participants={participants} />
          )}

          {/* 聊天消息 */}
          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* 输入框 */}
          <ChatInput onSendMessage={sendMessage} onSendReaction={sendReaction} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
