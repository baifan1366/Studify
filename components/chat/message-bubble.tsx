'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/chat/use-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatAttachmentViewer } from './chat-attachment-viewer';

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className={cn(
      "flex gap-3 group",
      message.isFromMe ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {/* Avatar */}
      {!message.isFromMe && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.senderAvatar} />
          <AvatarFallback className="text-xs">
            {message.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-col max-w-xs lg:max-w-md">
        {/* Sender name (only for messages not from me) */}
        {!message.isFromMe && (
          <span className="text-xs text-muted-foreground mb-1 ml-3">
            {message.senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-3 py-2 max-w-full transition-all duration-200',
            message.isFromMe
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
            message.isDeleted && 'opacity-60'
          )}
        >
          {/* Render attachment first if available */}
          {message.attachment && !message.isDeleted && (
            <div className={message.content && !message.content.startsWith('Shared:') ? 'mb-2' : ''}>
              <ChatAttachmentViewer 
                attachment={message.attachment}
                showDownloadButton={true}
                compact={false}
              />
            </div>
          )}

          {/* Message content */}
          <div className="break-words">
            {message.isDeleted ? (
              <span className="italic text-muted-foreground">
                This message was deleted
              </span>
            ) : (
              <>
                {/* Show content if not starting with "Shared:" or if no attachment */}
                {(!message.content.startsWith('Shared:') || !message.attachment) && (
                  <span>{message.content}</span>
                )}
              </>
            )}
          </div>

          {/* Edited indicator */}
          {message.isEdited && !message.isDeleted && (
            <div className="text-xs opacity-70 mt-1">
              edited
            </div>
          )}
        </div>

        {/* Timestamp and status */}
        <div className={cn(
          "flex items-center gap-1 mt-1 text-xs text-muted-foreground",
          message.isFromMe ? "justify-end" : "justify-start"
        )}>
          <span>{formatTimestamp(message.timestamp)}</span>
          
          {/* Message status for sent messages */}
          {message.isFromMe && !message.isDeleted && (
            <span className="ml-1">
              {message.status === 'sending' && '⏳'}
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && <span className="text-blue-500">✓✓</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
