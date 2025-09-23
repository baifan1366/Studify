'use client';

import { formatRelativeTime, formatDateSeparator } from '@/utils/chat/timestamp-utils';

interface MessageTimestampProps {
  timestamp: Date;
  showTimestamp?: boolean;
  showDateSeparator?: boolean;
  dateSeparatorText?: string;
  locale?: string;
  className?: string;
}

export function MessageTimestamp({
  timestamp,
  showTimestamp = true,
  showDateSeparator = false,
  dateSeparatorText,
  locale = 'en',
  className = ''
}: MessageTimestampProps) {
  return (
    <>
      {/* Date separator */}
      {showDateSeparator && (
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-muted"></div>
          <div className="px-4 py-2 bg-muted/50 rounded-full">
            <span className="text-xs text-muted-foreground font-medium">
              {dateSeparatorText || formatDateSeparator(timestamp, new Date(), locale)}
            </span>
          </div>
          <div className="flex-1 border-t border-muted"></div>
        </div>
      )}

      {/* Message timestamp */}
      {showTimestamp && (
        <div className={`text-xs text-muted-foreground text-center mt-1 ${className}`}>
          {formatRelativeTime(timestamp, new Date(), locale)}
        </div>
      )}
    </>
  );
}

interface SeenStatusProps {
  seenTime?: Date;
  locale?: string;
  className?: string;
}

export function SeenStatus({ seenTime, locale = 'en', className = '' }: SeenStatusProps) {
  if (!seenTime) return null;

  const diffMs = new Date().getTime() - seenTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const seenStr = locale.startsWith('zh') ? '已读' : 'Seen';
  
  let timeStr = '';
  if (diffMinutes < 1) {
    timeStr = locale.startsWith('zh') ? '刚刚' : 'just now';
  } else if (diffDays === 0) {
    timeStr = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(seenTime);
  } else if (diffDays === 1) {
    const yesterdayStr = locale.startsWith('zh') ? '昨天' : 'Yesterday';
    const time = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(seenTime);
    timeStr = `${yesterdayStr} ${time}`;
  } else {
    timeStr = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(seenTime);
  }

  return (
    <div className={`text-xs text-muted-foreground text-right mt-1 ${className}`}>
      {seenStr} {timeStr}
    </div>
  );
}
