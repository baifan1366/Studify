'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Message interface
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

// Chat panel props
interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

// Individual message component
function ChatMessageItem({ message, isCurrentUser }: { message: ChatMessage; isCurrentUser: boolean }) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex mb-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
        {!isCurrentUser && (
          <div className="flex items-center mb-1">
            {message.userAvatar ? (
              <img 
                src={message.userAvatar} 
                alt={message.userName}
                className="w-4 h-4 rounded-full mr-2"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-blue-500 mr-2 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {message.userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {message.userName}
            </span>
          </div>
        )}
        <div
          className={`px-3 py-2 rounded-2xl ${
            isCurrentUser
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main chat panel component
export function ChatPanel({ 
  messages, 
  currentUserId, 
  currentUserName, 
  onSendMessage, 
  isOpen, 
  onToggle,
  className = '' 
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle send message
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle typing indicator
  useEffect(() => {
    if (inputValue.length > 0) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [inputValue]);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.3 }}
      className={`fixed right-4 bottom-4 z-50 w-80 h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Chat</h3>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {messages.length} messages
          </span>
        </div>
        <Button
          onClick={onToggle}
          variant="ghost"
          size="icon"
          className="w-8 h-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-2" ref={scrollAreaRef}>
          <AnimatePresence>
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                isCurrentUser={message.userId === currentUserId}
              />
            ))}
          </AnimatePresence>
          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start mb-3"
            >
              <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-2xl rounded-bl-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 rounded-full"
            maxLength={500}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            size="icon"
            className="rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
          {inputValue.length}/500
        </div>
      </div>
    </motion.div>
  );
}

// Hook for managing chat state
export function useChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addMessage = (content: string, userId: string, userName: string, userAvatar?: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId,
      userName,
      userAvatar,
      content,
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: 'system',
      userName: 'System',
      content,
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  return {
    messages,
    isOpen,
    addMessage,
    addSystemMessage,
    clearMessages,
    toggleChat,
    setIsOpen
  };
}
