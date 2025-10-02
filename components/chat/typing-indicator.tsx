'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  isCurrentUser?: boolean;
  userName?: string;
  userAvatar?: string;
  className?: string;
}

export function TypingIndicator({ 
  isCurrentUser = false, 
  userName = 'Someone',
  userAvatar,
  className = '' 
}: TypingIndicatorProps) {
  const t = useTranslations('ChatDashboard');
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'} ${className}`}
    >
      {/* Avatar for other users */}
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 mr-3 self-end flex-shrink-0">
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="text-xs">
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-col max-w-xs lg:max-w-md">
        {/* User name for other users */}
        {!isCurrentUser && (
          <span className="text-xs text-muted-foreground mb-1 ml-3">
            {userName}
          </span>
        )}

        {/* Typing bubble */}
        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
          isCurrentUser 
            ? 'bg-primary text-primary-foreground rounded-br-md' 
            : 'bg-muted rounded-bl-md'
        }`}>
          <div className="flex items-center space-x-2">
            {/* Animated dots */}
            <div className="flex space-x-1">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    isCurrentUser 
                      ? 'bg-primary-foreground/70' 
                      : 'bg-muted-foreground/70'
                  }`}
                  animate={{
                    y: [0, -6, 0],
                    opacity: [0.5, 1, 0.5],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            
            {/* Typing text */}
            <motion.span 
              className={`text-xs font-medium ${
                isCurrentUser 
                  ? 'text-primary-foreground/80' 
                  : 'text-muted-foreground'
              }`}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {t('typing')}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Multiple users typing indicator
interface MultipleTypingIndicatorProps {
  typingUsers: { id: string; name: string; avatar?: string }[];
  className?: string;
}

export function MultipleTypingIndicator({ 
  typingUsers, 
  className = '' 
}: MultipleTypingIndicatorProps) {
  const t = useTranslations('ChatDashboard');
  if (typingUsers.length === 0) return null;

  const displayNames = typingUsers.slice(0, 3).map(user => user.name);
  const othersCount = typingUsers.length - 3;

  let typingText = '';
  if (typingUsers.length === 1) {
    typingText = `${displayNames[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    typingText = `${displayNames[0]} and ${displayNames[1]} are typing...`;
  } else if (typingUsers.length === 3) {
    typingText = `${displayNames[0]}, ${displayNames[1]}, and ${displayNames[2]} are typing...`;
  } else {
    typingText = `${displayNames[0]}, ${displayNames[1]}, and ${othersCount} others are typing...`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center px-4 py-2 text-sm text-muted-foreground ${className}`}
    >
      {/* Multiple avatars */}
      <div className="flex -space-x-2 mr-3">
        {typingUsers.slice(0, 3).map((user, index) => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Animated dots */}
      <div className="flex space-x-1 mr-2">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
            animate={{
              y: [0, -4, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Typing text */}
      <span>{typingText}</span>
    </motion.div>
  );
}
