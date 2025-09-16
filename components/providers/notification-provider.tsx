'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useOneSignalSync } from '@/lib/notifications/notification-helpers';
import { setupNotification } from '@/utils/notification/notifications-setup';

interface NotificationContextType {
  isOneSignalSynced: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  isOneSignalSynced: false,
});

export function useNotificationContext() {
  return useContext(NotificationContext);
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isOneSignalSynced } = useOneSignalSync();

  useEffect(() => {
    // Initialize OneSignal when the provider mounts
    setupNotification();
  }, []);

  return (
    <NotificationContext.Provider value={{ isOneSignalSynced }}>
      {children}
    </NotificationContext.Provider>
  );
}
