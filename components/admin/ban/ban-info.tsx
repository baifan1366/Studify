"use client";

import React, { useState, useEffect } from "react";
import { Ban } from "@/interface/admin/ban-interface";
import { useUpdateBanStatus } from "@/hooks/ban/use-ban";
import { useFormat } from "@/hooks/use-format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  User,
  Target,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface BanInfoProps {
  ban: Ban | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BanInfo({ ban, isOpen, onClose }: BanInfoProps) {
  const t = useTranslations('BanInfo');
  const { formatDate, formatRelativeTime } = useFormat();
  const updateBanStatus = useUpdateBanStatus();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [durationType, setDurationType] = useState<string>("days");
  const [durationValue, setDurationValue] = useState<string>("7");
  const [customDate, setCustomDate] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && ban) {
      setDurationType("days");
      setDurationValue("7");
      setCustomDate("");
      setAdminNotes("");
    }
  }, [isOpen, ban]);

  const calculateExpiryDate = (): string => {
    const now = new Date();
    
    if (durationType === "custom" && customDate) {
      return new Date(customDate).toISOString();
    }
    
    const value = parseInt(durationValue);
    if (isNaN(value)) return now.toISOString();
    
    switch (durationType) {
      case "hours":
        now.setHours(now.getHours() + value);
        break;
      case "days":
        now.setDate(now.getDate() + value);
        break;
      case "weeks":
        now.setDate(now.getDate() + (value * 7));
        break;
      case "months":
        now.setMonth(now.getMonth() + value);
        break;
      default:
        now.setDate(now.getDate() + value);
    }
    
    return now.toISOString();
  };

  const handleApprove = async () => {
    if (!ban) return;

    setIsProcessing(true);
    try {
      const expires_at = calculateExpiryDate();
      
      await updateBanStatus.mutateAsync({
        banId: ban.public_id,
        status: "approved",
        expires_at,
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to approve ban:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!ban) return;

    setIsProcessing(true);
    try {
      await updateBanStatus.mutateAsync({
        banId: ban.public_id,
        status: "rejected",
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to reject ban:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "destructive";
      case "rejected":
        return "secondary";
      case "pending":
        return "default";
      default:
        return "outline";
    }
  };

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return "📚";
      case "post":
        return "📝";
      case "comment":
        return "💬";
      case "chat":
        return "💭";
      case "user":
        return "👤";
      default:
        return "📋";
    }
  };

  if (!ban) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description', { target_type: ban.target_type, target_id: ban.target_id })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ban Status */}
          <Card className="bg-transparent p-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getTargetTypeIcon(ban.target_type)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {ban.target_type.charAt(0).toUpperCase() + ban.target_type.slice(1)} #{ban.target_id}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('report_id', { public_id: ban.public_id })}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(ban.status)} className="text-sm">
                  {ban.status.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">{t('created')}</span>
                  <span>{formatRelativeTime(ban.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">{t('date')}</span>
                  <span>{formatDate(ban.created_at, { 
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                {ban.expires_at && ban.status === 'approved' && (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-gray-600 dark:text-gray-300">{t('expires')}</span>
                      <span className="text-red-600 dark:text-red-400">
                        {formatDate(ban.expires_at, { 
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="text-gray-600 dark:text-gray-300">{t('time_left')}</span>
                      <span className="text-red-600 dark:text-red-400">
                        {formatRelativeTime(ban.expires_at)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ban Reason */}
          <div>
            <Label className="text-base font-semibold">{t('ban_reason')}</Label>
            <Card className="mt-2 bg-transparent border-gray-200 dark:border-gray-700 p-2">
              <CardContent className="pt-4">
                <p className="whitespace-pre-wrap">
                  {ban.reason}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Section - Only show if status is pending */}
          {ban.status === "pending" && (
            <>
              <Separator />
              
              <div>
                <Label className="text-base font-semibold">{t('administrative_action')}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t('action_description')}
                </p>

                {/* Ban Duration Settings */}
                <div className="space-y-4 p-4 bg-transparent border-gray-200 dark:border-gray-700 rounded-lg">
                  <Label className="text-sm font-medium">{t('ban_duration_title')}</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration-type" className="text-xs">{t('duration_type')}</Label>
                      <Select value={durationType} onValueChange={setDurationType}>
                        <SelectTrigger id="duration-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">{t('duration_hours')}</SelectItem>
                          <SelectItem value="days">{t('duration_days')}</SelectItem>
                          <SelectItem value="weeks">{t('duration_weeks')}</SelectItem>
                          <SelectItem value="months">{t('duration_months')}</SelectItem>
                          <SelectItem value="custom">{t('duration_custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {durationType !== "custom" ? (
                      <div>
                        <Label htmlFor="duration-value" className="text-xs">{t('duration_value')}</Label>
                        <Input
                          id="duration-value"
                          type="number"
                          min="1"
                          value={durationValue}
                          onChange={(e) => setDurationValue(e.target.value)}
                          placeholder={t('enter_duration')}
                        />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="custom-date" className="text-xs">{t('end_date')}</Label>
                        <Input
                          id="custom-date"
                          type="datetime-local"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="text-xs text-white bg-orange-500 p-2 rounded border">
                    <strong>{t('preview_title')}</strong> {t('preview_text')} {" "}
                    {formatDate(calculateExpiryDate(), {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="mt-4">
                  <Label htmlFor="admin-notes" className="text-sm">
                    {t('admin_notes')}
                  </Label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={t('admin_notes_placeholder')}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            {t('close')}
          </Button>
          
          {ban.status === "pending" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t('reject_ban')}
              </Button>
              
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t('approve_ban')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}