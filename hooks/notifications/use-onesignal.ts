import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export interface OneSignalUser {
  playerId?: string;
  externalUserId?: string;
  isSubscribed: boolean;
  isPushSupported: boolean;
  permission: 'default' | 'granted' | 'denied';
}

export function useOneSignal() {
  const [user, setUser] = useState<OneSignalUser>({
    isSubscribed: false,
    isPushSupported: false,
    permission: 'default',
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission as NotificationPermission
      : 'default'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use OneSignalDeferred for proper initialization
    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
    (window as any).OneSignalDeferred.push(function(OneSignal: any) {
      OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
      }).then(() => {
        setIsInitialized(true);
        updateUserState();
        setupEventListeners();
      });
    });

    // Load OneSignal SDK if not already loaded
    if (!(window as any).OneSignal) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const updateUserState = async () => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;
      const permission = OneSignal.Notifications.permission;
      const isPushSupported = OneSignal.Notifications.isPushSupported();
      const pushSubscription = OneSignal.User.PushSubscription;
      
      // Get the actual subscription state
      const isSubscribed = pushSubscription?.optedIn || false;
      const permissionState = permission ? 'granted' : (Notification.permission === 'denied' ? 'denied' : 'default');
      
      setUser({
        playerId: pushSubscription?.id || undefined,
        externalUserId: OneSignal.User.externalId || undefined,
        isSubscribed,
        isPushSupported,
        permission: permissionState,
      });
      
      console.log('OneSignal state updated:', { isSubscribed, permission: permissionState });
    } catch (error) {
      console.error('Failed to update OneSignal user state:', error);
    }
  };

  const setupEventListeners = () => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;

      // Listen for permission changes
      OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
        updateUserState();
      });

      // Listen for subscription changes
      OneSignal.User.PushSubscription.addEventListener('change', () => {
        updateUserState();
      });

      // Listen for notification clicks
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        if (event.notification.url) {
          window.location.href = event.notification.url;
        }
      });
    } catch (error) {
      console.error('Failed to setup OneSignal event listeners:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    try {
      // First, request native browser permission
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return false;
        }
      }

      // Then handle OneSignal subscription
      if ((window as any).OneSignal) {
        const OneSignal = (window as any).OneSignal;
        await OneSignal.Slidedown.promptPush();
        await updateUserState();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  const setExternalUserId = async (userId: string): Promise<void> => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;
      await OneSignal.login(userId);
      await updateUserState();
    } catch (error) {
      console.error('Failed to set external user ID:', error);
    }
  };

  const removeExternalUserId = async (): Promise<void> => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;
      await OneSignal.logout();
      await updateUserState();
    } catch (error) {
      console.error('Failed to remove external user ID:', error);
    }
  };

  const setTags = async (tags: Record<string, string>): Promise<void> => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;
      await OneSignal.User.addTags(tags);
    } catch (error) {
      console.error('Failed to set OneSignal tags:', error);
    }
  };

  const removeTags = async (tagKeys: string[]): Promise<void> => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;
      await OneSignal.User.removeTags(tagKeys);
    } catch (error) {
      console.error('Failed to remove OneSignal tags:', error);
    }
  };

  const optIn = async (): Promise<void> => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;
      await OneSignal.User.PushSubscription.optIn();
      await updateUserState();
    } catch (error) {
      console.error('Failed to opt in to notifications:', error);
    }
  };

  const optOut = async (): Promise<void> => {
    if (typeof window === 'undefined' || !(window as any).OneSignal) return;

    try {
      const OneSignal = (window as any).OneSignal;
      await OneSignal.User.PushSubscription.optOut();
      await updateUserState();
    } catch (error) {
      console.error('Failed to opt out of notifications:', error);
    }
  };

  return {
    user,
    isInitialized,
    requestPermission,
    setExternalUserId,
    removeExternalUserId,
    setTags,
    removeTags,
    optIn,
    optOut,
    updateUserState,
  };
}
