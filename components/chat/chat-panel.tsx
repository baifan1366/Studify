'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useMessages, useSendMessage, useMarkAsRead, useEditMessage, useDeleteMessage, Message } from '@/hooks/chat/use-chat';
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
  X,
  Save,
  Trash2,
  Reply,
  MessageCircle,
  Forward,
  Edit,
  Edit2
} from 'lucide-react';
import { MessageStatus } from './message-status';
import { ChatAttachmentViewer } from './chat-attachment-viewer';
import { MessageTimestamp, SeenStatus } from './message-timestamp';
import { MessageBubble } from './message-bubble';
import { ProfileModal } from './profile-modal';
import { ProfileData } from '@/interface/profile-interface';
import { useProfile } from '@/hooks/profiles/use-profile';
import { generateTimestampGroups, MessageTimestamp as TimestampData } from '@/utils/chat/timestamp-utils';
import { useChatNotifications } from '@/hooks/chat/use-chat-notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

// Skeleton Components
function MessageSkeleton({ isFromMe }: { isFromMe: boolean }) {
  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isFromMe ? 'justify-end' : 'justify-start'
    )}>
      <div className="flex items-start gap-2 w-full max-w-xs lg:max-w-md">
        {!isFromMe && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className={cn(
            "h-16 rounded-lg",
            isFromMe ? "ml-auto" : ""
          )} style={{ width: isFromMe ? '80%' : '90%' }} />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}


interface ChatPanelProps {
  conversationId: string;
  className?: string;
}
export function ChatPanel({ conversationId, className }: ChatPanelProps) {
  const t = useTranslations('ChatPanel');
  const tBubble = useTranslations('MessageBubble');
  const [newMessage, setNewMessage] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Profile modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Fetch profile data using the hook
  const { data: selectedProfile, isLoading: isProfileLoading, error: profileError } = useProfile(selectedUserId);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Anti-spam protection
  const [isSending, setIsSending] = useState(false);
  const lastSendTimeRef = useRef<number>(0);
  const sendCooldownMs = 500; // 500ms cooldown between sends
  const lastMessageContentRef = useRef<string>(''); // Track last sent message to prevent duplicates

  // Use chat hooks
  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();
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

    // Handle editing mode
    if (editingMessageId) {
      if (!trimmedMessage) return;

      // Prevent spam during editing
      if (isSending) {
        console.log('Edit already in progress, ignoring...');
        return;
      }

      setIsSending(true);

      try {
        await editMessageMutation.mutateAsync({
          conversationId,
          messageId: editingMessageId,
          content: trimmedMessage,
        });

        // Exit editing mode
        setEditingMessageId(null);
        setEditingContent('');
        setNewMessage('');
      } catch (error) {
        console.error('Failed to edit message:', error);
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Handle normal sending
    if (!trimmedMessage && !selectedFile) return;

    // Anti-spam protection: Check if already sending
    if (isSending) {
      console.log('Message send already in progress, ignoring...');
      return;
    }

    // Anti-spam protection: Check cooldown period
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    if (timeSinceLastSend < sendCooldownMs) {
      console.log(`Cooldown active. Please wait ${sendCooldownMs - timeSinceLastSend}ms`);
      return;
    }

    // Anti-spam protection: Prevent duplicate messages
    if (trimmedMessage === lastMessageContentRef.current && timeSinceLastSend < 2000) {
      console.log('Duplicate message detected within 2 seconds, ignoring...');
      return;
    }

    // Mark as sending
    setIsSending(true);
    lastSendTimeRef.current = now;
    lastMessageContentRef.current = trimmedMessage;

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
          reply_to_id: replyingToMessage ? parseInt(replyingToMessage.id) : undefined,
        };

        await sendMessageMutation.mutateAsync({
          conversationId,
          data: messageData,
        });

        setNewMessage('');
        setReplyingToMessage(null); // Clear reply state
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // On error, allow retry immediately
      lastSendTimeRef.current = 0;
    } finally {
      // Re-enable sending after completion or error
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // Prevent sending if already in progress
      if (isSending) {
        console.log('Message send in progress, Enter key ignored');
        return;
      }

      handleSendMessage();
    } else if (e.key === 'Escape' && editingMessageId) {
      // Cancel editing on Escape
      handleCancelEdit();
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

  // Handle edit message
  const handleEditMessage = (message: Message) => {
    // Don't allow editing deleted messages
    if (message.isDeleted) {
      return;
    }

    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setNewMessage(message.content);
    // Focus input after state update
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessageMutation.mutateAsync({
        conversationId,
        messageId,
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
    setNewMessage('');
  };

  // Handle reply to message
  const handleReplyToMessage = (message: Message) => {
    setReplyingToMessage(message);
    inputRef.current?.focus();
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };

  const handleProfileClick = (senderId: string) => {
    // Find the message to get the user_id (assuming senderId is actually user_id)
    const message = messages.find(m => m.senderId === senderId);
    if (!message) {
      console.error('Message not found for sender:', senderId);
      return;
    }

    // Set the user ID to fetch profile data
    setSelectedUserId(senderId);
    setIsProfileModalOpen(true);
  };

  const handleSendMessageFromProfile = (profileId: number) => {
    // The user is already in the chat, so just close the modal
    setIsProfileModalOpen(false);
    console.log('Already in chat with user:', profileId);
  };

  const handleViewFullProfile = (profileId: number) => {
    // Navigate to full profile page
    console.log('Navigate to full profile:', profileId);
    // router.push(`/profile/${profileId}`);
    setIsProfileModalOpen(false);
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
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {isLoadingMessages ? (
              // Show skeleton while loading
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <MessageSkeleton key={i} isFromMe={i % 3 === 0} />
                ))}
              </>
            ) : messages.length === 0 ? (
              // Show empty state
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('no_messages')}</p>
                  <p className="text-xs mt-1">{t('start_conversation')}</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
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
                      'flex gap-3 mb-4 group',
                      message.isFromMe ? 'justify-end' : 'justify-start'
                    )}>
                      <div className="flex items-start gap-2 w-full max-w-xs lg:max-w-md">
                        {/* Message Bubble */}
                        <div className={cn(
                          "flex-1",
                          editingMessageId === message.id && 'ring-2 ring-yellow-400 rounded-lg'
                        )}>
                          <MessageBubble
                            message={message}
                            className={cn(
                              timestampGroup?.showTimestamp && "mb-2"
                            )}
                            onReply={handleReplyToMessage}
                            onProfileClick={handleProfileClick}
                          />

                          {/* Timestamp */}
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
                        </div>

                        {/* Edit/Delete Menu - Only show for own messages and not deleted */}
                        {message.isFromMe && !message.isDeleted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => handleEditMessage(message)}
                                className="cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                <span>{tBubble('edit')}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteMessage(message.id)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                <span>{tBubble('delete')}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Enhanced Message Input */}
      <motion.div className="relative flex-shrink-0 p-2 border-t"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Editing Mode Indicator */}
        {editingMessageId && (
          <div className="px-3 py-2 mb-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            <div className="flex items-center justify-between">
              <span>{t('editing_message')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-6 px-2 text-xs"
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Reply Preview */}
        {replyingToMessage && (
          <div className="px-3 py-2 mb-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Reply className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">
                    {t('replying_to')} {replyingToMessage.senderName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 pl-5">
                  {replyingToMessage.isDeleted ? (
                    <span className="italic">{t('message_deleted')}</span>
                  ) : (
                    replyingToMessage.content
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelReply}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <motion.div
          className={`rounded-2xl border transition-all duration-200 relative ${isFocused
            ? 'border-primary shadow-md'
            : 'border-border hover:border-primary/50'
            } ${isDragOver ? 'border-primary bg-primary/5' : ''} ${editingMessageId ? 'border-yellow-400 shadow-lg' : ''
            }`}
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
                    title={t('download_file')}
                  >
                    <Download className="w-3 h-3" />
                  </button>

                  {/* Remove button */}
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-gray-200/20 rounded-full"
                    title={t('remove_file')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center p-3" style={{ paddingLeft: '15px' }}>
            <input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isSending || isUploading}
              placeholder={
                isSending || isUploading
                  ? t('sending')
                  : editingMessageId
                    ? t('edit_message')
                    : replyingToMessage
                      ? t('reply_to', { name: replyingToMessage.senderName })
                      : selectedFile
                        ? t('add_message_optional')
                        : t('type_message')
              }
              className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={500}
            />

            {/* Attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploading}
              className="p-1.5 rounded-full transition-colors mr-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isSending || isUploading ? t('please_wait') : t('attach_file_title')}
            >
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {(newMessage.trim().length > 0 || selectedFile) && (
                <motion.button
                  onClick={handleSendMessage}
                  disabled={isSending || sendMessageMutation.isPending || editMessageMutation.isPending || isUploading}
                  className={cn(
                    "ml-1 p-2 text-primary-foreground rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
                    editingMessageId
                      ? "bg-gradient-to-r from-green-500 to-green-600"
                      : "bg-gradient-to-r from-primary to-primary/80"
                  )}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  whileHover={{ scale: isSending ? 1 : 1.05 }}
                  whileTap={{ scale: isSending ? 1 : 0.95 }}
                >
                  {(isSending || sendMessageMutation.isPending || editMessageMutation.isPending || isUploading) ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : editingMessageId ? (
                    <Save className="w-4 h-4" />
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
                <div className="text-sm font-medium text-primary">{t('drop_file_to_attach')}</div>
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

      {/* Profile Modal */}
      <ProfileModal
        profile={selectedProfile || null}
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        onSendMessage={handleSendMessageFromProfile}
      />
    </div>
  );
}
