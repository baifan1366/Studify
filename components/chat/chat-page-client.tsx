'use client';

import React from 'react';
import { ChatDashboard } from '@/components/chat/chat-dashboard';
import { ChatNotificationsProvider } from '@/components/chat/chat-notifications-provider';

/**
 * Chat Page Client Component
 * Contains client-side logic and providers for the chat page
 */

export function ChatPageClient() {
  const handleNavigateToChat = (conversationId: string) => {
    // This will be handled by the ChatDashboard component
    // We can dispatch a custom event that the dashboard can listen to
    window.dispatchEvent(new CustomEvent('navigate-to-conversation', {
      detail: { conversationId }
    }));
  };

  return (
    <div className="fixed inset-0 top-16 left-0 right-0 bottom-0 overflow-hidden" style={{ marginLeft: 'var(--sidebar-width)' }}>
      <ChatNotificationsProvider onNavigateToChat={handleNavigateToChat}>
        <ChatDashboard />
      </ChatNotificationsProvider>
    </div>
  );
}
