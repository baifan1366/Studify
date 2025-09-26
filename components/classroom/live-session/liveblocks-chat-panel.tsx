'use client';

import { useState, useEffect, useRef } from 'react';
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

// 使用简化的消息接口，避免Liveblocks类型问题
interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: number;
  type: 'text' | 'system' | 'reaction';
}

interface LiveblocksChatPanelProps {
  isOpen: boolean;
  classroomSlug: string;
  sessionId?: string;
  userInfo?: {
    id: string;
    name: string;
    avatar: string;
    role: 'student' | 'tutor';
  };
}

const REACTIONS = [
  { emoji: '👍', icon: ThumbsUp, label: '赞' },
  { emoji: '❤️', icon: Heart, label: '爱心' },
  { emoji: '😊', icon: Smile, label: '微笑' },
  { emoji: '👏', label: '鼓掌' },
  { emoji: '🔥', label: '火' },
  { emoji: '💡', label: '想法' },
];

// 模拟Liveblocks存储的本地状态管理
function useLiveblocksChat(roomId: string, userInfo?: any) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState([userInfo].filter(Boolean));
  const [isConnected, setIsConnected] = useState(false);

  // 模拟连接状态
  useEffect(() => {
    const timer = setTimeout(() => setIsConnected(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = (text: string) => {
    if (!userInfo || !text.trim()) return;
    
    addMessage({
      text: text.trim(),
      userId: userInfo.id,
      userName: userInfo.name,
      userAvatar: userInfo.avatar,
      type: 'text',
    });
  };

  const sendReaction = (emoji: string) => {
    if (!userInfo) return;
    
    addMessage({
      text: emoji,
      userId: userInfo.id,
      userName: userInfo.name,
      userAvatar: userInfo.avatar,
      type: 'reaction',
    });
  };

  return {
    messages,
    onlineUsers,
    isConnected,
    sendMessage,
    sendReaction,
  };
}

function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
            <Avatar className="w-8 h-8">
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

function ChatInput({ onSendMessage, onSendReaction }: {
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);

  const handleSend = () => {
    onSendMessage(message);
    setMessage('');
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
          className="shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white"
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

function OnlineUsers({ users, isConnected }: {
  users: any[];
  isConnected: boolean;
}) {
  return (
    <div className="p-4 border-b border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-white">在线用户 ({users.length})</span>
        <Badge
          variant={isConnected ? 'default' : 'destructive'}
          className="ml-auto text-xs"
        >
          {isConnected ? '已连接' : '连接中...'}
        </Badge>
      </div>
      <div className="space-y-1">
        {users.map((user, index) => (
          <div key={index} className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-xs bg-slate-600 text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-300 truncate">
                {user?.name || 'Unknown User'} {index === 0 && '(我)'}
              </div>
            </div>
            <Badge
              variant={user?.role === 'tutor' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {user?.role === 'tutor' ? '导师' : '学生'}
            </Badge>
            <div className="w-2 h-2 bg-green-400 rounded-full" title="在线"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveblocksChatPanel({ 
  isOpen, 
  classroomSlug, 
  sessionId, 
  userInfo 
}: LiveblocksChatPanelProps) {
  const roomId = `classroom:${classroomSlug}:chat${sessionId ? `:${sessionId}` : ''}`;
  
  const {
    messages,
    onlineUsers,
    isConnected,
    sendMessage,
    sendReaction,
  } = useLiveblocksChat(roomId, userInfo);

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
          </div>

          {/* 在线用户 */}
          <OnlineUsers users={onlineUsers} isConnected={isConnected} />

          {/* 聊天消息 */}
          <ChatMessages messages={messages} />

          {/* 输入框 */}
          <ChatInput onSendMessage={sendMessage} onSendReaction={sendReaction} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
