'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Paperclip, Smile, ChevronDown, Upload, File, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAttachments, ClassroomAttachment } from '@/hooks/classroom/use-attachments';

// File type utility functions
function isImage(mime: string): boolean {
  return /^image\//.test(mime);
}

function isVideo(mime: string): boolean {
  return /^video\//.test(mime);
}

function isAudio(mime: string): boolean {
  return /^audio\//.test(mime);
}

// Message interface
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'system';
  attachment?: ClassroomAttachment;
}

// Typing Indicator Component
function TypingIndicator({ isCurrentUser = false }: { isCurrentUser?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`flex mb-3 mt-5 ${isCurrentUser ? 'justify-end mr-5' : 'justify-start ml-5'}`}
    >
      <div className={`px-4 py-3 rounded-2xl shadow-sm ${
        isCurrentUser 
          ? 'bg-primary/10 rounded-br-md' 
          : 'bg-gray-100/2 dark:bg-gray-100/2 rounded-bl-md'
      }`}>
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-4">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="absolute w-3 h-3 bg-gradient-to-br from-primary/70 to-primary rounded-full"
                style={{ left: `${index * 8}px` }}
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.6, 1, 0.6],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.3,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-medium">is typing</span>
        </div>
      </div>
    </motion.div>
  );
}

// Chat panel props
interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string, attachment?: ClassroomAttachment) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  classroomSlug?: string;
}

// Individual message component
function ChatMessageItem({ message, isCurrentUser }: { message: ChatMessage; isCurrentUser: boolean }) {
  const formatTime = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid time';
    }
    return dateObj.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex mb-3 mt-5 ${isCurrentUser ? 'justify-end mr-5' : 'justify-start ml-5'}`}
    >
      <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
        {!isCurrentUser && (
          <div className="flex items-center mb-1">
            {message.userAvatar ? (
              <img 
                src={message.userAvatar} 
                alt={message.userName}
                className="w-4 h-4 rounded-full mr-2"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-gray-200/20 mr-2 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {message.userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {message.userName}
            </span>
          </div>
        )}
        <div
          className={`px-3 py-2 rounded-2xl ${
            isCurrentUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-gray-100/5 dark:bg-gray-100/5 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }`}
        >
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          
          {/* Attachment rendering */}
          {message.attachment && (
            <div className="mt-2 bg-black/10 rounded-lg overflow-hidden relative group">
              {/* Download button - top right corner */}
              <div className="flex items-center justify-between bg-black/50 text-white text-xs px-2 py-1">
                <span className="truncate">{message.attachment.file_name}</span>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = message.attachment!.file_url;
                    link.download = message.attachment!.file_name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="ml-2 p-1 hover:bg-white/20 rounded"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>


              {/* Image display */}
              {isImage(message.attachment.mime_type) && (
                <div className="relative">
                  <img
                    src={message.attachment.file_url}
                    alt={message.attachment.file_name}
                    className="max-w-full max-h-64 object-contain rounded-lg cursor-pointer"
                    onClick={() => window.open(message.attachment!.file_url, '_blank')}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {message.attachment.file_name}
                  </div>
                </div>
              )}

              {/* Video display */}
              {isVideo(message.attachment.mime_type) && (
                <div className="relative">
                  <video
                    controls
                    className="max-w-full max-h-64 rounded-lg"
                    preload="metadata"
                  >
                    <source src={message.attachment.file_url} type={message.attachment.mime_type} />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {message.attachment.file_name}
                  </div>
                </div>
              )}

              {/* Audio display */}
              {isAudio(message.attachment.mime_type) && (
                <div className="p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Play className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{message.attachment.file_name}</div>
                      <div className="text-xs opacity-70">
                        {(message.attachment.size_bytes / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <audio
                    controls
                    className="w-full"
                    preload="metadata"
                  >
                    <source src={message.attachment.file_url} type={message.attachment.mime_type} />
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              )}

              {/* Other file types */}
              {!isImage(message.attachment.mime_type) && 
               !isVideo(message.attachment.mime_type) && 
               !isAudio(message.attachment.mime_type) && (
                <div className="p-3">
                  <div className="flex items-center space-x-2">
                    <File className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <a 
                        href={message.attachment.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {message.attachment.file_name}
                      </a>
                      <div className="text-xs opacity-70">
                        {(message.attachment.size_bytes / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main chat panel component
export function ChatPanel({
  messages,
  currentUserId,
  currentUserName,
  onSendMessage,
  isOpen,
  onToggle,
  className = '',
  classroomSlug
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use attachments hook
  const { uploadFile, isUploading, formatFileSize, getFileIcon } = useAttachments(classroomSlug);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth'
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Check if scroll button should be visible
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    // For ScrollArea, we need to check the viewport element
    const viewport = target.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 5);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue || selectedFile) {
      let uploadedFile = null;
      if (selectedFile) {
        try {
          uploadedFile = await uploadFile(selectedFile);
          console.log('uploadedFile:', uploadedFile);
        } catch (error) {
          console.error('Failed to upload file:', error);
          return;
        }
      }
    
      // 允许 message + attachment 同时发送
      onSendMessage(trimmedValue, uploadedFile || undefined);
    
      setInputValue('');
      setSelectedFile(null);
    }    
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
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
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle typing indicator
  useEffect(() => {
    if (inputValue.length > 0) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [inputValue]);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.3 }}
      className={`fixed right-4 bottom-4 z-50 w-80 h-96 bg-white dark:bg-gray-100/3 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col ${className}`}
    >

      {/* Messages area */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea 
          className="h-full px-4 py-2 [&>div>div[style]]:!pr-0 [&>[data-radix-scroll-area-viewport]]:scrollbar-none" 
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <style jsx global>{`
            /* Hide scrollbar for ScrollArea */
            [data-radix-scroll-area-viewport] {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }
            [data-radix-scroll-area-viewport]::-webkit-scrollbar {
              display: none !important;
            }
            /* Additional fallback */
            .scrollbar-none {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .scrollbar-none::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <AnimatePresence>
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                isCurrentUser={message.userId === currentUserId}
              />
            ))}
          </AnimatePresence>
          {/* Typing indicator */}
          {isTyping && <TypingIndicator isCurrentUser={true} />}
          <div ref={messagesEndRef} />
        </ScrollArea>
        
        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"
            >
              <Button
                onClick={scrollToBottom}
                size="sm"
                className="rounded-full shadow-lg bg-primary/90 hover:bg-primary text-primary-foreground"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <motion.div 
        className="p-2 bg-transparent ml-5 mr-2"
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 100 }}
      >
        <motion.div
          className={`relative bg-gray-100/3 dark:bg-gray-100/3 rounded-2xl shadow-md transition-all duration-300 ${
            isFocused ? 'shadow-lg' : ''
          } ${isDragOver ? 'border-2 border-primary border-dashed' : ''}`}
          whileHover={{ scale: 1.01 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Selected file preview */}
          {selectedFile && (
            <div className="p-3 border-b border-gray-200/20">
              <div className="flex items-center space-x-2 bg-primary/10 rounded-lg p-2">
                {/* File type icon */}
                {isImage(selectedFile.type) ? (
                  <div className="w-4 h-4 text-primary">🖼️</div>
                ) : isVideo(selectedFile.type) ? (
                  <div className="w-4 h-4 text-primary">🎥</div>
                ) : isAudio(selectedFile.type) ? (
                  <div className="w-4 h-4 text-primary">🎵</div>
                ) : (
                  <File className="w-4 h-4 text-primary" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{selectedFile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
                
                {/* Download button instead of X */}
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
          )}

          <div className="flex items-center p-3">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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
              {(inputValue.trim().length > 0 || selectedFile) && (
                <motion.button
                  onClick={handleSendMessage}
                  disabled={isUploading}
                  className="ml-1 p-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full shadow-md disabled:opacity-50"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isUploading ? (
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
    </motion.div>
  );
}

// Hook for managing chat state
export function useChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addMessage = (
    content: string,
    userId: string,
    userName: string,
    userAvatar?: string,
    attachment?: ClassroomAttachment
  ) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId,
      userName,
      userAvatar,
      content,
      timestamp: new Date(),
      type: 'user',
      attachment
    };
    console.log('newMessage:', newMessage);
    setMessages(prev => [...prev, newMessage]);
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: 'system',
      userName: 'System',
      content,
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  return {
    messages,
    isOpen,
    addMessage,
    addSystemMessage,
    clearMessages,
    toggleChat,
    setIsOpen
  };
}
