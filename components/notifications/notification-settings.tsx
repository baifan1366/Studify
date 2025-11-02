'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, BookOpen, Users, Calendar, MessageSquare, Megaphone } from 'lucide-react';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/notifications/use-notification-settings';
import { useOneSignal } from '@/hooks/notifications/use-onesignal';
import { toast } from 'sonner';
import { Smartphone } from 'lucide-react';

interface NotificationSettings {
  email_notifications?: boolean;
  push_notifications?: boolean;
  course_updates?: boolean;
  classroom_updates?: boolean;
  community_updates?: boolean;
  assignment_reminders?: boolean;
  live_session_alerts?: boolean;
  marketing_emails?: boolean;
  daily_digest?: boolean;
  weekly_digest?: boolean;
}

export default function NotificationSettings() {
  const t = useTranslations('NotificationSettings');
  const { data: settingsData, isLoading } = useNotificationSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();
  const { user: oneSignalUser, requestPermission, optIn, optOut } = useOneSignal();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    course_updates: true,
    classroom_updates: true,
    community_updates: false,
    assignment_reminders: true,
    live_session_alerts: true,
    marketing_emails: false,
    daily_digest: true,
    weekly_digest: true,
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  const handleSettingChange = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await updateSettingsMutation.mutateAsync(newSettings);
      toast.success(t('settings_updated') || 'Settings updated successfully');
    } catch (error) {
      toast.error(t('update_failed') || 'Failed to update settings');
      // Revert on error
      setSettings(settings);
    }
  };

  const handlePushPermission = async () => {
    // Check if notifications are supported
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push notifications are not supported in your browser.');
      return;
    }

    // Check if already denied
    if (Notification.permission === 'denied') {
      toast.error('Push notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    if (!oneSignalUser.isSubscribed) {
      try {
        const granted = await requestPermission();
        if (granted) {
          await optIn();
          await handleSettingChange('push_notifications', true);
          toast.success('Push notifications enabled successfully!');
        } else {
          toast.error('You need to allow browser notification access to enable push notifications. Please click Enable again and allow access when prompted.');
        }
      } catch (error) {
        console.error('Error enabling push notifications:', error);
        toast.error('Failed to enable push notifications. Please try again.');
      }
    } else {
      try {
        await optOut();
        await handleSettingChange('push_notifications', false);
        toast.success('Push notifications disabled');
      } catch (error) {
        console.error('Error disabling push notifications:', error);
        toast.error('Failed to disable push notifications. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded">
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-32" />
                <div className="h-3 bg-muted animate-pulse rounded w-48" />
              </div>
              <div className="h-6 w-10 bg-muted animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('title') || 'Notification Settings'}</h2>
        <p className="text-muted-foreground">
          {t('description') || 'Manage how and when you receive notifications'}
        </p>
      </div>

      {/* Push Notifications Status */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t('push_notifications') || 'Push Notifications'}
          </CardTitle>
          <CardDescription>
            {t('push_notifications_desc') || 'Browser push notifications for real-time updates'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Status: {oneSignalUser.isSubscribed ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {oneSignalUser.permission === 'denied' 
                  ? 'Blocked by browser settings'
                  : oneSignalUser.isSubscribed 
                  ? 'You will receive push notifications'
                  : 'Click to enable push notifications'
                }
              </p>
            </div>
            <Button
              onClick={handlePushPermission}
              variant={oneSignalUser.isSubscribed ? 'outline' : 'default'}
              disabled={oneSignalUser.permission === 'denied'}
            >
              {oneSignalUser.isSubscribed ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            General Notifications
          </CardTitle>
          <CardDescription>
            Control your overall notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={settings.email_notifications || false}
              onCheckedChange={(checked) => handleSettingChange('email_notifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications in your browser
              </p>
            </div>
            <Switch
              checked={settings.push_notifications || false}
              onCheckedChange={(checked) => handleSettingChange('push_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content-Specific Settings */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>Content Notifications</CardTitle>
          <CardDescription>
            Choose what types of content updates you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Course Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                New lessons, assignments, and course announcements
              </p>
            </div>
            <Switch
              checked={settings.course_updates || false}
              onCheckedChange={(checked) => handleSettingChange('course_updates', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Classroom Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Live sessions, assignments, and classroom announcements
              </p>
            </div>
            <Switch
              checked={settings.classroom_updates || false}
              onCheckedChange={(checked) => handleSettingChange('classroom_updates', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Community Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                New posts, comments, and community activity
              </p>
            </div>
            <Switch
              checked={settings.community_updates || false}
              onCheckedChange={(checked) => handleSettingChange('community_updates', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Assignment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Reminders for upcoming assignment deadlines
              </p>
            </div>
            <Switch
              checked={settings.assignment_reminders || false}
              onCheckedChange={(checked) => handleSettingChange('assignment_reminders', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Live Session Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Notifications when live sessions are starting
              </p>
            </div>
            <Switch
              checked={settings.live_session_alerts || false}
              onCheckedChange={(checked) => handleSettingChange('live_session_alerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Reports */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Learning Reports
          </CardTitle>
          <CardDescription>
            Receive periodic summaries of your learning progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Daily Digest</Label>
              <p className="text-sm text-muted-foreground">
                Daily summary of your learning activities (sent at 8 PM)
              </p>
            </div>
            <Switch
              checked={settings.daily_digest || false}
              onCheckedChange={(checked) => handleSettingChange('daily_digest', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Report</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summary of your progress and achievements (sent on Sunday at 8 PM)
              </p>
            </div>
            <Switch
              checked={settings.weekly_digest || false}
              onCheckedChange={(checked) => handleSettingChange('weekly_digest', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Marketing */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>Marketing & Updates</CardTitle>
          <CardDescription>
            Optional notifications about new features and promotions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Product updates, new features, and special offers
              </p>
            </div>
            <Switch
              checked={settings.marketing_emails || false}
              onCheckedChange={(checked) => handleSettingChange('marketing_emails', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
