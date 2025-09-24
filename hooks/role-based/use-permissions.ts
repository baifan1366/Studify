import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Permissions } from '@/interface/admin/permissions-interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { adminRoleApi } from '@/lib/api';

export function usePermissions() {
  return useQuery<Permissions[]>({
    queryKey: ['permissions'],
    queryFn: () => {
      return apiGet<Permissions[]>(adminRoleApi.listPermissions);
    },
  });
}

export function usePermissionsById(permissionId?: string) {
  return useQuery<Permissions>({
    queryKey: ['permissions', permissionId],
    queryFn: () => {
      if (!permissionId) {
        throw new Error('Permission ID is required');
      }
      return apiGet<Permissions>(adminRoleApi.getPermissionsById(permissionId));
    },
    enabled: Boolean(permissionId),
  });
}

export function useCreatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
    }: {
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'POST',
        url: adminRoleApi.createPermissions,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useUpdatePermissions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ permissionId, ...updates }: { permissionId: string } & Partial<Omit<Permissions, 'permissionId'>>) =>
      apiSend<Permissions>({
        url: adminRoleApi.updatePermissions(permissionId),
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: Permissions) => {
      qc.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useDeletePermissions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (permissionId: string) =>
      apiSend<void>({
        url: adminRoleApi.deletePermissions(permissionId),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}