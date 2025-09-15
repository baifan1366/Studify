"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Filter, MoreHorizontal, Calendar, Send, Clock, AlertCircle } from "lucide-react";
import { useAnnouncements, useDeleteAnnouncement, useUpdateAnnouncementStatus } from "@/hooks/announcements/use-announcements";
import { Announcement } from "@/interface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  draft: { 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", 
    icon: Clock 
  },
  scheduled: { 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
    icon: Calendar 
  },
  sent: { 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    icon: Send 
  },
  failed: { 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", 
    icon: AlertCircle 
  }
};

export default function AnnouncementList() {
  const t = useTranslations("Announcements");
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const { data: announcements, isLoading, error } = useAnnouncements();
  const deleteAnnouncementMutation = useDeleteAnnouncement();
  const updateStatusMutation = useUpdateAnnouncementStatus();

  const filteredAnnouncements = announcements?.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || announcement.status === statusFilter;
    return matchesSearch && matchesStatus && !announcement.is_deleted;
  }) || [];

  const handleDelete = async (announcement: Announcement) => {
    try {
      await deleteAnnouncementMutation.mutateAsync(announcement);
      toast({
        title: t("success"),
        description: t("announcement_deleted"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("delete_failed"),
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (announcementId: number, status: 'draft' | 'scheduled' | 'sent' | 'failed') => {
    try {
      await updateStatusMutation.mutateAsync({ announcementId, status });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{t("load_error")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("announcements")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("manage_announcements")}</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("create_announcement")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("search_announcements")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t("filter_status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_statuses")}</SelectItem>
            <SelectItem value="draft">{t("draft")}</SelectItem>
            <SelectItem value="scheduled">{t("scheduled")}</SelectItem>
            <SelectItem value="sent">{t("sent")}</SelectItem>
            <SelectItem value="failed">{t("failed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Announcements Grid */}
      <div className="grid gap-4">
        {filteredAnnouncements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Send className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t("no_announcements")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t("no_announcements_desc")}
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("create_first_announcement")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement) => {
            const StatusIcon = statusConfig[announcement.status].icon;
            return (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {announcement.title}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <Badge className={statusConfig[announcement.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t(announcement.status)}
                        </Badge>
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                        {announcement.scheduled_at && (
                          <span>
                            {t("scheduled_for")}: {new Date(announcement.scheduled_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>{t("edit")}</DropdownMenuItem>
                        <DropdownMenuItem>{t("preview")}</DropdownMenuItem>
                        <DropdownMenuItem>{t("duplicate")}</DropdownMenuItem>
                        {announcement.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusUpdate(announcement.id, 'scheduled')}>
                            {t("schedule")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600 dark:text-red-400"
                          onClick={() => setSelectedAnnouncement(announcement)}
                        >
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                    {announcement.message}
                  </p>
                  {announcement.image_url && (
                    <div className="mt-3">
                      <img 
                        src={announcement.image_url} 
                        alt={announcement.title}
                        className="rounded-lg max-h-32 object-cover"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_announcement")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_confirmation", { title: selectedAnnouncement?.title || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedAnnouncement) {
                  handleDelete(selectedAnnouncement);
                  setSelectedAnnouncement(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}