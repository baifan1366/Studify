import { useState, useCallback, useRef, useEffect } from 'react';

export interface DanmakuMessage {
  id: string;
  text: string;
  color: string;
  size: 'small' | 'medium' | 'large';
  position: number; // 0-1 representing video progress
  timestamp: number;
  userId: string;
  username: string;
  speed?: number; // Animation speed multiplier
}

interface UseDanmakuOptions {
  maxVisible?: number;
  defaultSpeed?: number;
  colors?: string[];
}

export function useDanmaku(options: UseDanmakuOptions = {}) {
  const {
    maxVisible = 50,
    defaultSpeed = 1,
    colors = ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  } = options;

  const [messages, setMessages] = useState<DanmakuMessage[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const messageIdCounter = useRef(0);

  const addMessage = useCallback((
    text: string,
    position: number,
    options?: {
      color?: string;
      size?: 'small' | 'medium' | 'large';
      userId?: string;
      username?: string;
      speed?: number;
    }
  ) => {
    const newMessage: DanmakuMessage = {
      id: `danmaku-${messageIdCounter.current++}`,
      text: text.trim(),
      color: options?.color || colors[Math.floor(Math.random() * colors.length)],
      size: options?.size || 'medium',
      position,
      timestamp: Date.now(),
      userId: options?.userId || 'anonymous',
      username: options?.username || '匿名用户',
      speed: options?.speed || defaultSpeed
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Keep only the most recent messages to prevent memory issues
      return updated.slice(-maxVisible);
    });

    return newMessage.id;
  }, [colors, defaultSpeed, maxVisible]);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const getVisibleMessages = useCallback((currentTime: number, duration: number, windowSize = 0.1) => {
    if (!isEnabled || duration === 0) return [];
    
    const currentProgress = currentTime / duration;
    return messages.filter(msg => {
      const timeDiff = Math.abs(msg.position - currentProgress);
      return timeDiff <= windowSize;
    });
  }, [messages, isEnabled]);

  const loadMessages = useCallback((newMessages: DanmakuMessage[]) => {
    setMessages(newMessages.slice(-maxVisible));
  }, [maxVisible]);

  return {
    messages,
    isEnabled,
    setIsEnabled,
    addMessage,
    removeMessage,
    clearMessages,
    getVisibleMessages,
    loadMessages
  };
}
