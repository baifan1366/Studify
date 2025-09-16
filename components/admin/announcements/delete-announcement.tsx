"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { useDeleteAnnouncement } from "@/hooks/announcements/use-announcements";
import { Announcement } from "@/interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";

interface DeleteAnnouncementProps {
  announcement: Announcement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const statusConfig = {
  draft: { 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", 
    canDelete: true,
    warning: "delete_draft_warning"
  },
  scheduled: { 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
    canDelete: true,
    warning: "delete_scheduled_warning"
  },
  sent: { 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    canDelete: false,
    warning: "delete_sent_warning"
  },
  failed: { 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", 
    canDelete: true,
    warning: "delete_failed_warning"
  }
};

export default function DeleteAnnouncement({ 
  announcement,
  open, 
  onOpenChange, 
  trigger,
  onSuccess
}: DeleteAnnouncementProps) {
  const t = useTranslations("Announcements");
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const deleteAnnouncementMutation = useDeleteAnnouncement();
  const config = statusConfig[announcement.status];

  const handleDelete = async () => {
    try {
      await deleteAnnouncementMutation.mutateAsync(announcement);
      
      toast({
        title: t("success"),
        description: t("announcement_deleted"),
      });
      
      setShowConfirmDialog(false);
      if (onOpenChange) onOpenChange(false);
      else setIsOpen(false);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: t("error"),
        description: t("delete_failed"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    if (onOpenChange) onOpenChange(false);
    else setIsOpen(false);
  };

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-red-600 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
            {t("delete_announcement")}
          </DialogTitle>
          <DialogDescription>
            {t("delete_announcement_desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Announcement Preview */}
          <Card className="border-red-200 dark:border-red-800 p-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {announcement.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Badge className={config.color}>
                      {t(announcement.status)}
                    </Badge>
                    <span>{formatDate(announcement.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 line-clamp-3 text-sm">
                {announcement.message}
              </p>
              {announcement.scheduled_at && (
                <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                  {t("scheduled_for")}: {formatDate(announcement.scheduled_at)}
                </div>
              )}
              {announcement.sent_at && (
                <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                  {t("sent_at")}: {formatDate(announcement.sent_at)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning Message */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t("delete_warning_title")}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t(config.warning)}
              </p>
              {!config.canDelete && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t("cannot_delete_sent")}
                </p>
              )}
            </div>
          </div>

          {/* Additional Info */}
          {config.canDelete && (
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t("deletion_effects")}
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• {t("effect_permanent_deletion")}</li>
                <li>• {t("effect_no_recovery")}</li>
                {announcement.status === "scheduled" && (
                  <li>• {t("effect_cancel_schedule")}</li>
                )}
                {announcement.onesignal_id && (
                  <li>• {t("effect_onesignal_cleanup")}</li>
                )}
              </ul>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={deleteAnnouncementMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              {t("cancel")}
            </Button>
            
            {config.canDelete ? (
              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={deleteAnnouncementMutation.isPending}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("delete_permanently")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      {t("confirm_deletion")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("final_delete_confirmation", { title: announcement.title })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      disabled={deleteAnnouncementMutation.isPending}
                    >
                      {deleteAnnouncementMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                          {t("deleting")}
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("delete_permanently")}
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="destructive"
                disabled
                className="gap-2 opacity-50 cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                {t("cannot_delete")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}