// hooks/admin/use-admin-users.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { AdminUser, AdminUserDetails, AdminUsersResponse, AdminUserFilters } from '@/interface/admin/admin-interface';

// Get paginated users list
export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => adminApi.getUsers(filters),
  });
}

// Get specific user details
export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminApi.getUser(userId),
    enabled: !!userId,
  });
}

// Promote user to admin
export function usePromoteToAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id?: string; email?: string }) => 
      adminApi.promoteToAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}

// Update user (role, status, ban)
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { 
      userId: string; 
      updates: {
        role?: string;
        status?: string;
        banned_reason?: string;
        ban_expires_at?: string;
      }
    }) => adminApi.updateUser(userId, updates),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}

// Delete user (soft delete)
export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}

// Bulk update user roles
export function useBulkUpdateRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { 
      userIds: string[]; 
      newRole: string; 
      reason?: string 
    }) => adminApi.bulkUpdateRoles(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}
