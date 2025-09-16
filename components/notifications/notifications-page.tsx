'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Filter, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications, useNotificationCount, useMarkAllNotificationsRead } from '@/hooks/notifications/use-notifications';
import { NotificationList } from './notification-list';
import NotificationSettings from './notification-settings';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: countData } = useNotificationCount();
  const { data: allNotifications, isLoading: allLoading } = useNotifications(page, limit, false);
  const { data: unreadNotifications, isLoading: unreadLoading } = useNotifications(page, limit, true);
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = countData?.count || 0;
  const currentNotifications = activeTab === 'unread' ? unreadNotifications : allNotifications;
  const currentLoading = activeTab === 'unread' ? unreadLoading : allLoading;

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your learning activities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              Mark all as read
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Filter className="h-4 w-4 mr-2" />
                Filter notifications
              </DropdownMenuItem>
              <DropdownMenuItem>
                Export notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            All
            {allNotifications && (
              <Badge variant="secondary" className="ml-1">
                {allNotifications.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                View all your notifications, both read and unread
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <NotificationList
                notifications={currentNotifications?.notifications || []}
                isLoading={currentLoading}
              />
              
              {currentNotifications?.hasMore && (
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="w-full"
                  >
                    Load more notifications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Unread Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'You\'re all caught up! No unread notifications.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <NotificationList
                notifications={currentNotifications?.notifications || []}
                isLoading={currentLoading}
              />
              
              {currentNotifications?.hasMore && (
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="w-full"
                  >
                    Load more notifications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
