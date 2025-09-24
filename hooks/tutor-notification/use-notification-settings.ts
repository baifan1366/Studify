import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  course_updates: boolean;
  community_updates: boolean;
  marketing_emails: boolean;
  classroom_updates?: boolean;
  assignment_reminders?: boolean;
  live_session_alerts?: boolean;
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<{ settings: NotificationSettings }> => {
      const response = await fetch('/api/tutor-notification/settings', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const response = await fetch('/api/tutor-notification/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache with new settings
      queryClient.setQueryData(['notification-settings'], data);
    },
  });
}
