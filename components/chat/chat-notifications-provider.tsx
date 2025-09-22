'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ChatNotificationToastContainer } from './chat-notification-toast';

interface ChatNotification {
  id: string;
  conversationType: 'direct' | 'group';
  senderName: string;
  senderAvatar?: string;
  messageContent: string;
  conversationId: string;
  timestamp: Date;
}

interface ChatNotificationsContextType {
  notifications: ChatNotification[];
  addNotification: (notification: Omit<ChatNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  navigateToChat: (conversationId: string) => void;
}

const ChatNotificationsContext = createContext<ChatNotificationsContextType | null>(null);

export function useChatNotificationsContext() {
  const context = useContext(ChatNotificationsContext);
  if (!context) {
    throw new Error('useChatNotificationsContext must be used within ChatNotificationsProvider');
  }
  return context;
}

interface ChatNotificationsProviderProps {
  children: ReactNode;
  onNavigateToChat?: (conversationId: string) => void;
  maxNotifications?: number;
}

export function ChatNotificationsProvider({
  children,
  onNavigateToChat,
  maxNotifications = 3
}: ChatNotificationsProviderProps) {
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);

  const addNotification = useCallback((
    notificationData: Omit<ChatNotification, 'id' | 'timestamp'>
  ) => {
    const newNotification: ChatNotification = {
      ...notificationData,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    setNotifications(prev => {
      // Check if we already have a notification from this conversation
      const existingIndex = prev.findIndex(n => n.conversationId === notificationData.conversationId);
      
      if (existingIndex !== -1) {
        // Update existing notification
        const updated = [...prev];
        updated[existingIndex] = newNotification;
        return updated;
      }
      
      // Add new notification, keeping only the most recent ones
      const updated = [newNotification, ...prev].slice(0, maxNotifications);
      return updated;
    });
  }, [maxNotifications]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const navigateToChat = useCallback((conversationId: string) => {
    if (onNavigateToChat) {
      onNavigateToChat(conversationId);
    } else {
      // Default navigation logic
      const url = new URL(window.location.href);
      url.searchParams.set('conversation', conversationId);
      window.history.pushState({}, '', url.toString());
      
      // Trigger a custom event that the chat can listen for
      window.dispatchEvent(new CustomEvent('navigate-to-conversation', {
        detail: { conversationId }
      }));
    }
    
    // Clear notifications for this conversation
    setNotifications(prev => 
      prev.filter(n => n.conversationId !== conversationId)
    );
  }, [onNavigateToChat]);

  const contextValue: ChatNotificationsContextType = {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    navigateToChat
  };

  return (
    <ChatNotificationsContext.Provider value={contextValue}>
      {children}
      <ChatNotificationToastContainer
        notifications={notifications}
        onDismiss={dismissNotification}
        onNavigateToChat={navigateToChat}
      />
    </ChatNotificationsContext.Provider>
  );
}
