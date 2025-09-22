import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RolePermissions } from '@/interface/admin/role-permissions-interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { adminRoleApi } from '@/lib/api';

export function useRolePermissions() {
  return useQuery<RolePermissions[]>({
    queryKey: ['role-permissions'],
    queryFn: () => {
      return apiGet<RolePermissions[]>(adminRoleApi.listRolePermissions);
    },
  });
}

export function useRolePermissionsById(rolePermissionId?: string) {
  return useQuery<RolePermissions>({
    queryKey: ['role-permissions', rolePermissionId],
    queryFn: () => {
      if (!rolePermissionId) {
        throw new Error('Role Permission ID is required');
      }
      return apiGet<RolePermissions>(adminRoleApi.getRolePermissionsById(rolePermissionId));
    },
    enabled: Boolean(rolePermissionId),
  });
}

export function useCreateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
    }: {
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'POST',
        url: adminRoleApi.createRolePermissions,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
    },
  });
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ rolePermissionId, ...updates }: { rolePermissionId: string } & Partial<Omit<RolePermissions, 'rolePermissionId'>>) =>
      apiSend<RolePermissions>({
        url: adminRoleApi.updateRolePermissions(rolePermissionId),
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: RolePermissions) => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
    },
  });
}

export function useDeleteRolePermissions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (rolePermissionId: string) =>
      apiSend<void>({
        url: adminRoleApi.deleteRolePermissions(rolePermissionId),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
    },
  });
}