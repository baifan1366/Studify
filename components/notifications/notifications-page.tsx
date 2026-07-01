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
    <div className="container mx-auto min-h-screen space-y-6 bg-background px-4 py-6 text-foreground sm:px-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <div className="mb-3 h-1 w-12 rounded-full bg-orange-500" />
          <motion.h1
            className="text-3xl font-bold text-foreground sm:text-4xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {t("title") || "Notifications"}
          </motion.h1>
          <motion.p
            className="mt-1 text-lg text-muted-foreground"
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
                className="border-0 bg-orange-500 text-white hover:bg-orange-600"
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
                  variant="outline"
                  className="border-border bg-card text-foreground hover:bg-muted"
                  size="icon"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-border bg-popover text-popover-foreground"
            >
              <DropdownMenuItem>
                <Filter className="h-4 w-4 mr-2" />
                {t("filter_notifications") || "Filter notifications"}
              </DropdownMenuItem>
              <DropdownMenuItem>
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
          <TabsList className="grid h-auto w-full grid-cols-3 border border-border bg-muted/60">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
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
              className="flex items-center gap-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
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
              className="flex items-center gap-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
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
              <Card className="border-border bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    {t("all_notifications") || "All Notifications"}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
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
                    <div className="border-t border-border p-4">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full border-border hover:bg-muted"
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
              <Card className="border-border bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    {t("unread_notifications") || "Unread Notifications"}
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                        {unreadCount}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
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
                    <div className="border-t border-border p-4">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full border-border hover:bg-muted"
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
