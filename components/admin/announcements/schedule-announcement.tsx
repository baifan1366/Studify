"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Send, AlertCircle, CheckCircle, X } from "lucide-react";
import { useUpdateAnnouncementStatus } from "@/hooks/announcements/use-announcements";
import { Announcement } from "@/interface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatters";

interface ScheduleAnnouncementProps {
  announcement: Announcement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const timePresets = [
  { label: "in_5_minutes", minutes: 5 },
  { label: "in_15_minutes", minutes: 15 },
  { label: "in_30_minutes", minutes: 30 },
  { label: "in_1_hour", minutes: 60 },
  { label: "in_2_hours", minutes: 120 },
  { label: "in_4_hours", minutes: 240 },
  { label: "tomorrow_9am", minutes: null }, // Special case
  { label: "next_week", minutes: null }, // Special case
];

export default function ScheduleAnnouncement({ 
  announcement,
  open, 
  onOpenChange, 
  trigger,
  onSuccess
}: ScheduleAnnouncementProps) {
  const t = useTranslations("Announcements");
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");

  const updateStatusMutation = useUpdateAnnouncementStatus();

  // Initialize with current scheduled time if exists
  useEffect(() => {
    if (announcement.scheduled_at) {
      const date = new Date(announcement.scheduled_at);
      setScheduledDateTime(date.toISOString().slice(0, 16));
    } else {
      // Default to 1 hour from now
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      setScheduledDateTime(defaultTime.toISOString().slice(0, 16));
    }
  }, [announcement.scheduled_at]);

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case "tomorrow_9am":
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        setScheduledDateTime(tomorrow.toISOString().slice(0, 16));
        break;
      case "next_week":
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(9, 0, 0, 0);
        setScheduledDateTime(nextWeek.toISOString().slice(0, 16));
        break;
      default:
        //add translation
        const presetData = timePresets.find(p => p.label === preset);
        if (presetData && presetData.minutes) {
          const scheduledTime = new Date(now.getTime() + presetData.minutes * 60000);
          setScheduledDateTime(scheduledTime.toISOString().slice(0, 16));
        }
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDateTime) {
      toast({
        title: t("error"),
        description: t("schedule_time_required"),
        variant: "destructive",
      });
      return;
    }

    const scheduledTime = new Date(scheduledDateTime);
    const now = new Date();

    if (scheduledTime <= now) {
      toast({
        title: t("error"),
        description: t("schedule_time_future"),
        variant: "destructive",
      });
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        announcementId: announcement.id,
        status: "scheduled",
        scheduled_at: scheduledTime.toISOString(),
      });
      
      toast({
        title: t("success"),
        description: t("announcement_scheduled", { 
          time: formatDate(scheduledTime.toISOString(), "en-US", { hour: "2-digit", minute: "2-digit" }) 
        }),
      });
      
      if (onOpenChange) onOpenChange(false);
      else setIsOpen(false);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: t("error"),
        description: t("schedule_failed"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (announcement.scheduled_at) {
      const date = new Date(announcement.scheduled_at);
      setScheduledDateTime(date.toISOString().slice(0, 16));
    }
    setSelectedPreset("");
    if (onOpenChange) onOpenChange(false);
    else setIsOpen(false);
  };

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  const canSchedule = announcement.status === "draft" || announcement.status === "scheduled";
  const isCurrentlyScheduled = announcement.status === "scheduled";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5" />
            {isCurrentlyScheduled ? t("reschedule_announcement") : t("schedule_announcement")}
          </DialogTitle>
          <DialogDescription>
            {isCurrentlyScheduled ? t("reschedule_announcement_desc") : t("schedule_announcement_desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Announcement Preview */}
          <Card className="bg-transparent p-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {announcement.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Badge className={
                      announcement.status === "scheduled" 
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }>
                      <Clock className="h-3 w-3 mr-1" />
                      {t(announcement.status)}
                    </Badge>
                    <span>{formatDate(announcement.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                {announcement.message}
              </p>
              {isCurrentlyScheduled && announcement.scheduled_at && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t("currently_scheduled_for")}: {formatDate(announcement.scheduled_at, "en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!canSchedule ? (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                      {t("cannot_schedule_title")}
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {announcement.status === "sent" 
                        ? t("cannot_schedule_sent") 
                        : t("cannot_schedule_failed")
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Quick Presets */}
              <Card className="p-2 bg-transparent">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("quick_schedule_options")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {timePresets.map((preset) => (
                      <Button
                        key={preset.label}
                        variant={selectedPreset === preset.label ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePresetSelect(preset.label)}
                        className="text-xs"
                      >
                        {t(preset.label)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Date/Time */}
              <Card className="p-2 bg-transparent">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t("custom_schedule_time")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at" className="text-sm font-medium">
                      {t("schedule_date_time")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => {
                        setScheduledDateTime(e.target.value);
                        setSelectedPreset(""); // Clear preset selection
                      }}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("schedule_timezone_note")}
                    </p>
                  </div>

                  {scheduledDateTime && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {t("will_be_sent_at")}: {formatDate(scheduledDateTime, "en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {t("schedule_confirmation_note")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Scheduling Info */}
              <Card className="bg-gray-50 dark:bg-gray-900/50 p-2">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600 dark:text-gray-400">
                    {t("scheduling_information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <Send className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{t("automatic_delivery")}</p>
                      <p>{t("automatic_delivery_desc")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{t("modification_notice")}</p>
                      <p>{t("modification_notice_desc")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={updateStatusMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              {t("cancel")}
            </Button>
            
            {canSchedule && (
              <Button
                onClick={handleSchedule}
                disabled={updateStatusMutation.isPending || !scheduledDateTime}
                className="gap-2"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("scheduling")}
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    {isCurrentlyScheduled ? t("reschedule") : t("schedule_now")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}