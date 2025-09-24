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
  const { data: adminRoles, isLoading: adminRolesLoading, error: adminRolesError } = useAdminRoles();
  const { data: allRolePermissions, isLoading: rolePermissionsLoading, error: rolePermissionsError } = useQuery<any[]>({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      console.log('🔍 [useAdminRolesWithDetails] Fetching role-permissions from:', adminRoleApi.listRolePermissions);
      const data = await apiGet<any[]>(adminRoleApi.listRolePermissions);
      console.log('✅ [useAdminRolesWithDetails] Role-permissions data:', data);
      return data;
    },
  });
  const { data: allRoles, isLoading: rolesLoading, error: rolesError } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      console.log('🔍 [useAdminRolesWithDetails] Fetching roles from:', adminRoleApi.listRoles);
      const data = await apiGet<any[]>(adminRoleApi.listRoles);
      console.log('✅ [useAdminRolesWithDetails] Roles data:', data);
      return data;
    },
  });
  const { data: allPermissions, isLoading: permissionsLoading, error: permissionsError } = useQuery<any[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      console.log('🔍 [useAdminRolesWithDetails] Fetching permissions from:', adminRoleApi.listPermissions);
      const data = await apiGet<any[]>(adminRoleApi.listPermissions);
      console.log('✅ [useAdminRolesWithDetails] Permissions data:', data);
      return data;
    },
  });

  const isLoading = adminRolesLoading || rolePermissionsLoading || rolesLoading || permissionsLoading;

  const result = useQuery<AdminRolesWithDetails[]>({
    queryKey: ['admin-roles-details', adminId],
    queryFn: () => {
      console.log('🔍 [useAdminRolesWithDetails] Processing data:', {
        adminId,
        hasAdminRoles: !!adminRoles,
        adminRolesCount: adminRoles?.length || 0,
        hasRolePermissions: !!allRolePermissions,
        rolePermissionsCount: allRolePermissions?.length || 0,
        hasRoles: !!allRoles,
        rolesCount: allRoles?.length || 0,
        hasPermissions: !!allPermissions,
        permissionsCount: allPermissions?.length || 0
      });

      if (!adminId || !adminRoles || !allRolePermissions || !allRoles || !allPermissions) {
        console.log('⚠️ [useAdminRolesWithDetails] Missing required data, returning empty array');
        return [];
      }
      
      // Filter admin roles for the specific user
      const userAdminRoles = adminRoles.filter(role => role.user_id === adminId && !role.is_deleted);
      console.log('🔍 [useAdminRolesWithDetails] User admin roles:', userAdminRoles);
      
      // Enhance with role and permission details
      return userAdminRoles.map((adminRole) => {
        // Fix ID matching: adminRole.role_permission_id is numeric, should match rp.id (not rp.public_id)
        const rolePermission = allRolePermissions.find(rp => rp.id === adminRole.role_permission_id);
        // Fix ID matching: rolePermission.role_id and permission_id are UUIDs, should match public_id
        const role = rolePermission ? allRoles.find(r => r.public_id === rolePermission.role_id) : null;
        const permission = rolePermission ? allPermissions.find(p => p.public_id === rolePermission.permission_id) : null;
        
        console.log('🔗 [useAdminRolesWithDetails] Mapping admin role:', {
          adminRoleId: adminRole.id,
          rolePermissionId: adminRole.role_permission_id,
          foundRolePermission: !!rolePermission,
          rolePermissionDetails: rolePermission ? { id: rolePermission.id, role_id: rolePermission.role_id, permission_id: rolePermission.permission_id } : null,
          foundRole: !!role,
          roleTitle: role?.title,
          foundPermission: !!permission,
          permissionTitle: permission?.title
        });
        
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

  // Log any errors
  console.log('🔍 [useAdminRolesWithDetails] Errors:', {
    adminRolesError,
    rolePermissionsError,
    rolesError,
    permissionsError,
    resultError: result.error
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