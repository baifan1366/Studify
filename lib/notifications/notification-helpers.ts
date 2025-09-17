// Helper functions for OneSignal user management and notification setup
import { useOneSignal } from '@/hooks/notifications/use-onesignal';
import { useUser } from '@/hooks/profile/use-user';
import { useEffect } from 'react';

/**
 * React component hook to automatically sync OneSignal user ID with profile
 */
export function useOneSignalSync() {
  const { user: oneSignalUser, setExternalUserId, setTags, isInitialized } = useOneSignal();
  const { data: userData } = useUser();

  useEffect(() => {
    if (!isInitialized || !userData?.profile) return;

    const syncUserData = async () => {
      try {
        // Set external user ID to profile public_id for targeting
        if (userData.profile) {
          const publicId = (userData.profile as any).public_id || userData.profile.id;
          await setExternalUserId(publicId);
          await setTags({ user_id: publicId });
        }

        // Set user tags for segmentation
        if (userData.profile) {
          await setTags({ role: userData.profile.role || 'student' });
        }

        // Add optional tags
        if (userData.profile) {
          const language = (userData.profile as any).language || 'en';
          await setTags({ 
            language,
            display_name: userData.profile.display_name || userData.email || 'User'
          });
        }
      } catch (error) {
        console.error('Failed to sync OneSignal user data:', error);
      }
    };

    syncUserData();
  }, [isInitialized, userData, setExternalUserId, setTags]);

  return {
    isOneSignalSynced: oneSignalUser.externalUserId === ((userData?.profile as any)?.public_id || userData?.profile?.id),
    oneSignalUser,
  };
}

/**
 * Server-side helper to get user notification preferences
 */
export async function getUserNotificationPreferences(userId: number) {
  try {
    const response = await fetch('/api/notifications/settings', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch notification preferences');
    }
    
    const { settings } = await response.json();
    return settings;
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    return {
      email_notifications: true,
      push_notifications: true,
      course_updates: true,
      community_updates: false,
      marketing_emails: false,
    };
  }
}

/**
 * Client-side notification permission helper
 */
export function useNotificationPermission() {
  const { user: oneSignalUser, requestPermission, optIn, optOut } = useOneSignal();

  const handleEnableNotifications = async () => {
    try {
      if (oneSignalUser.permission === 'denied') {
        throw new Error('Notifications are blocked. Please enable them in your browser settings.');
      }

      if (!oneSignalUser.isSubscribed) {
        const granted = await requestPermission();
        if (granted) {
          await optIn();
          return true;
        } else {
          throw new Error('Notification permission denied');
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      throw error;
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await optOut();
      return true;
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      throw error;
    }
  };

  return {
    isSubscribed: oneSignalUser.isSubscribed,
    permission: oneSignalUser.permission,
    enableNotifications: handleEnableNotifications,
    disableNotifications: handleDisableNotifications,
  };
}
