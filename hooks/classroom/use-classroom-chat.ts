import { useState, useCallback, useEffect, useRef } from 'react';
import { HookChatMessage, ChatApiResponse, SendMessageResponse } from '@/interface/classroom/chat-message-interface';
import { apiGet, apiSend } from '@/lib/api-config';

// Hook for managing classroom chat using API persistence
export function useClassroomChat(classroomSlug: string, sessionId?: number) {
  const [messages, setMessages] = useState<HookChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Chat uses API persistence instead of DataChannel

  // Fetch messages from API (Rule 8: API → Hooks → Components)
  const fetchMessages = useCallback(async (offset = 0, limit = 50) => {
    if (!classroomSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      });
      
      if (sessionId) {
        params.append('sessionId', sessionId.toString());
      }

      const endpoint = `/api/classroom/${classroomSlug}/chat?${params.toString()}`;
      const response = await apiGet<ChatApiResponse>(endpoint);
      
      if (response.success) {
        const newMessages = response.messages || [];
        if (offset === 0) {
          const prevLength = messages.length;
          setMessages(newMessages);
          // Check for new messages and notify
          if (prevLength > 0 && newMessages.length > prevLength) {
            const latestMessage = newMessages[newMessages.length - 1];
            if (latestMessage && latestMessage.userId !== 'current-user') {
              playNotificationSound();
              showNotification(latestMessage);
            }
          }
        } else {
          setMessages(prev => [...prev, ...newMessages]);
        }
        setHasMore(response.hasMore || false);
      } else {
        throw new Error('Failed to fetch messages');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classroomSlug, sessionId, messages.length]);

  // Send message to API (Rule 8: Use apiSend from api-config)
  const sendMessage = useCallback(async (content: string) => {
    if (!classroomSlug || !content.trim()) return;

    try {
      const endpoint = `/api/classroom/${classroomSlug}/chat`;
      const requestData = {
        message: content.trim(),
        session_id: sessionId || 1 // Default to session 1 if no sessionId provided
      };
      
      const response = await apiSend<SendMessageResponse>({
        url: endpoint,
        method: 'POST',
        body: requestData
      });
      
      if (!response.success) {
        throw new Error('Failed to send message');
      }

      // Add message to local state immediately for better UX
      setMessages(prev => {
        const newMessages = [...prev, response.message];
        // Don't notify for own messages
        return newMessages;
      });
      return response.message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', err);
      throw err;
    }
  }, [classroomSlug, sessionId]);

  // Add system message (for announcements, etc.)
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: HookChatMessage = {
      id: `system-${Date.now()}`,
      userId: 'system',
      userName: 'System',
      content,
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Refresh messages (polling-based approach)
  const refreshMessages = useCallback(() => {
    fetchMessages(0, 50);
  }, [fetchMessages]);

  // Initialize notification sound
  useEffect(() => {
    // Use a simple beep sound or disable audio for now
    audioRef.current = null; // Disable audio temporarily
  }, []);

  // Update unread count when messages change
  useEffect(() => {
    if (messages.length === 0) {
      setUnreadCount(0);
      return;
    }

    if (lastReadMessageId) {
      const lastReadIndex = messages.findIndex(msg => msg.id === lastReadMessageId);
      if (lastReadIndex >= 0) {
        // Count messages after the last read message
        const unread = messages.length - lastReadIndex - 1;
        const newUnreadCount = Math.max(0, unread);
        setUnreadCount(newUnreadCount);
      } else {
        // Last read message not found, all messages are unread
        setUnreadCount(messages.length);
      }
    } else {
      // No messages have been read yet
      setUnreadCount(messages.length);
    }
  }, [messages, lastReadMessageId]);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      setLastReadMessageId(latestMessage.id);
      setUnreadCount(0);
    }
  }, [messages]);

  // Play notification sound for new messages
  const playNotificationSound = useCallback(() => {
    // Use Web Audio API for a simple beep sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio notification failed:', e);
    }
  }, []);

  // Show browser notification
  const showNotification = useCallback((message: HookChatMessage) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message from ${message.userName}`, {
        body: message.content,
        icon: message.userAvatar || '/favicon.png',
        tag: 'chat-message'
      });
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Auto-fetch messages when hook initializes
  useEffect(() => {
    if (classroomSlug) {
      fetchMessages(0, 50);
      requestNotificationPermission();
    }
  }, [classroomSlug, sessionId, fetchMessages, requestNotificationPermission]);

  return {
    messages,
    isLoading,
    error,
    hasMore,
    unreadCount,
    fetchMessages,
    sendMessage,
    addSystemMessage,
    clearMessages,
    refreshMessages,
    markAsRead,
    playNotificationSound,
    showNotification,
  };
}
