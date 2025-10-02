'use client';

import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { MessageSquare, BookOpen, Users, Bell, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkNotificationRead, useDeleteNotification } from '@/hooks/notifications/use-notifications';
import type { Notification } from '@/hooks/notifications/use-notifications';

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  compact?: boolean;
}

export function NotificationList({ notifications, isLoading, compact = false }: NotificationListProps) {
  const t = useTranslations('NotificationList');
  const markReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();

  const getNotificationIcon = (kind: string) => {
    switch (kind) {
      case 'course_notification':
        return <BookOpen className="h-4 w-4" />;
      case 'classroom_notification':
        return <Users className="h-4 w-4" />;
      case 'community_notification':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationTitle = (notification: Notification) => {
    const { kind, payload } = notification;
    
    switch (kind) {
      case 'course_notification':
        return `📚 ${payload.course_title || 'Course Update'}`;
      case 'classroom_notification':
        const classroomIcons = {
          live_session: '🎥',
          assignment: '📝',
          announcement: '📢',
        };
        const icon = classroomIcons[payload.type as keyof typeof classroomIcons] || '📢';
        return `${icon} ${payload.classroom_name || 'Classroom Update'}`;
      case 'community_notification':
        const communityIcons = {
          new_post: '💬',
          comment: '💭',
          reaction: '👍',
        };
        const communityIcon = communityIcons[payload.type as keyof typeof communityIcons] || '💬';
        return `${communityIcon} ${payload.group_name || 'Community Update'}`;
      case 'system':
        return payload.title || '📢 System Announcement';
      default:
        return payload.title || 'Notification';
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    // Try to get message from payload first, fallback to a default
    if (notification.payload.message) {
      return notification.payload.message;
    }
    
    const { kind, payload } = notification;
    
    switch (kind) {
      case 'course_notification':
        return payload.type === 'new_lesson' 
          ? t('new_lesson_available') || 'New lesson available'
          : payload.type === 'assignment_due'
          ? t('assignment_due_soon') || 'Assignment due soon'
          : t('course_updated') || 'Course has been updated';
      case 'classroom_notification':
        return payload.type === 'live_session'
          ? t('live_session_starting') || 'Live session starting soon'
          : payload.type === 'assignment'
          ? t('new_assignment_posted') || 'New assignment posted'
          : t('new_announcement') || 'New announcement';
      case 'community_notification':
        return payload.type === 'new_post'
          ? t('new_post_in_group') || 'New post in group'
          : payload.type === 'comment'
          ? t('someone_commented') || 'Someone commented on your post'
          : t('someone_reacted') || 'Someone reacted to your content';
      case 'system':
        return payload.message || t('system_announcement') || 'System announcement';
      default:
        return payload.message || t('new_notification') || 'You have a new notification';
    }
  };

  const getNotificationLink = (notification: Notification) => {
    const { kind, payload } = notification;
    
    switch (kind) {
      case 'course_notification':
        return `/course/${payload.course_id}`;
      case 'classroom_notification':
        return `/classroom/${payload.classroom_slug}`;
      case 'community_notification':
        return `/community/groups/${payload.group_slug}`;
      case 'system':
        return payload.deep_link || '#';
      default:
        return payload.deep_link || '#';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.public_id);
    }
    
    const link = getNotificationLink(notification);
    if (link !== '#') {
      window.location.href = link;
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    markReadMutation.mutate(notificationId);
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteMutation.mutate(notificationId);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('no_notifications') || 'No notifications yet'}</p>
        <p className="text-sm">{t('notify_when_important') || "We'll notify you when something important happens"}</p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-3 p-4"}>
      {notifications.map((notification) => (
        <Card
          key={notification.public_id}
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
            !notification.is_read ? 'border-primary/50 bg-primary/5' : ''
          } ${compact ? 'border-0 shadow-none' : ''}`}
          onClick={() => handleNotificationClick(notification)}
        >
          <CardContent className={compact ? "p-3" : "p-4"}>
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 ${compact ? 'mt-1' : 'mt-0.5'}`}>
                {getNotificationIcon(notification.kind)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-medium ${compact ? 'text-sm' : ''} ${
                      !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {getNotificationTitle(notification)}
                    </p>
                    <p className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground mt-1 line-clamp-2`}>
                      {getNotificationMessage(notification)}
                    </p>
                    <p className={`${compact ? 'text-xs' : 'text-xs'} text-muted-foreground mt-2`}>
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  
                  {!compact && (
                    <div className="flex items-center space-x-1 ml-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleMarkAsRead(e, notification.public_id)}
                          disabled={markReadMutation.isPending}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, notification.public_id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {!notification.is_read && (
                  <Badge variant="secondary" className={`${compact ? 'text-xs' : 'text-xs'} mt-2`}>
                    {t('new') || 'New'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
