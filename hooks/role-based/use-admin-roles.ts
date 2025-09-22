import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminRoles } from '@/interface/admin/admin-roles-interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { adminRoleApi } from '@/lib/api';

export function useAdminRoles() {
  return useQuery<AdminRoles[]>({
    queryKey: ['admin-roles'],
    queryFn: () => {
      return apiGet<AdminRoles[]>(adminRoleApi.listAdminRoles);
    },
  });
}

export function useAdminRolesById(adminId?: string) {
  return useQuery<AdminRoles>({
    queryKey: ['admin-roles', adminId],
    queryFn: () => {
      if (!adminId) {
        throw new Error('Admin ID is required');
      }
      return apiGet<AdminRoles>(adminRoleApi.getAdminRolesByAdminId(adminId));
    },
    enabled: Boolean(adminId),
  });
}

export function useCreateAdminRoles() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; role_permission_id: string }) =>
      apiSend<AdminRoles>({
        url: adminRoleApi.createAdminRoles,
        method: 'POST',
        body: data,
      }),
    onSuccess: (data: AdminRoles) => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
  });
}

export function useUpdateAdminRoles() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ adminId, ...updates }: { adminId: string } & Partial<Omit<AdminRoles, 'adminId'>>) =>
      apiSend<AdminRoles>({
        url: adminRoleApi.updateAdminRoles(adminId),
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: AdminRoles) => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
  });
}

export function useDeleteAdminRoles() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (adminId: string) =>
      apiSend<void>({
        url: adminRoleApi.deleteAdminRoles(adminId),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
  });
}