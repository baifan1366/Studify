'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Video, MoreVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatPanel } from './chat-panel';

interface ChatConversationProps {
  conversationId: string;
}

export function ChatConversation({ conversationId }: ChatConversationProps) {
  const router = useRouter();

  // Extract participant ID from conversation ID (format: user_123)
  const participantId = conversationId.replace('user_', '');
  const participantName = `User ${participantId}`; // Fallback name
  const isOnline = Math.random() > 0.5; // Mock online status

  return (
    <div className="fixed inset-0 top-16 left-0 right-0 bottom-0 flex flex-col bg-background overflow-hidden" style={{ marginLeft: 'var(--sidebar-width)' }}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={undefined} />
            <AvatarFallback>  
              {participantName.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="font-semibold">{participantName}</h2>
            <p className="text-sm text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel conversationId={conversationId} className="flex-1" />
    </div>
  );
}
