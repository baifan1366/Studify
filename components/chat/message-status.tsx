import React from 'react';
import { Check, CheckCheck, Clock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface MessageStatusProps {
  status: MessageStatus;
  className?: string;
  showText?: boolean;
}

export function MessageStatus({ status, className, showText = false }: MessageStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
      case 'sent':
        return <Check className="h-4 w-4 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <Send className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {getStatusIcon()}
      {showText && (
        <span className="text-xs text-muted-foreground">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

// Higher-order component for messages
interface MessageWithStatusProps {
  status: MessageStatus;
  timestamp: string;
  deliveredAt?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function MessageWithStatus({ 
  status, 
  timestamp, 
  deliveredAt, 
  children, 
  className 
}: MessageWithStatusProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {children}
      <div className="flex items-center justify-end gap-1 mt-1">
        <span className="text-xs text-muted-foreground">
          {formatTime(timestamp)}
        </span>
        <MessageStatus status={status} />
      </div>
      {status === 'delivered' && deliveredAt && (
        <div className="text-xs text-muted-foreground text-right">
          Delivered {formatTime(deliveredAt)}
        </div>
      )}
    </div>
  );
}
