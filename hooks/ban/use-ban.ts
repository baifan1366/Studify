import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban } from '@/interface/admin/ban-interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { banApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UpdateStatusParams {
  banId: string;
  status: 'approved' | 'pending' | 'rejected';
  expires_at?: string;
}

export function useBan() {
  return useQuery<Ban[]>({
    queryKey: ['ban'],
    queryFn: () => {
      return apiGet<Ban[]>(banApi.list);
    },
  });
}

export function useBanById(banId?: string) {
  return useQuery<Ban>({
    queryKey: ['ban', banId],
    queryFn: () => {
      if (!banId) {
        throw new Error('Ban ID is required');
      }
      return apiGet<Ban>(banApi.getById(banId));
    },
    enabled: Boolean(banId),
  });
}

export function useBanByTarget(targetType: string, targetId?: number) {
  return useQuery<Ban[]>({
    queryKey: ['ban', 'target', targetType, targetId],
    queryFn: () => {
      if (!targetId) {
        throw new Error('Target ID is required');
      }
      return apiGet<Ban[]>(banApi.getByTarget(targetType, targetId));
    },
    enabled: Boolean(targetId && targetType),
  });
}

export function useCreateBan() {
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
        url: banApi.create,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ban'] });
    },
  });
}

export function useUpdateBan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ banId, ...updates }: { banId: string } & Partial<Omit<Ban, 'banId'>>) =>
      apiSend<Ban>({
        url: banApi.update(banId),
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: Ban) => {
      qc.invalidateQueries({ queryKey: ['ban'] });
    },
  });
}

export function useUpdateBanStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ banId, status, expires_at }: UpdateStatusParams) => {
      // First update the ban status
      const banResult = await apiSend<Ban>({
        url: banApi.status(banId),
        method: 'PATCH',
        body: { status, expires_at },
      });

      // If ban is approved and target_type is "course", update the course status to "ban"
      if (status === 'approved' && banResult.target_type === 'course' && banResult.target_id) {
        try {
          await apiSend({
            url: `/api/admin/courses/${banResult.target_id}/status`,
            method: 'PATCH',
            body: { status: 'ban' },
          });
        } catch (courseError) {
          console.warn('Failed to update course status:', courseError);
          // Don't fail the whole operation if course update fails
        }
      }

      return banResult;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch bans and courses
      queryClient.invalidateQueries({ queryKey: ['ban'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      
      toast({
        title: 'Success',
        description: `Ban status updated to ${variables.status}${
          variables.status === 'approved' && data.target_type === 'course' 
            ? '. Course has been banned.' 
            : ''
        }`,
      });
    },
    onError: (error: Error) => {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ban status',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteBan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (banId: string) =>
      apiSend<void>({
        url: banApi.delete(banId),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ban'] });
    },
  });
}