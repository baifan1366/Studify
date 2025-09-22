'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMessages, useSendMessage, useMarkAsRead } from '@/hooks/chat/use-chat';
import { useChatUpload } from '@/hooks/chat/use-chat-upload';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image as ImageIcon, 
  File,
  Download,
  MoreVertical,
  Upload,
  X
} from 'lucide-react';
import { MessageStatus } from './message-status';
import { ChatAttachmentViewer } from './chat-attachment-viewer';
import { MessageTimestamp, SeenStatus } from './message-timestamp';
import { generateTimestampGroups, MessageTimestamp as TimestampData } from '@/utils/chat/timestamp-utils';
import { useChatNotifications } from '@/hooks/chat/use-chat-notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ChatAttachment {
  id: number;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  file_url: string;
  custom_message?: string;
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
  attachment?: ChatAttachment; 
  attachmentId?: number;
}

interface ChatPanelProps {
  conversationId: string;
  className?: string;
}
export function ChatPanel({ conversationId, className }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use chat hooks
  const { data: messagesData, refetch: refetchMessages } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const { uploadFile, uploadProgress, isUploading } = useChatUpload();
  const { notifyNewMessage } = useChatNotifications();

  const messages = messagesData?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    
    if (!trimmedMessage && !selectedFile) return;

    try {
      // Handle file upload
      if (selectedFile) {
        await uploadFile(selectedFile, {
          conversationId,
          customMessage: trimmedMessage || undefined,
        });
        
        setNewMessage('');
        setSelectedFile(null);
        return;
      }

      // Handle text message
      if (trimmedMessage) {
        const messageData = {
          content: trimmedMessage,
          type: 'text' as const,
        };

        await sendMessageMutation.mutateAsync({
          conversationId,
          data: messageData,
        });
        
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // File handling functions
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  // Convert messages to timestamp format
  const messagesWithTimestamps: TimestampData[] = useMemo(() => {
    return messages.map(msg => ({
      id: msg.id,
      clientTimestamp: new Date(msg.timestamp),
      serverTimestamp: new Date(msg.timestamp), // Use timestamp as server time
      senderId: msg.senderId
    }));
  }, [messages]);

  // Generate timestamp display rules
  const timestampGroups = useMemo(() => {
    return generateTimestampGroups(messagesWithTimestamps, 'en');
  }, [messagesWithTimestamps]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      // Mark conversation as read when messages are loaded
      markAsReadMutation.mutate({ conversationId });
    }
  }, [conversationId, messages.length]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const timestampGroup = timestampGroups.get(message.id);
            
            return (
              <div key={message.id}>
                {/* Date Separator */}
                <MessageTimestamp
                  timestamp={new Date(message.timestamp)}
                  showTimestamp={false}
                  showDateSeparator={timestampGroup?.showDateSeparator}
                  dateSeparatorText={timestampGroup?.dateSeparatorText}
                />

                {/* Message */}
                <div className={cn(
                  'flex gap-3 mb-4',
                  message.isFromMe ? 'justify-end' : 'justify-start'
                )}>
                  {!message.isFromMe && (
                    <Avatar className="h-8 w-8 self-end flex-shrink-0">
                      <AvatarImage src={message.senderAvatar} />
                      <AvatarFallback className="text-xs">
                        {message.senderName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex flex-col max-w-xs lg:max-w-md">
                    {!message.isFromMe && (
                      <span className="text-xs text-muted-foreground mb-1 ml-3">
                        {message.senderName}
                      </span>
                    )}

                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 max-w-full',
                        message.isFromMe
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {/* Render attachment first if available */}
                      {(message as Message).attachment && (
                        <div className={message.content && !message.content.startsWith('Shared:') ? 'mb-2' : ''}>
                          <ChatAttachmentViewer 
                            attachment={(message as Message).attachment!}
                            showDownloadButton={true}
                            compact={false}
                          />
                        </div>
                      )}
                      
                      {/* Render message content if it's not a default attachment message */}
                      {message.content && !message.content.startsWith('📎 Shared:') && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {/* Timestamp and Status */}
                    {timestampGroup?.showTimestamp && (
                      <MessageTimestamp
                        timestamp={new Date(message.timestamp)}
                        showTimestamp={true}
                        showDateSeparator={false}
                        className={cn(
                          'mt-1',
                          message.isFromMe ? 'text-right' : 'text-left'
                        )}
                      />
                    )}
                    
                    {/* Message Status */}
                    {message.isFromMe && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <MessageStatus status={message.status} />
                        {message.status === 'read' && (
                          <SeenStatus 
                            seenTime={new Date()} 
                            className="text-xs" 
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {message.isFromMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                        <DropdownMenuItem>Forward</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">...</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Message Input */}
      <motion.div 
        className="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <motion.div
          className={`rounded-2xl border transition-all duration-200 relative ${
            isFocused 
              ? 'border-primary shadow-md' 
              : 'border-border hover:border-primary/50'
          } ${isDragOver ? 'border-primary bg-primary/5' : ''}`}
        >
          {/* File Preview */}
          {selectedFile && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0">
                  {selectedFile.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                  ) : (
                    <File className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Download button */}
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(selectedFile);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = selectedFile.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    className="p-1 hover:bg-gray-200/20 rounded-full"
                    title="Download file"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-gray-200/20 rounded-full"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center p-3" style={{ paddingLeft: '15px' }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={selectedFile ? "Add a message (optional)..." : "Type a message..."}
              className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground text-sm"
              maxLength={500}
            />
            
            {/* Attachment button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full transition-colors mr-1"
            >
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            
            <AnimatePresence>
              {(newMessage.trim().length > 0 || selectedFile) && (
                <motion.button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="ml-1 p-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full shadow-md disabled:opacity-50"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {sendMessageMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-primary/10 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-sm font-medium text-primary">Drop file to attach</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
      </motion.div>
    </div>
  );
}
