import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Roles } from '@/interface/admin/roles-interface';
import { apiGet, apiSend } from '@/lib/api-config';
import { adminRoleApi } from '@/lib/api';

export function useRoles() {
  return useQuery<Roles[]>({
    queryKey: ['roles'],
    queryFn: () => {
      return apiGet<Roles[]>(adminRoleApi.listRoles);
    },
  });
}

export function useRolesById(roleId?: string) {
  return useQuery<Roles>({
    queryKey: ['roles', roleId],
    queryFn: () => {
      if (!roleId) {
        throw new Error('Role ID is required');
      }
      return apiGet<Roles>(adminRoleApi.getRolesById(roleId));
    },
    enabled: Boolean(roleId),
  });
}

export function useCreateRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
    }: {
      body: Record<string, any>;
    }) =>
      apiSend({
        method: 'POST',
        url: adminRoleApi.createRoles,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRoles() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, ...updates }: { roleId: string } & Partial<Omit<Roles, 'roleId'>>) =>
      apiSend<Roles>({
        url: adminRoleApi.updateRoles(roleId),
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (data: Roles) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useDeleteRoles() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) =>
      apiSend<void>({
        url: adminRoleApi.deleteRoles(roleId),
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}