import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';

// Chat interfaces
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participant: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    isFromMe: boolean;
  } | null;
  unreadCount: number;
  // Group-specific fields
  memberCount?: number;
  description?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: string;
  isFromMe: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: string;
}

/**
 * Hook for fetching all conversations
 */
export function useConversations() {
  return useQuery<ConversationsResponse>({
    queryKey: ['conversations'],
    queryFn: () => apiGet<ConversationsResponse>('/api/chat/conversations'),
    staleTime: 30 * 1000, // 30 seconds - conversations change frequently
    refetchInterval: 30 * 1000, // Poll every 30 seconds for new messages
  });
}

/**
 * Hook for fetching messages in a conversation
 */
export function useMessages(
  conversationId: string | undefined,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const queryParams = new URLSearchParams();
  
  if (options?.limit) {
    queryParams.set('limit', options.limit.toString());
  }
  
  if (options?.offset) {
    queryParams.set('offset', options.offset.toString());
  }

  return useQuery<MessagesResponse>({
    queryKey: ['messages', conversationId, options],
    queryFn: () => apiGet<MessagesResponse>(
      `/api/chat/conversations/${conversationId}/messages?${queryParams}`
    ),
    enabled: !!conversationId,
    staleTime: 10 * 1000, // 10 seconds - messages need to be fresh
    refetchInterval: 5 * 1000, // Poll every 5 seconds for new messages
  });
}

/**
 * Hook for sending messages
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      data 
    }: { 
      conversationId: string; 
      data: SendMessageRequest;
    }) => {
      return await apiSend({
        url: `/api/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        body: data
      });
    },
    onMutate: async ({ conversationId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', conversationId]);
      
      // Optimistically update to the new value
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        content: data.content,
        senderId: 'me',
        senderName: 'You',
        timestamp: new Date().toISOString(),
        type: data.type || 'text',
        fileName: data.fileName,
        fileSize: data.fileSize,
        isFromMe: true,
        status: 'sending',
      };
      
      queryClient.setQueryData(['messages', conversationId], (old: MessagesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, optimisticMessage],
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousMessages, optimisticMessage };
    },
    onError: (err, { conversationId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages);
      }
    },
    onSuccess: (data, { conversationId }, context) => {
      // Replace optimistic message with server response
      queryClient.setQueryData(['messages', conversationId], (old: MessagesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map(msg => 
            msg.id === context?.optimisticMessage.id ? (data as any).message : msg
          ),
        };
      });
      
      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onSettled: (data, error, { conversationId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}

/**
 * Hook for creating new conversations
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { participant_id: string; message?: string }) => {
      console.log('Sending conversation creation request:', data);
      const result = await apiSend({
        url: '/api/chat/conversations',
        method: 'POST',
        body: data
      });
      console.log('API response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Conversation created successfully:', data);
      console.log('Updating cache with new conversation...');
      
      // Add the new conversation to the cache optimistically
      queryClient.setQueryData(['conversations'], (old: ConversationsResponse | undefined) => {
        console.log('Current cache data:', old);
        
        if (!old) {
          // If no existing data, create new structure
          const newData = {
            conversations: [(data as any).conversation],
            pagination: {
              total: 1,
              limit: 50,
              offset: 0,
              hasMore: false,
            },
          };
          console.log('Created new cache data:', newData);
          return newData;
        }
        
        const updatedData = {
          ...old,
          conversations: [(data as any).conversation, ...old.conversations],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1,
          },
        };
        console.log('Updated existing cache data:', updatedData);
        return updatedData;
      });
      
      // Invalidate and refetch conversations from database
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
    }
  });
}

/**
 * Hook for marking messages as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string }) => {
      console.log('Marking conversation as read:', conversationId);
      
      const response = await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark messages as read');
      }

      return response.json();
    },
    onSuccess: (_, { conversationId }) => {
      // Update conversation in cache to mark as read
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.conversations) return old;
        
        return {
          ...old,
          conversations: old.conversations.map((conv: any) => 
            conv.id === conversationId 
              ? { ...conv, unreadCount: 0 }
              : conv
          ),
        };
      });
      
      // Invalidate messages to refresh read status
      queryClient.invalidateQueries({ 
        queryKey: ['messages', conversationId] 
      });
    },
  });
}

/**
 * Hook for real-time message updates
 * This would integrate with WebSocket or Supabase Realtime
 */
export function useRealtimeMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  
  // TODO: Implement real-time subscriptions
  // useEffect(() => {
  //   if (!conversationId) return;
  //   
  //   const channel = supabase
  //     .channel(`conversation_${conversationId}`)
  //     .on('postgres_changes', {
  //       event: 'INSERT',
  //       schema: 'public',
  //       table: 'direct_messages',
  //       filter: `conversation_id=eq.${conversationId}`
  //     }, (payload) => {
  //       // Add new message to cache
  //       queryClient.setQueryData(['messages', conversationId], (old: MessagesResponse | undefined) => {
  //         if (!old) return old;
  //         return {
  //           ...old,
  //           messages: [...old.messages, payload.new as Message],
  //         };
  //       });
  //     })
  //     .subscribe();
  //   
  //   return () => {
  //     channel.unsubscribe();
  //   };
  // }, [conversationId, queryClient]);
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(conversationId: string | undefined) {
  // TODO: Implement typing indicators with real-time updates
  return {
    isTyping: false,
    startTyping: () => {},
    stopTyping: () => {},
  };
}
