"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ban, Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  useAdminUserProfile,
  useCreateUserBan,
  useUpdateUserStatus,
} from "@/hooks/admin/use-admin-user-data";
import { useFormat } from "@/hooks/use-format";

interface BanUserDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BanDurationType = 'hours' | 'days' | 'weeks' | 'months' | 'custom' | 'permanent';

export function BanUserDialog({ userId, open, onOpenChange }: BanUserDialogProps) {
  const t = useTranslations('BanUserDialog');
  const { toast } = useToast()
  const { formatRelativeTime } = useFormat();

  // Form states
  const [banReason, setBanReason] = useState("");
  const [durationType, setDurationType] = useState<BanDurationType>('days');
  const [durationValue, setDurationValue] = useState(7);
  const [customDate, setCustomDate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Validation states
  const [errors, setErrors] = useState<{
    reason?: string;
    duration?: string;
    customDate?: string;
  }>({});

  // Fetch user data
  const { data: profile, isLoading: profileLoading } = useAdminUserProfile(userId);
  
  // Mutations
  const createBanMutation = useCreateUserBan();
  const updateStatusMutation = useUpdateUserStatus();

  // Calculate expiry date
  const calculateExpiryDate = (): string | null => {
    if (durationType === 'permanent') return null;
    
    if (durationType === 'custom') {
      return customDate || null;
    }
    
    const now = new Date();
    const multipliers = {
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,
    };
    
    const expiryTime = now.getTime() + (durationValue * multipliers[durationType as keyof typeof multipliers]);
    return new Date(expiryTime).toISOString();
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!banReason.trim()) {
      newErrors.reason = t('validation_reason_required');
    } else if (banReason.trim().length < 10) {
      newErrors.reason = t('validation_reason_min_length');
    }
    
    if (durationType === 'custom' && !customDate) {
      newErrors.customDate = t('validation_custom_date_required');
    } else if (durationType === 'custom' && new Date(customDate) <= new Date()) {
      newErrors.customDate = t('validation_custom_date_future');
    }
    
    if (durationType !== 'custom' && durationType !== 'permanent' && (!durationValue || durationValue <= 0)) {
      newErrors.duration = t('validation_duration_positive');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle ban user
  const handleBanUser = async () => {
    if (!validateForm()) return;
    
    const expiresAt = calculateExpiryDate();
    
    try {
      // First, create the ban record
      const banResult = await createBanMutation.mutateAsync({
        userId,
        reason: banReason.trim(),
        targetType: 'user',
        targetId: userId,
        expiresAt: expiresAt || undefined,
        description: adminNotes.trim() || undefined,
      });

      // Then, update user status to banned
      await updateStatusMutation.mutateAsync({
        userId,
        status: 'banned',
        reason: banReason.trim(),
      });

      toast({
        title: t('ban_success_title'),
        description: t('ban_success_description', { 
          name: profile?.full_name || profile?.email || t('user'),
          type: durationType === 'permanent' ? t('permanent') : t('temporary')
        }),
      });

      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Ban user error:', error);
      toast({
        title: t('ban_error_title'),
        description: t('ban_error_description'),
        variant: "destructive",
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setBanReason("");
    setDurationType('days');
    setDurationValue(7);
    setCustomDate("");
    setAdminNotes("");
    setErrors({});
    setShowConfirmDialog(false);
  };

  // Handle dialog close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Handle confirm ban
  const handleConfirmBan = () => {
    if (validateForm()) {
      setShowConfirmDialog(true);
    }
  };

  if (!open) return null;

  const expiryDate = calculateExpiryDate();

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Ban className="h-5 w-5" />
              {t('title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            {profileLoading ? (
              <Card className="bg-transparent p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </Card>
            ) : profile ? (
              <Card className="bg-transparent p-4 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback>
                      {profile.full_name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {profile.full_name || t('no_name')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={profile.role === 'admin' ? 'destructive' : 'secondary'}>
                        {t(`role_${profile.role}`)}
                      </Badge>
                      <Badge variant={profile.status === 'banned' ? 'destructive' : 'default'}>
                        {t(`status_${profile.status}`)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {profile.status === 'banned' && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{t('already_banned')}</span>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {t('already_banned_description')}
                    </p>
                  </div>
                )}
              </Card>
            ) : null}

            {/* Ban Form */}
            {profile?.status !== 'banned' && (
              <div className="space-y-4">
                {/* Ban Reason */}
                <div className="space-y-2">
                  <Label htmlFor="banReason" className="text-sm font-medium">
                    {t('ban_reason_label')} <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="banReason"
                    placeholder={t('ban_reason_placeholder')}
                    value={banReason}
                    onChange={(e) => {
                      setBanReason(e.target.value);
                      if (errors.reason) {
                        setErrors({ ...errors, reason: undefined });
                      }
                    }}
                    className={errors.reason ? "border-red-500 focus:border-red-500" : ""}
                    rows={3}
                  />
                  {errors.reason && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
                  )}
                </div>

                {/* Ban Duration */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('ban_duration_label')}</Label>
                  
                  <Select 
                    value={durationType} 
                    onValueChange={(value: BanDurationType) => {
                      setDurationType(value);
                      if (errors.duration) {
                        setErrors({ ...errors, duration: undefined });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_duration_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">{t('duration_hours')}</SelectItem>
                      <SelectItem value="days">{t('duration_days')}</SelectItem>
                      <SelectItem value="weeks">{t('duration_weeks')}</SelectItem>
                      <SelectItem value="months">{t('duration_months')}</SelectItem>
                      <SelectItem value="custom">{t('duration_custom')}</SelectItem>
                      <SelectItem value="permanent">{t('duration_permanent')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Duration Value Input */}
                  {durationType !== 'custom' && durationType !== 'permanent' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={durationValue}
                        onChange={(e) => {
                          setDurationValue(parseInt(e.target.value) || 0);
                          if (errors.duration) {
                            setErrors({ ...errors, duration: undefined });
                          }
                        }}
                        className={`w-24 ${errors.duration ? "border-red-500 focus:border-red-500" : ""}`}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t(`duration_unit_${durationType}`)}
                      </span>
                    </div>
                  )}

                  {/* Custom Date Input */}
                  {durationType === 'custom' && (
                    <div className="space-y-1">
                      <Input
                        type="datetime-local"
                        value={customDate}
                        onChange={(e) => {
                          setCustomDate(e.target.value);
                          if (errors.customDate) {
                            setErrors({ ...errors, customDate: undefined });
                          }
                        }}
                        className={errors.customDate ? "border-red-500 focus:border-red-500" : ""}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      {errors.customDate && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.customDate}</p>
                      )}
                    </div>
                  )}

                  {errors.duration && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.duration}</p>
                  )}
                </div>

                {/* Expiry Preview */}
                {expiryDate ? (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-3">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('ban_expires_on')}</span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {formatRelativeTime(expiryDate)}
                    </p>
                  </Card>
                ) : (
                  <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-3">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('permanent_ban_warning')}</span>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {t('permanent_ban_description')}
                    </p>
                  </Card>
                )}

                <Separator />

                {/* Admin Notes */}
                <div className="space-y-2">
                  <Label htmlFor="adminNotes" className="text-sm font-medium">
                    {t('admin_notes_label')} 
                    <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                      ({t('optional')})
                    </span>
                  </Label>
                  <Textarea
                    id="adminNotes"
                    placeholder={t('admin_notes_placeholder')}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={handleClose} disabled={createBanMutation.isPending || updateStatusMutation.isPending}>
              {t('cancel')}
            </Button>
            {profile?.status !== 'banned' && (
              <Button 
                variant="destructive" 
                onClick={handleConfirmBan}
                disabled={createBanMutation.isPending || updateStatusMutation.isPending}
              >
                {(createBanMutation.isPending || updateStatusMutation.isPending) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('banning_user')}
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    {t('ban_user')}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {t('confirm_ban_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_ban_description', { 
                name: profile?.full_name || profile?.email || t('user'),
                duration: durationType === 'permanent' ? t('permanently') : 
                         durationType === 'custom' ? t('until_custom_date', { date: formatRelativeTime(expiryDate!) }) :
                         t('for_duration', { value: durationValue, unit: t(`duration_unit_${durationType}`) })
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={createBanMutation.isPending || updateStatusMutation.isPending}
            >
              {(createBanMutation.isPending || updateStatusMutation.isPending) ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('banning_user')}
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  {t('confirm_ban')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
