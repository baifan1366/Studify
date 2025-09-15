"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CalendarIcon, ImageIcon, LinkIcon, Edit, Save, X } from "lucide-react";
import { announcementSchema } from "@/lib/validations/announcement";
import { useUpdateAnnouncement, useAnnouncement } from "@/hooks/announcements/use-announcements";
import { Announcement } from "@/interface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/profile/use-user";
import { formatDate } from "@/lib/formatters";

interface EditAnnouncementProps {
  announcementId?: number;
  announcement?: Announcement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export default function EditAnnouncement({ 
  announcementId,
  announcement: initialAnnouncement,
  open, 
  onOpenChange, 
  trigger 
}: EditAnnouncementProps) {
  const t = useTranslations("Announcements");
  const { data: userData } = useUser();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch announcement data if only ID is provided
  const { data: fetchedAnnouncement, isLoading } = useAnnouncement(announcementId);
  const announcement = initialAnnouncement || fetchedAnnouncement;

  const updateAnnouncementMutation = useUpdateAnnouncement();

  // Form state
  const [formData, setFormData] = useState({
    created_by: userData?.profile?.id,
    title: "",
    message: "",
    image_url: "",
    deep_link: "",
    status: "draft" as "draft" | "scheduled" | "sent" | "failed",
    scheduled_at: "",
  });

  // Populate form when announcement data is available
  useEffect(() => {
    if (announcement) {
      setFormData({
        created_by: userData?.profile?.id?.toString() || "",
        title: announcement.title,
        message: announcement.message,
        image_url: announcement.image_url || "",
        deep_link: announcement.deep_link || "",
        status: announcement.status,
        scheduled_at: announcement.scheduled_at ? 
          new Date(announcement.scheduled_at).toISOString().slice(0, 16) : "",
      });
      setImagePreview(announcement.image_url);
    }
  }, [announcement]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleImageUrlChange = (url: string) => {
    handleInputChange("image_url", url);
    setImagePreview(url);
  };

  const validateForm = () => {
    try {
      announcementSchema(t).parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        if (err.path) {
          newErrors[err.path[0]] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!announcement) return;
    
    if (!validateForm()) {
      return;
    }

    try {
      await updateAnnouncementMutation.mutateAsync({
        id: announcement.id,
        ...formData,
        created_by: Number(userData?.profile?.id),
      });
      
      toast({
        title: t("success"),
        description: t("announcement_updated"),
      });
      
      if (onOpenChange) onOpenChange(false);
      else setIsOpen(false);
    } catch (error) {
      toast({
        title: t("error"),
        description: t("update_failed"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (announcement) {
      setFormData({
        created_by: userData?.profile?.id?.toString() || "",
        title: announcement.title,
        message: announcement.message,
        image_url: announcement.image_url || "",
        deep_link: announcement.deep_link || "",
        status: announcement.status,
        scheduled_at: announcement.scheduled_at ? 
          new Date(announcement.scheduled_at).toISOString().slice(0, 16) : "",
      });
      setImagePreview(announcement.image_url);
    }
    setErrors({});
    if (onOpenChange) onOpenChange(false);
    else setIsOpen(false);
  };

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-5 w-5" />
            {t("edit_announcement")}
          </DialogTitle>
          <DialogDescription>
            {t("edit_announcement_description")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <Card className="bg-transparent p-2">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-48" />
              </CardContent>
            </Card>
          </div>
        ) : !announcement ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">{t("announcement_not_found")}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle className="text-lg">{t("basic_information")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    {t("title")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder={t("title_placeholder")}
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title}</p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">
                    {t("message")} <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder={t("message_placeholder")}
                    rows={4}
                    className={errors.message ? "border-red-500" : ""}
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500">{errors.message}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("status")}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange("status", value)}
                    disabled={announcement.status === "sent"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            {t("draft")}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="scheduled">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {t("scheduled")}
                          </Badge>
                        </div>
                      </SelectItem>
                      {announcement.status === "sent" && (
                        <SelectItem value="sent" disabled>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {t("sent")}
                            </Badge>
                          </div>
                        </SelectItem>
                      )}
                      {announcement.status === "failed" && (
                        <SelectItem value="failed">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {t("failed")}
                            </Badge>
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {announcement.status === "sent" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("sent_announcement_readonly")}
                    </p>
                  )}
                </div>

                {/* Scheduled Date */}
                {formData.status === "scheduled" && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at" className="text-sm font-medium">
                      <CalendarIcon className="inline h-4 w-4 mr-1" />
                      {t("scheduled_at")}
                    </Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => handleInputChange("scheduled_at", e.target.value)}
                      className={errors.scheduled_at ? "border-red-500" : ""}
                    />
                    {errors.scheduled_at && (
                      <p className="text-sm text-red-500">{errors.scheduled_at}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media & Links */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t("media_links")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="image_url" className="text-sm font-medium">
                    <ImageIcon className="inline h-4 w-4 mr-1" />
                    {t("image_url")}
                  </Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    placeholder={t("image_url_placeholder")}
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="rounded-lg max-h-32 object-cover border"
                        onError={() => setImagePreview(null)}
                      />
                    </div>
                  )}
                </div>

                {/* Deep Link */}
                <div className="space-y-2">
                  <Label htmlFor="deep_link" className="text-sm font-medium">
                    <LinkIcon className="inline h-4 w-4 mr-1" />
                    {t("deep_link")}
                  </Label>
                  <Input
                    id="deep_link"
                    value={formData.deep_link}
                    onChange={(e) => handleInputChange("deep_link", e.target.value)}
                    placeholder={t("deep_link_placeholder")}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("deep_link_description")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="bg-gray-50 dark:bg-gray-900/50 p-2">
              <CardHeader>
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">
                  {t("announcement_metadata")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>{t("created_at")}:</span>
                  <span>{formatDate(announcement.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("updated_at")}:</span>
                  <span>{formatDate(announcement.updated_at)}</span>
                </div>
                {announcement.sent_at && (
                  <div className="flex justify-between">
                    <span>{t("sent_at")}:</span>
                    <span>{formatDate(announcement.sent_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={updateAnnouncementMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updateAnnouncementMutation.isPending || announcement.status === "sent"}
                className="min-w-[120px]"
              >
                {updateAnnouncementMutation.isPending ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    {t("updating")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t("update_announcement")}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}