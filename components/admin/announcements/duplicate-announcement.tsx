"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Copy, Loader2, X } from "lucide-react";
import { announcementSchema } from "@/lib/validations/announcement";
import { useCreateAnnouncement } from "@/hooks/announcements/use-announcements";
import { Announcement } from "@/interface";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/hooks/profile/use-user';

interface DuplicateAnnouncementProps {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DuplicateAnnouncement({ 
  announcement, 
  open, 
  onOpenChange 
}: DuplicateAnnouncementProps) {
  const t = useTranslations("Announcements");
  const { data: userData } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const createAnnouncementMutation = useCreateAnnouncement();

  // Generate duplicate title with "- Copy" suffix
  const generateDuplicateTitle = (originalTitle: string): string => {
    return `${originalTitle} - Copy`;
  };

  const handleDuplicate = async () => {
    if (!userData?.profile?.id) {
      toast({
        title: t("error"),
        description: t("user_not_found"),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare duplicate data based on original announcement
      const duplicateData = {
        created_by: userData.profile.id,
        title: generateDuplicateTitle(announcement.title),
        message: announcement.message,
        image_url: announcement.image_url || "",
        deep_link: announcement.deep_link || "",
        status: "draft" as const, // Always create duplicates as draft
        scheduled_at: "", // Reset scheduling
      };

      // Validate the data
      const schema = announcementSchema(t);
      const validatedData = schema.parse(duplicateData);

      // Create the duplicate announcement
      await createAnnouncementMutation.mutateAsync({
        created_by: Number(userData.profile.id),
        body: validatedData,
      });

      toast({
        title: t("success"),
        description: t("announcement_duplicated"),
      });

      // Close the dialog
      onOpenChange(false);
    } catch (error: any) {
      console.error("Duplication error:", error);
      
      let errorMessage = t("duplicate_failed");
      if (error?.issues) {
        // Zod validation errors
        errorMessage = error.issues.map((issue: any) => issue.message).join(", ");
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: t("error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t("duplicate_announcement")}
          </DialogTitle>
          <DialogDescription>
            {t("duplicate_announcement_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original announcement preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t("original_announcement")}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <strong>{t("title")}:</strong> {announcement.title}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{t("status")}:</strong> {t(announcement.status)}
            </p>
          </div>

          {/* Duplicate preview */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t("duplicate_preview")}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
              <strong>{t("title")}:</strong> {generateDuplicateTitle(announcement.title)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{t("status")}:</strong> {t("draft")}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              {t("cancel")}
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {isProcessing ? t("duplicating") : t("duplicate")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}