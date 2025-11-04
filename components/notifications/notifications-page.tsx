"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, Filter, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useNotifications,
  useNotificationCount,
  useMarkAllNotificationsRead,
} from "@/hooks/notifications/use-notifications";
import { NotificationList } from "./notification-list";
import NotificationSettings from "./notification-settings";

export default function NotificationsPage() {
  const t = useTranslations("NotificationsPage");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: countData } = useNotificationCount();
  const { data: allNotifications, isLoading: allLoading } = useNotifications(
    page,
    limit,
    false
  );
  const { data: unreadNotifications, isLoading: unreadLoading } =
    useNotifications(page, limit, true);
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = countData?.count || 0;
  const currentNotifications =
    activeTab === "unread" ? unreadNotifications : allNotifications;
  const currentLoading = activeTab === "unread" ? unreadLoading : allLoading;

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <motion.h1
            className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {t("title") || "Notifications"}
          </motion.h1>
          <motion.p
            className="text-white/70 dark:text-white/70 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {t("subtitle") || "Stay updated with your learning activities"}
          </motion.p>
        </div>

        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {unreadCount > 0 && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                {t("mark_all_read") || "Mark all as read"}
              </Button>
            </motion.div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                  size="icon"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white/10 backdrop-blur-sm border-white/20"
            >
              <DropdownMenuItem className="text-white hover:bg-white/10">
                <Filter className="h-4 w-4 mr-2" />
                {t("filter_notifications") || "Filter notifications"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-white/10">
                {t("export_notifications") || "Export notifications"}
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
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-sm border border-white/20">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
            >
              <Bell className="h-4 w-4" />
              {t("all") || "All"}
              {allNotifications && (
                <Badge
                  variant="secondary"
                  className="ml-1 bg-blue-500/20 text-blue-300 border-blue-400/30"
                >
                  {allNotifications.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="flex items-center gap-2 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
            >
              {t("unread") || "Unread"}
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 bg-red-500/20 text-red-300 border-red-400/30"
                >
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
            >
              <Settings className="h-4 w-4" />
              {t("settings") || "Settings"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">
                    {t("all_notifications") || "All Notifications"}
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    {t("all_notifications_desc") ||
                      "View all your notifications, both read and unread"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <NotificationList
                    notifications={currentNotifications?.notifications || []}
                    isLoading={currentLoading}
                  />

                  {currentNotifications?.hasMore && (
                    <div className="p-4 border-t border-white/10">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                          onClick={handleLoadMore}
                        >
                          {t("load_more") || "Load more notifications"}
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
              <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {t("unread_notifications") || "Unread Notifications"}
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                        {unreadCount}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    {unreadCount > 0
                      ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""
                      }`
                      : "You're all caught up! No unread notifications."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <NotificationList
                    notifications={currentNotifications?.notifications || []}
                    isLoading={currentLoading}
                  />

                  {currentNotifications?.hasMore && (
                    <div className="p-4 border-t border-white/10">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                          onClick={handleLoadMore}
                        >
                          {t("load_more") || "Load more notifications"}
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
