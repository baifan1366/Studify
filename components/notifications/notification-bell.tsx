'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotificationCount, useNotifications, useMarkAllNotificationsRead } from '@/hooks/notifications/use-notifications';
import { NotificationList } from './notification-list';

export function NotificationBell() {
  const t = useTranslations('NotificationBell');
  const [isOpen, setIsOpen] = useState(false);
  const { data: countData } = useNotificationCount();
  const { data: notificationsData, isLoading } = useNotifications(1, 10, false);
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = countData?.count || 0;
  const hasUnread = unreadCount > 0;

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {hasUnread ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={5}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('title') || 'Notifications'}</h3>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                {t('mark_all_read') || 'Mark all read'}
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <NotificationList
            notifications={notificationsData?.notifications || []}
            isLoading={isLoading}
            compact={true}
          />
        </div>

        {notificationsData && notificationsData.notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                // Navigate to full notifications page
                window.location.href = '/notifications';
              }}
            >
              {t('view_all') || 'View all notifications'}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
