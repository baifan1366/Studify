'use client';

import React from 'react';
import { ChatDashboard } from '@/components/chat/chat-dashboard';
import { ChatNotificationsProvider } from '@/components/chat/chat-notifications-provider';

/**
 * Chat Page Component
 * Main chat interface with conversations list and message panel
 */

export default function ChatPage() {
  const handleNavigateToChat = (conversationId: string) => {
    // This will be handled by the ChatDashboard component
    // We can dispatch a custom event that the dashboard can listen to
    window.dispatchEvent(new CustomEvent('navigate-to-conversation', {
      detail: { conversationId }
    }));
  };

  return (
    <ChatNotificationsProvider onNavigateToChat={handleNavigateToChat}>
      <ChatDashboard />
    </ChatNotificationsProvider>
  );
}
