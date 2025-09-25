'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Video, MoreVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
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

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Mute Conversation</DropdownMenuItem>
              <DropdownMenuItem>Block User</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel conversationId={conversationId} className="flex-1" />
    </div>
  );
}
