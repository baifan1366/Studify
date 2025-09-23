'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface ChatNotificationToastProps {
  id: string;
  conversationType: 'direct' | 'group';
  senderName: string;
  senderAvatar?: string;
  messageContent: string;
  conversationId: string;
  onDismiss: (id: string) => void;
  onNavigateToChat: (conversationId: string) => void;
  autoHideDuration?: number;
}

export function ChatNotificationToast({
  id,
  conversationType,
  senderName,
  senderAvatar,
  messageContent,
  conversationId,
  onDismiss,
  onNavigateToChat,
  autoHideDuration = 5000
}: ChatNotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(id), 300);
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, id, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  const handleClick = () => {
    onNavigateToChat(conversationId);
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: 300 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 300 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-4 right-4 z-50 w-80"
        >
          <Card className="shadow-lg border border-border/50 bg-background/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={senderAvatar} />
                  <AvatarFallback>
                    {conversationType === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      senderName.split(' ').map((n: string) => n[0]).join('')
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer" 
                  onClick={handleClick}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {conversationType === 'group' && (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="font-medium text-sm truncate">
                      {conversationType === 'group' ? 'New group message' : 'New message'}
                    </p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium">{senderName}</span>
                    {conversationType === 'group' && ' in group chat'}
                  </p>
                  
                  <p className="text-sm text-foreground line-clamp-2">
                    {messageContent}
                  </p>
                </div>

                {/* Dismiss button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleClick}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="flex-1"
                >
                  Dismiss
                </Button>
              </div>

              {/* Progress bar for auto-hide */}
              <div className="mt-3">
                <motion.div
                  className="h-1 bg-primary/20 rounded-full overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: autoHideDuration / 1000, ease: "linear" }}
                  />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Container component to manage multiple toasts
export interface ChatNotificationToastContainerProps {
  notifications: Array<{
    id: string;
    conversationType: 'direct' | 'group';
    senderName: string;
    senderAvatar?: string;
    messageContent: string;
    conversationId: string;
  }>;
  onDismiss: (id: string) => void;
  onNavigateToChat: (conversationId: string) => void;
}

export function ChatNotificationToastContainer({
  notifications,
  onDismiss,
  onNavigateToChat
}: ChatNotificationToastContainerProps) {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
            style={{ zIndex: 1000 - index }}
          >
            <ChatNotificationToast
              {...notification}
              onDismiss={onDismiss}
              onNavigateToChat={onNavigateToChat}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
