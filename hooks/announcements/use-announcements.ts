import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Announcement } from '@/interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { announcementsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UpdateStatusParams {
  announcementId: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduled_at?: string;
}

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => {
      return apiGet<Announcement[]>(announcementsApi.list);
    },
  });
}

export function useAnnouncement(id?: number) {
  return useQuery<Announcement>({
    queryKey: ['announcement', id],
    queryFn: () => {
      if (!id) {
        throw new Error('Announcement ID is required');
      }
      return apiGet<Announcement>(announcementsApi.getById(id));
    },
    enabled: Boolean(id),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
    }: {
      created_by: number;
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'POST',
        url: announcementsApi.create,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: number } & Partial<Omit<Announcement, 'id'>>) =>
      apiSend<Announcement>({
        url: announcementsApi.update(id),
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: Announcement) => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['announcement', data.id] });
    },
  });
}

export function useUpdateAnnouncementStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ announcementId, status, scheduled_at }: UpdateStatusParams) => 
      apiSend<Announcement>({
        url: announcementsApi.updateStatus(announcementId),
        method: 'PATCH',
        body: { status, scheduled_at },
      }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch courses
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({
        title: 'Success',
        description: `Announcement status updated to ${variables.status}`,
      });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update announcement status',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (announcement: Announcement) =>
      apiSend<void>({
        url: announcementsApi.delete(announcement.id),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (announcementId: number) => 
      apiSend<Announcement>({
        url: `/api/announcements/${announcementId}/send`,
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement', data.id] });
      toast({
        title: 'Success',
        description: 'Announcement sent successfully! Notifications have been created for all users.',
      });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send announcement',
        variant: 'destructive',
      });
    },
  });
}
