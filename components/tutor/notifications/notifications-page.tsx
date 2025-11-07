'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
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
import { useNotifications, useNotificationCount, useMarkAllNotificationsRead } from '@/hooks/tutor-notification/use-notifications';
import { NotificationList } from './notification-list';
import NotificationSettings from './notification-settings';

export default function NotificationsPage() {
  const t = useTranslations('TutorNotificationsPage');
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
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex-1 min-w-0">
            <motion.h1 
              className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 dark:from-blue-400 dark:via-purple-400 dark:to-orange-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {t('notifications')}
            </motion.h1>
            <motion.p 
              className="text-gray-600 dark:text-gray-400 text-sm sm:text-base md:text-lg mt-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {t('stay_updated_with_your_learning_activities')}
            </motion.p>
          </div>
          
          <motion.div 
            className="flex items-center gap-2 w-full sm:w-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {unreadCount > 0 && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 sm:flex-initial"
              >
                <Button
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white border-0 text-xs sm:text-sm"
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  size="sm"
                >
                  <span className="hidden sm:inline">{t('mark_all_as_read')}</span>
                  <span className="sm:hidden">{t('mark_all')}</span>
                </Button>
              </motion.div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="outline" size="icon" className="flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Filter className="h-4 w-4 mr-2" />
                  {t('filter_notifications')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('export_notifications')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="all" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('all')}</span>
                <span className="sm:hidden">All</span>
                {allNotifications && (
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1 sm:px-2">
                    {allNotifications.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">{t('unread')}</span>
                <span className="sm:hidden">New</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs px-1 sm:px-2">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('settings')}</span>
                <span className="sm:hidden">Set</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">All Notifications</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      View all your notifications, both read and unread
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <NotificationList
                      notifications={currentNotifications?.notifications || []}
                      isLoading={currentLoading}
                    />
                    
                    {currentNotifications?.hasMore && (
                      <div className="p-3 sm:p-4 border-t">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            className="w-full text-xs sm:text-sm"
                            size="sm"
                            onClick={handleLoadMore}
                          >
                            Load more notifications
                          </Button>
                        </motion.div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-base sm:text-lg">
                      <span>Unread Notifications</span>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
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
                      <div className="p-3 sm:p-4 border-t">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            className="w-full text-xs sm:text-sm"
                            size="sm"
                            onClick={handleLoadMore}
                          >
                            Load more notifications
                          </Button>
                        </motion.div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <NotificationSettings />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
  );
}
