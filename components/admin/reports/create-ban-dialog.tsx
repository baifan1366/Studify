"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  AlertTriangle, 
  Ban, 
  Calendar, 
  Clock, 
  FileText, 
  MessageSquare, 
  BookOpen,
  User,
  Check,
  X
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

import { 
  useCreateContentBan,
  ContentItem 
} from "@/hooks/admin/use-admin-content-reports";
import { useFormat } from "@/hooks/use-format";

interface CreateBanDialogProps {
  content?: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateBanDialog({
  content,
  isOpen,
  onClose,
  onSuccess
}: CreateBanDialogProps) {
  const t = useTranslations('CreateBanDialog');
  const { formatRelativeTime } = useFormat();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    duration_type: 'permanent' as 'hours' | 'days' | 'weeks' | 'months' | 'custom' | 'permanent',
    duration_value: 1,
    custom_date: '',
    target_type: 'content' as 'content' | 'user'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createBanMutation = useCreateContentBan();

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'post':
        return <FileText className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'post':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'comment':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'critical':
        return 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const calculateExpiryDate = () => {
    if (formData.duration_type === 'permanent') {
      return null;
    }

    if (formData.duration_type === 'custom') {
      return formData.custom_date ? new Date(formData.custom_date) : null;
    }

    const now = new Date();
    const value = formData.duration_value;

    switch (formData.duration_type) {
      case 'hours':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'days':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'weeks':
        return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      case 'months':
        const result = new Date(now);
        result.setMonth(result.getMonth() + value);
        return result;
      default:
        return null;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.reason.trim()) {
      newErrors.reason = t('reason_required');
    }

    if (formData.duration_type === 'custom' && !formData.custom_date) {
      newErrors.custom_date = t('custom_date_required');
    }

    if (formData.duration_type !== 'permanent' && formData.duration_type !== 'custom' && formData.duration_value < 1) {
      newErrors.duration_value = t('duration_value_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!content || !validateForm()) return;

    const expiryDate = calculateExpiryDate();
    const targetType = formData.target_type === 'user' 
      ? 'user' 
      : content.type as 'course' | 'post' | 'comment';
    
    const targetId = formData.target_type === 'user' 
      ? (content.author_id || content.user_id) 
      : content.id;

    try {
      await createBanMutation.mutateAsync({
        target_type: targetType,
        target_id: targetId!,
        reason: formData.reason,
        description: formData.description || undefined,
        severity: formData.severity,
        expires_at: expiryDate?.toISOString() || undefined,
      });

      toast({
        title: t('ban_created_success'),
        description: t('ban_created_success_message'),
      });

      onSuccess?.();
      onClose();
      
      // Reset form
      setFormData({
        reason: '',
        description: '',
        severity: 'medium',
        duration_type: 'permanent',
        duration_value: 1,
        custom_date: '',
        target_type: 'content'
      });
      setErrors({});
    } catch (error: any) {
      toast({
        title: t('ban_creation_failed'),
        description: error?.message || t('ban_creation_failed_message'),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    onClose();
    setErrors({});
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!content) return null;

  const expiryDate = calculateExpiryDate();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-600" />
            {t('create_ban_request')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Preview */}
          <Card className="bg-transparent p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('target_content')}
            </h4>
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={content.author_profile?.avatar_url} />
                <AvatarFallback>
                  {content.author_profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className={getContentTypeColor(content.type)}>
                    {getContentIcon(content.type)}
                    <span className="ml-1">{t(content.type)}</span>
                  </Badge>
                  
                  {content.report_count && content.report_count > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {content.report_count} {t('reports')}
                    </Badge>
                  )}
                </div>

                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {content.title || truncateText(content.content || content.body || '')}
                </h5>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('by')} {content.author_profile?.full_name || t('unknown_user')} • 
                  {formatRelativeTime(content.created_at)}
                </p>
              </div>
            </div>
          </Card>

          {/* Ban Target Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('ban_target')}</Label>
            <RadioGroup
              value={formData.target_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_type: value as 'content' | 'user' }))}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="content" id="target-content" />
                <Label htmlFor="target-content" className="cursor-pointer">
                  {t('ban_content_only')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="target-user" />
                <Label htmlFor="target-user" className="cursor-pointer">
                  {t('ban_user_account')}
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {formData.target_type === 'content' 
                ? t('ban_content_description') 
                : t('ban_user_description')
              }
            </p>
          </div>

          {/* Ban Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold">
              {t('ban_reason')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder={t('reason_placeholder')}
              className={errors.reason ? 'border-red-500' : ''}
            />
            {errors.reason && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.reason}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              {t('additional_details')}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('description_placeholder')}
              rows={3}
            />
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('severity_level')}</Label>
            <Select
              value={formData.severity}
              onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    {t('severity_low')}
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    {t('severity_medium')}
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    {t('severity_high')}
                  </div>
                </SelectItem>
                <SelectItem value="critical">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-700 rounded-full"></div>
                    {t('severity_critical')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('ban_duration')}</Label>
            
            <Select
              value={formData.duration_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, duration_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">{t('hours')}</SelectItem>
                <SelectItem value="days">{t('days')}</SelectItem>
                <SelectItem value="weeks">{t('weeks')}</SelectItem>
                <SelectItem value="months">{t('months')}</SelectItem>
                <SelectItem value="custom">{t('custom_date')}</SelectItem>
                <SelectItem value="permanent">{t('permanent')}</SelectItem>
              </SelectContent>
            </Select>

            {formData.duration_type !== 'permanent' && formData.duration_type !== 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={formData.duration_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_value: parseInt(e.target.value) || 1 }))}
                  className={`w-20 ${errors.duration_value ? 'border-red-500' : ''}`}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t(formData.duration_type)}
                </span>
                {errors.duration_value && (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.duration_value}</p>
                )}
              </div>
            )}

            {formData.duration_type === 'custom' && (
              <div>
                <Input
                  type="datetime-local"
                  value={formData.custom_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_date: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  className={errors.custom_date ? 'border-red-500' : ''}
                />
                {errors.custom_date && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.custom_date}</p>
                )}
              </div>
            )}

            {/* Expiry Preview */}
            {formData.duration_type !== 'permanent' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {expiryDate 
                      ? t('expires_at', { date: formatRelativeTime(expiryDate.toISOString()) })
                      : t('invalid_date')
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <Card className="bg-transparent p-4 border-l-4 border-l-red-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('ban_summary')}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">{t('target')}:</span>
                <Badge variant="secondary" className={getContentTypeColor(content.type)}>
                  {formData.target_type === 'user' ? t('user_account') : t(content.type)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">{t('severity')}:</span>
                <Badge variant="secondary" className={getSeverityColor(formData.severity)}>
                  {t(`severity_${formData.severity}`)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">{t('duration')}:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formData.duration_type === 'permanent' 
                    ? t('permanent')
                    : expiryDate 
                      ? formatRelativeTime(expiryDate.toISOString())
                      : t('invalid_date')
                  }
                </span>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createBanMutation.isPending}
          >
            <X className="w-4 h-4 mr-2" />
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createBanMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {createBanMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('creating')}
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-2" />
                {t('create_ban')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
