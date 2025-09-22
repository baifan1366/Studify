import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationSettings } from '@/hooks/notifications/use-notification-settings';
import { useChatNotificationsContext } from '@/components/chat/chat-notifications-provider';

export interface ChatNotificationPayload {
  conversationId: string;
  conversationType: 'direct' | 'group';
  senderName: string;
  senderAvatar?: string;
  messageContent: string;
  messageId: string;
}

export function useChatNotifications() {
  const queryClient = useQueryClient();
  const { data: settings } = useNotificationSettings();
  const { addNotification } = useChatNotificationsContext();

  // Create notification for new chat message
  const createChatNotification = useMutation({
    mutationFn: async (payload: ChatNotificationPayload) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          kind: payload.conversationType === 'group' ? 'group_message' : 'direct_message',
          payload: {
            conversation_id: payload.conversationId,
            conversation_type: payload.conversationType,
            sender_name: payload.senderName,
            sender_avatar: payload.senderAvatar,
            message_content: payload.messageContent.length > 100 
              ? payload.messageContent.substring(0, 100) + '...'
              : payload.messageContent,
            message_id: payload.messageId,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat notification');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate notifications to refresh the bell icon
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
    },
  });

  // Send browser notification if enabled
  const sendBrowserNotification = (payload: ChatNotificationPayload) => {
    if (!settings?.settings.push_notifications) return;

    // Check if browser supports notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = payload.conversationType === 'group' 
        ? `New message in ${payload.conversationId}`
        : `New message from ${payload.senderName}`;
        
      const body = payload.messageContent.length > 100 
        ? payload.messageContent.substring(0, 100) + '...'
        : payload.messageContent;

      const notification = new Notification(title, {
        body,
        icon: payload.senderAvatar || '/default-avatar.png',
        tag: `chat-${payload.conversationId}`,
        requireInteraction: false,
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Handle click to navigate to conversation
      notification.onclick = () => {
        window.focus();
        // Navigate to the conversation
        const chatUrl = `/chat?conversation=${payload.conversationId}`;
        if (window.location.pathname !== '/chat') {
          window.location.href = chatUrl;
        }
        notification.close();
      };
    }
  };

  // Request notification permission on first use
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Main function to handle new chat messages
  const notifyNewMessage = (payload: ChatNotificationPayload) => {
    // Show in-app toast notification
    addNotification({
      conversationType: payload.conversationType,
      senderName: payload.senderName,
      senderAvatar: payload.senderAvatar,
      messageContent: payload.messageContent,
      conversationId: payload.conversationId,
    });

    // Only notify for other users' messages (not our own)
    if (settings?.settings.push_notifications || settings?.settings.email_notifications) {
      createChatNotification.mutate(payload);
    }

    // Send browser notification
    sendBrowserNotification(payload);
  };

  return {
    notifyNewMessage,
    requestNotificationPermission,
    isCreatingNotification: createChatNotification.isPending,
  };
}

// Hook to handle real-time chat notifications via WebSocket/SSE
export function useRealtimeChatNotifications() {
  const { notifyNewMessage } = useChatNotifications();

  useEffect(() => {
    // This would be where you set up WebSocket or SSE connection
    // For now, we'll use a simple polling mechanism or integrate with Supabase Realtime
    
    // Example of setting up Supabase Realtime subscriptions
    const setupRealtimeSubscription = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Subscribe to new direct messages
        const directMessagesChannel = supabase
          .channel('direct-messages')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages'
          }, (payload) => {
            // Handle new direct message
            console.log('New direct message:', payload);
            // You would extract sender info and notify here
          })
          .subscribe();

        // Subscribe to new group messages
        const groupMessagesChannel = supabase
          .channel('group-messages')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages'
          }, (payload) => {
            // Handle new group message
            console.log('New group message:', payload);
            // You would extract sender info and notify here
          })
          .subscribe();

        return () => {
          supabase.removeChannel(directMessagesChannel);
          supabase.removeChannel(groupMessagesChannel);
        };
      } catch (error) {
        console.error('Failed to setup realtime notifications:', error);
      }
    };

    setupRealtimeSubscription();
  }, [notifyNewMessage]);

  return {
    // Could return connection status or other realtime info
  };
}
