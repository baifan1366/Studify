import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// API endpoints for notifications
const notificationsApi = {
  getNotifications: (page: number, limit: number, unreadOnly: boolean) => 
    `/api/notifications?page=${page}&limit=${limit}&unread_only=${unreadOnly}`,
  getCount: () => '/api/notifications/count',
  markAsRead: (id: string) => `/api/notifications/${id}`,
  deleteNotification: (id: string) => `/api/notifications/${id}`,
  markAllAsRead: () => '/api/notifications/mark-all-read',
  createNotification: () => '/api/notifications'
};

export interface Notification {
  id: number;
  public_id: string;
  user_id: number;
  kind: string;
  payload: Record<string, any>;
  is_read: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

export function useNotifications(
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false
) {
  return useQuery({
    queryKey: ['notifications', page, limit, unreadOnly],
    queryFn: async (): Promise<NotificationsResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        unread_only: unreadOnly.toString(),
      });

      const response = await fetch(`/api/notifications?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async (): Promise<{ count: number }> => {
      const response = await fetch(notificationsApi.getCount(), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification count');
      }

      return response.json();
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ is_read: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch notifications and count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(notificationsApi.markAllAsRead(), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch notifications and count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch notifications and count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      user_ids: number[];
      kind: string;
      payload?: Record<string, any>;
      title: string;
      message: string;
      deep_link?: string;
      image_url?: string;
      scheduled_at?: string;
      send_push?: boolean;
    }) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
