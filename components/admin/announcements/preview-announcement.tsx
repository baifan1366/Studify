"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Calendar, Send, Clock, AlertCircle, ExternalLink, Smartphone, Monitor } from "lucide-react";
import { Announcement } from "@/interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface PreviewAnnouncementProps {
  announcement: Announcement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const statusConfig = {
  draft: { 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", 
    icon: Clock,
    description: "preview_draft_desc"
  },
  scheduled: { 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
    icon: Calendar,
    description: "preview_scheduled_desc"
  },
  sent: { 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    icon: Send,
    description: "preview_sent_desc"
  },
  failed: { 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", 
    icon: AlertCircle,
    description: "preview_failed_desc"
  }
};

export default function PreviewAnnouncement({ 
  announcement,
  open, 
  onOpenChange, 
  trigger 
}: PreviewAnnouncementProps) {
  const t = useTranslations("Announcements");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("mobile");

  const config = statusConfig[announcement.status];
  const StatusIcon = config.icon;

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  // Mobile notification preview component
  const MobilePreview = () => (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
      <div className="max-w-sm mx-auto">
        {/* Phone Frame */}
        <div className="bg-black rounded-[2.5rem] p-2">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden">
            {/* Status Bar */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-2 flex justify-between items-center text-xs">
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
                <div className="w-6 h-3 border border-gray-400 rounded-sm">
                  <div className="w-4 h-full bg-green-500 rounded-sm"></div>
                </div>
              </div>
            </div>
            
            {/* Notification */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Studify
                    </p>
                    <span className="text-xs text-gray-500">now</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                    {announcement.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {announcement.message}
                  </p>
                </div>
              </div>
            </div>
            
            {/* App Content Preview */}
            <div className="h-32 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">App Content</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t("mobile_notification_preview")}
        </p>
      </div>
    </div>
  );

  // Desktop/Web preview component
  const WebPreview = () => (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
      <div className="max-w-md mx-auto">
        {/* Browser Frame */}
        <div className="bg-gray-200 dark:bg-gray-700 rounded-t-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        {/* Web Notification */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg shadow-lg">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Studify
                  </p>
                  <span className="text-xs text-gray-500">studify.app</span>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {announcement.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                  {announcement.message}
                </p>
                {announcement.deep_link && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button size="sm" className="gap-2">
                      <ExternalLink className="h-3 w-3" />
                      {t("open_app")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t("web_notification_preview")}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Eye className="h-5 w-5" />
            {t("preview_announcement")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Announcement Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {announcement.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Badge className={config.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {t(announcement.status)}
                    </Badge>
                    <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                    {announcement.scheduled_at && (
                      <span>
                        {t("scheduled_for")}: {new Date(announcement.scheduled_at).toLocaleString()}
                      </span>
                    )}
                    {announcement.sent_at && (
                      <span>
                        {t("sent_at")}: {new Date(announcement.sent_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {announcement.message}
              </p>
              
              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcement.image_url && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {t("attached_image")}
                    </h4>
                    <img 
                      src={announcement.image_url} 
                      alt={announcement.title}
                      className="rounded-lg max-h-32 object-cover border"
                    />
                  </div>
                )}
                
                {announcement.deep_link && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {t("deep_link")}
                    </h4>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded border">
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {announcement.deep_link}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Information */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <StatusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    {t("status")}: {t(announcement.status)}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t(config.description)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Preview Tabs */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t("notification_preview")}
            </h3>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mobile" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  {t("mobile_view")}
                </TabsTrigger>
                <TabsTrigger value="web" className="gap-2">
                  <Monitor className="h-4 w-4" />
                  {t("web_view")}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="mobile" className="mt-4">
                <MobilePreview />
              </TabsContent>
              
              <TabsContent value="web" className="mt-4">
                <WebPreview />
              </TabsContent>
            </Tabs>
          </div>

          {/* Technical Details */}
          <Card className="bg-gray-50 dark:bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400">
                {t("technical_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span>{t("announcement_id")}:</span>
                  <span className="font-mono">#{announcement.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("public_id")}:</span>
                  <span className="font-mono">{announcement.public_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("created_at")}:</span>
                  <span>{new Date(announcement.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("updated_at")}:</span>
                  <span>{new Date(announcement.updated_at).toLocaleString()}</span>
                </div>
                {announcement.onesignal_id && (
                  <div className="flex justify-between col-span-2">
                    <span>{t("onesignal_id")}:</span>
                    <span className="font-mono">{announcement.onesignal_id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}