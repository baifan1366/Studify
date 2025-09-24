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

// Simplified hook to get admin roles for display (using existing API)
export function useAdminRolesWithDetails(adminId?: string) {
  const { data: adminRoles, isLoading: adminRolesLoading } = useAdminRoles();
  const { data: allRolePermissions, isLoading: rolePermissionsLoading } = useQuery<any[]>({
    queryKey: ['role-permissions'],
    queryFn: () => apiGet<any[]>('/api/role_permissions'),
  });
  const { data: allRoles, isLoading: rolesLoading } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: () => apiGet<any[]>('/api/roles'),
  });
  const { data: allPermissions, isLoading: permissionsLoading } = useQuery<any[]>({
    queryKey: ['permissions'],
    queryFn: () => apiGet<any[]>('/api/permissions'),
  });

  const isLoading = adminRolesLoading || rolePermissionsLoading || rolesLoading || permissionsLoading;

  const result = useQuery<AdminRolesWithDetails[]>({
    queryKey: ['admin-roles-details', adminId],
    queryFn: () => {
      if (!adminId || !adminRoles || !allRolePermissions || !allRoles || !allPermissions) {
        return [];
      }
      
      // Filter admin roles for the specific user
      const userAdminRoles = adminRoles.filter(role => role.user_id === adminId && !role.is_deleted);
      
      // Enhance with role and permission details
      return userAdminRoles.map((adminRole) => {
        const rolePermission = allRolePermissions.find(rp => rp.public_id === adminRole.role_permission_id);
        const role = rolePermission ? allRoles.find(r => r.public_id === rolePermission.role_id) : null;
        const permission = rolePermission ? allPermissions.find(p => p.public_id === rolePermission.permission_id) : null;
        
        return {
          ...adminRole,
          rolePermissionDetails: rolePermission ? {
            id: rolePermission.id,
            public_id: rolePermission.public_id,
            role_id: rolePermission.role_id,
            permission_id: rolePermission.permission_id,
            role: role ? {
              id: role.id,
              public_id: role.public_id,
              title: role.title,
            } : null,
            permission: permission ? {
              id: permission.id,
              public_id: permission.public_id,
              title: permission.title,
            } : null,
          } : undefined,
        };
      });
    },
    enabled: Boolean(adminId && adminRoles && allRolePermissions && allRoles && allPermissions),
  });

  return {
    ...result,
    isLoading: isLoading || result.isLoading,
  };
}

// Interface for enhanced admin roles data
export interface AdminRolesWithDetails extends AdminRoles {
  rolePermissionDetails?: RolePermissionWithDetails;
}

export interface RolePermissionWithDetails {
  id: number;
  public_id: string;
  role_id: string;
  permission_id: string;
  role: {
    id: number;
    public_id: string;
    title: string;
  } | null;
  permission: {
    id: number;
    public_id: string;
    title: string;
  } | null;
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