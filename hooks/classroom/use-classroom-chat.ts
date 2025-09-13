import { useState, useCallback } from 'react';
import { HookChatMessage, ChatApiResponse, SendMessageRequest, SendMessageResponse } from '@/interface/classroom/chat-message-interface';
import { apiGet, apiSend } from '@/lib/api-config';

// Hook for managing classroom chat - RULES.md compliant
export function useClassroomChat(classroomSlug: string, sessionId?: number) {
  const [messages, setMessages] = useState<HookChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

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
        if (offset === 0) {
          setMessages(response.messages || []);
        } else {
          setMessages(prev => [...prev, ...(response.messages || [])]);
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
  }, [classroomSlug, sessionId]);

  // Send message to API (Rule 8: Use apiSend from api-config)
  const sendMessage = useCallback(async (content: string) => {
    if (!classroomSlug || !content.trim()) return;

    try {
      const endpoint = `/api/classroom/${classroomSlug}/chat`;
      const payload: SendMessageRequest = {
        content: content.trim(),
        type: 'text'
      };
      
      // Add sessionId to payload if provided
      const requestData = sessionId ? { ...payload, sessionId } : payload;
      
      const response = await apiSend<SendMessageResponse>({
        url: endpoint,
        method: 'POST',
        body: requestData
      });
      
      if (!response.success) {
        throw new Error('Failed to send message');
      }

      // Add message to local state immediately for better UX
      setMessages(prev => [...prev, response.message]);
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

  // Refresh messages (polling-based approach instead of real-time)
  const refreshMessages = useCallback(() => {
    fetchMessages(0, 50);
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    hasMore,
    fetchMessages,
    sendMessage,
    addSystemMessage,
    clearMessages,
    refreshMessages,
  };
}
