import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';
import { toast } from 'sonner';

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
    isDeleted?: boolean;
  } | null;
  unreadCount: number;
  // Group-specific fields
  memberCount?: number;
  description?: string;
}

export interface ChatAttachment {
  id: number;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  file_url: string;
  custom_message?: string;
}

export interface ReplyTo {
  id: string;
  content: string;
  isDeleted: boolean;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'share_post';
  fileName?: string;
  fileSize?: string;
  isFromMe: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  attachmentId?: number;
  attachment?: ChatAttachment;
  replyToId?: number;
  replyTo?: ReplyTo;
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
  type?: 'text' | 'image' | 'file' | 'share_post';
  fileName?: string;
  fileSize?: string;
  reply_to_id?: number;
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
        isEdited: false,
        isDeleted: false,
        replyToId: data.reply_to_id,
        replyTo: data.reply_to_id ? undefined : undefined, // Will be populated by frontend if needed
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
 * Hook for editing messages
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
      content
    }: {
      conversationId: string;
      messageId: string;
      content: string;
    }) => {
      return await apiSend({
        url: `/api/chat/conversations/${conversationId}/messages/${messageId}`,
        method: 'PATCH',
        body: { content }
      });
    },
    onMutate: async ({ conversationId, messageId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', conversationId]);

      // Optimistically update the message
      queryClient.setQueryData(['messages', conversationId], (old: MessagesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map(msg =>
            msg.id === messageId
              ? { ...msg, content, isEdited: true }
              : msg
          ),
        };
      });

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onError: (err, { conversationId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages);
      }
      toast.error('Failed to edit message');
    },
    onSuccess: (data, { conversationId, messageId }) => {
      // Update with server response
      queryClient.setQueryData(['messages', conversationId], (old: MessagesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map(msg =>
            msg.id === messageId ? (data as any).message : msg
          ),
        };
      });

      // Update conversations cache if this was the last message
      queryClient.setQueryData(['conversations'], (old: ConversationsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.map(conv => {
            if (conv.id === conversationId && conv.lastMessage) {
              // Check if the edited message was the last message
              const editedMessage = (data as any).message;
              if (conv.lastMessage.timestamp === editedMessage.timestamp) {
                return {
                  ...conv,
                  lastMessage: {
                    ...conv.lastMessage,
                    content: editedMessage.content,
                  },
                };
              }
            }
            return conv;
          }),
        };
      });

      toast.success('Message edited successfully');
    },
    onSettled: (data, error, { conversationId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}

/**
 * Hook for deleting messages
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId
    }: {
      conversationId: string;
      messageId: string;
    }) => {
      return await apiSend({
        url: `/api/chat/conversations/${conversationId}/messages/${messageId}`,
        method: 'DELETE'
      });
    },
    onMutate: async ({ conversationId, messageId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', conversationId]);

      // Optimistically mark the message as deleted (soft delete)
      queryClient.setQueryData(['messages', conversationId], (old: MessagesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map(msg =>
            msg.id === messageId
              ? { ...msg, isDeleted: true, deletedAt: new Date().toISOString() }
              : msg
          ),
        };
      });

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onError: (err, { conversationId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages);
      }
      toast.error('Failed to delete message');
    },
    onSuccess: (data, { conversationId, messageId }) => {
      // Keep the message in cache but mark as deleted (already done optimistically)
      // No need to update cache again since it's already done in onMutate

      // Update conversations cache if the deleted message was the last message
      queryClient.setQueryData(['conversations'], (old: ConversationsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.map(conv => {
            if (conv.id === conversationId && conv.lastMessage) {
              // If this was the last message, we need to find the new last message
              // For now, we'll invalidate the conversations to refetch
              return conv;
            }
            return conv;
          }),
        };
      });

      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast.success('Message deleted successfully');
    },
    onSettled: (data, error, { conversationId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}


/**
 * Hook for deleting a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, type }: { conversationId: string; type: 'direct' | 'group' }) => {
      // API expects body: { conversationId, type }
      return await apiSend({
        url: `/api/chat/conversations`,
        method: 'DELETE',
        body: { conversationId, type },
      });
    },
    onMutate: async ({ conversationId }) => {
      // 取消相关的 refetch
      await queryClient.cancelQueries({ queryKey: ['conversations'] });

      // 备份旧数据
      const previousConversations = queryClient.getQueryData<ConversationsResponse>(['conversations']);

      // 从 cache 里乐观删除
      queryClient.setQueryData(['conversations'], (old: ConversationsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.filter(conv => conv.id !== conversationId),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1,
          },
        };
      });

      return { previousConversations };
    },
    onError: (err, { conversationId }, context) => {
      // 出错时回滚
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
    },
    onSuccess: () => {
      // 删除成功后刷新会话列表
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

