// Chat Timestamp Utilities - Messenger-style timestamp display

export interface MessageTimestamp {
  id: string;
  clientTimestamp: Date;
  serverTimestamp: Date;
  senderId: string;
}

export interface TimestampGroup {
  showTimestamp: boolean;
  showDateSeparator: boolean;
  timestampText?: string;
  dateSeparatorText?: string;
}

/**
 * Calculate display timestamp correcting for client-server time difference
 */
export function getDisplayTimestamp(
  clientTime: Date,
  serverTime: Date,
  now: Date = new Date()
): Date {
  // Calculate the time difference between client and server
  const timeDrift = clientTime.getTime() - serverTime.getTime();
  
  // If drift is more than 5 minutes, use server time for accuracy
  if (Math.abs(timeDrift) > 5 * 60 * 1000) {
    return serverTime;
  }
  
  // Otherwise use client time for responsiveness
  return clientTime;
}

/**
 * Format relative time like Messenger
 */
export function formatRelativeTime(
  timestamp: Date,
  now: Date = new Date(),
  locale: string = 'en'
): string {
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Just sent (less than 1 minute)
  if (diffMinutes < 1) {
    return locale.startsWith('zh') ? '刚刚' : 'Just now';
  }

  // Same day
  if (diffDays === 0) {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  }

  // Yesterday
  if (diffDays === 1) {
    const timeStr = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
    const yesterdayStr = locale.startsWith('zh') ? '昨天' : 'Yesterday';
    return `${yesterdayStr} ${timeStr}`;
  }

  // This week (within 7 days)
  if (diffDays < 7) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  }

  // Older messages
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(timestamp);
}

/**
 * Format date separator like Messenger
 */
export function formatDateSeparator(
  timestamp: Date,
  now: Date = new Date(),
  locale: string = 'en'
): string {
  const diffMs = now.getTime() - timestamp.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) {
    const todayStr = locale.startsWith('zh') ? '今天' : 'Today';
    const timeStr = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
    return `${todayStr}, ${timeStr}`;
  }

  // Yesterday
  if (diffDays === 1) {
    const yesterdayStr = locale.startsWith('zh') ? '昨天' : 'Yesterday';
    const timeStr = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
    return `${yesterdayStr}, ${timeStr}`;
  }

  // Older dates
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(timestamp);
}

/**
 * Determine if messages should be grouped (Messenger-style logic)
 */
export function shouldGroupMessages(
  currentMsg: MessageTimestamp,
  previousMsg?: MessageTimestamp,
  maxGapMinutes: number = 5
): boolean {
  if (!previousMsg) return false;
  
  // Different senders = new group
  if (currentMsg.senderId !== previousMsg.senderId) return false;
  
  // Time gap too large = new group
  const timeDiff = currentMsg.serverTimestamp.getTime() - previousMsg.serverTimestamp.getTime();
  const gapMinutes = timeDiff / (1000 * 60);
  
  if (gapMinutes > maxGapMinutes) return false;
  
  return true;
}

/**
 * Determine if we need a date separator
 */
export function needsDateSeparator(
  currentMsg: MessageTimestamp,
  previousMsg?: MessageTimestamp
): boolean {
  if (!previousMsg) return true;
  
  const currentDate = new Date(currentMsg.serverTimestamp.toDateString());
  const previousDate = new Date(previousMsg.serverTimestamp.toDateString());
  
  return currentDate.getTime() !== previousDate.getTime();
}

/**
 * Generate timestamp display rules for a list of messages
 */
export function generateTimestampGroups(
  messages: MessageTimestamp[],
  locale: string = 'en'
): Map<string, TimestampGroup> {
  const groups = new Map<string, TimestampGroup>();
  
  for (let i = 0; i < messages.length; i++) {
    const currentMsg = messages[i];
    const previousMsg = i > 0 ? messages[i - 1] : undefined;
    const nextMsg = i < messages.length - 1 ? messages[i + 1] : undefined;
    
    const displayTime = getDisplayTimestamp(
      currentMsg.clientTimestamp,
      currentMsg.serverTimestamp
    );
    
    const shouldGroup = shouldGroupMessages(currentMsg, previousMsg);
    const needsSeparator = needsDateSeparator(currentMsg, previousMsg);
    const isLastInGroup = !nextMsg || !shouldGroupMessages(nextMsg, currentMsg);
    
    groups.set(currentMsg.id, {
      showTimestamp: !shouldGroup || isLastInGroup,
      showDateSeparator: needsSeparator,
      timestampText: formatRelativeTime(displayTime, new Date(), locale),
      dateSeparatorText: needsSeparator 
        ? formatDateSeparator(displayTime, new Date(), locale)
        : undefined
    });
  }
  
  return groups;
}

/**
 * Format "Seen" timestamp like Messenger
 */
export function formatSeenTimestamp(
  seenTime: Date,
  now: Date = new Date(),
  locale: string = 'en'
): string {
  const diffMs = now.getTime() - seenTime.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const seenStr = locale.startsWith('zh') ? '已读' : 'Seen';
  
  // Same day - just show time
  if (diffDays === 0) {
    const timeStr = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(seenTime);
    return `${seenStr} ${timeStr}`;
  }
  
  // Yesterday
  if (diffDays === 1) {
    const yesterdayStr = locale.startsWith('zh') ? '昨天' : 'Yesterday';
    const timeStr = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(seenTime);
    return `${seenStr} ${yesterdayStr} ${timeStr}`;
  }
  
  // Older
  const dateTimeStr = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(seenTime);
  return `${seenStr} ${dateTimeStr}`;
}
