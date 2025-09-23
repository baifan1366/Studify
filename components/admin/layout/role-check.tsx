'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shield, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminRoles } from '@/hooks/role-based/use-admin-roles';
import { useRolePermissions } from '@/hooks/role-based/use-role-permissions';
import { useRoles } from '@/hooks/role-based/use-roles';
import { usePermissions } from '@/hooks/role-based/use-permissions';
import { useUser } from '@/hooks/profile/use-user';

// Utility function to safely convert user ID to number (handles both UUID and numeric)
const toNumericId = (id: string | number): number => {
  if (typeof id === 'number') return id;
  
  // Try parsing as number first
  const numId = parseInt(id, 10);
  if (!isNaN(numId)) return numId;
  
  // If it's a UUID, we need to handle it differently
  // For now, log the issue and return -1 to indicate UUID needs mapping
  console.warn(`[toNumericId] UUID detected, needs profile mapping: ${id}`);
  return -1;
};

// Helper function to get user permissions (handles both UUID and numeric user IDs)
const getUserPermissions = (
  userId: string | number,
  adminRoles: any[],
  rolePermissions: any[],
  permissions: any[]
) => {
  // Handle both UUID and numeric user IDs
  let userRoles = [];
  
  if (typeof userId === 'string' && userId.includes('-')) {
    // UUID format - check if admin_role uses UUID or if we need profile mapping
    console.log(`[getUserPermissions] UUID user ID detected: ${userId}`);
    
    // First try direct UUID match (in case admin_role.user_id is actually UUID stored as string)
    userRoles = adminRoles.filter(role => role.user_id.toString() === userId);
    
    // If no match found, check if any admin roles exist for debugging
    if (userRoles.length === 0) {
      console.log(`[getUserPermissions] No direct UUID match. Admin roles sample:`, 
        adminRoles.slice(0, 3).map(r => ({ user_id: r.user_id, type: typeof r.user_id })));
      
      // Try finding numeric equivalent (temporary solution)
      // This assumes there might be a profile mapping we're missing
      const allUserIds = [...new Set(adminRoles.map(r => r.user_id))];
      console.log(`[getUserPermissions] All user_ids in admin_roles:`, allUserIds);
      
      return []; // Return empty for now until we resolve the mapping
    }
  } else {
    // Numeric user ID
    const numericUserId = toNumericId(userId);
    if (numericUserId === -1) return []; // Invalid ID
    
    userRoles = adminRoles.filter(role => role.user_id === numericUserId);
  }
  
  if (userRoles.length === 0) {
    console.log(`[getUserPermissions] No admin roles found for user:`, userId);
    return [];
  }
  
  // Get role-permission connections
  const rolePermissionIds = userRoles.map(role => role.role_permission_id);
  const userRolePermissions = rolePermissions.filter(rp => 
    rolePermissionIds.includes(rp.id)
  );
  
  // Get permission titles
  const permissionIds = userRolePermissions.map(rp => rp.permission_id);
  const userPermissionTitles = permissions
    .filter(p => permissionIds.includes(p.id))
    .map(p => p.title);
    
  console.log(`[getUserPermissions] Resolved permissions for ${userId}:`, {
    userRoles: userRoles.length,
    rolePermissionIds,
    permissions: userPermissionTitles
  });
    
  return userPermissionTitles;
};

// Define page permissions mapping
const PAGE_PERMISSIONS = {
  '/admin/ban': 'manage_bans',
  '/admin/announcements': 'manage_announcements', 
  '/admin/users': 'manage_users',
  '/admin/courses': 'manage_courses',
  '/admin/community': 'manage_community',
  '/admin/classrooms': 'manage_classrooms',
  '/admin/reports': 'view_reports',
  '/admin/ai': 'manage_ai',
  '/admin/maintenance': 'manage_maintenance',
} as const;

interface RoleCheckProps {
  children: React.ReactNode;
}

export function RoleCheck({ children }: RoleCheckProps) {
  const t = useTranslations('RoleCheck');
  const pathname = usePathname();
  const { data: user } = useUser();
  const { data: adminRoles } = useAdminRoles();
  const { data: rolePermissions } = useRolePermissions();
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !user?.profile?.id || !adminRoles || !rolePermissions || !roles || !permissions) {
      setHasAccess(null);
      return;
    }

    try {
      // Use user.profile.id (numeric) for admin role matching
      console.log('[RoleCheck] Using user.profile.id for matching:', {
        userId: user.id,
        profileId: user.profile.id,
        profileIdType: typeof user.profile.id
      });
      
      // Get user permissions using user.profile.id
      const userPermissionTitles = getUserPermissions(user.profile.id, adminRoles, rolePermissions, permissions);
      
      // Debug logging
      console.log('[RoleCheck] Debug Info:', {
        profileId: user.profile.id,
        permissionsCount: userPermissionTitles.length,
        permissions: userPermissionTitles
      });
      
      if (userPermissionTitles.length === 0) {
        console.log('[RoleCheck] No permissions found for profile.id:', user.profile.id);
        setHasAccess(false);
        return;
      }

      setUserPermissions(userPermissionTitles);

      // Check if user is superadmin (has all available permissions)
      const allPermissionTitles = permissions.map(p => p.title);
      const isSuperAdmin = allPermissionTitles.every(permission => 
        userPermissionTitles.includes(permission)
      );
      setIsSuperAdmin(isSuperAdmin);

      // Check access for current page
      const currentPath = pathname.replace(/^\/[^\/]+/, ''); // Remove locale prefix
      
      // Allow access to dashboard for all admin users
      if (currentPath === '/admin/dashboard') {
        console.log('[RoleCheck] Allowing access to dashboard');
        setHasAccess(true);
        return;
      }
      
      const requiredPermission = PAGE_PERMISSIONS[currentPath as keyof typeof PAGE_PERMISSIONS];

      if (!requiredPermission) {
        // Page not in our permission mapping, allow access
        console.log('[RoleCheck] Page not in permission mapping, allowing access:', currentPath);
        setHasAccess(true);
        return;
      }

      // Check if user has the required permission
      const hasRequiredPermission = userPermissionTitles.includes(requiredPermission);
      const finalAccess = hasRequiredPermission || isSuperAdmin;
      
      console.log('[RoleCheck] Access Decision:', {
        currentPath,
        requiredPermission,
        hasRequiredPermission,
        isSuperAdmin,
        finalAccess
      });
      
      setHasAccess(finalAccess);
    } catch (error) {
      console.error('[RoleCheck] Error processing permissions:', error);
      setHasAccess(false);
    }

  }, [user, adminRoles, rolePermissions, roles, permissions, pathname]);

  // Loading state
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-transparent">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
                <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('access_denied_title')}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {t('access_denied_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-800 dark:text-red-200">
                {t('restricted_access')}
              </AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-300">
                {t('insufficient_permissions')}
              </AlertDescription>
            </Alert>

            {/* Show user's current permissions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('your_permissions')}:
              </h4>
              {userPermissions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {userPermissions.map((permission) => (
                    <Badge 
                      key={permission} 
                      variant="secondary"
                      className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      {permission}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('no_permissions')}
                </p>
              )}
            </div>

            {isSuperAdmin && (
              <Badge className="w-full justify-center bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                <Shield className="w-3 h-3 mr-1" />
                {t('super_admin')}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access granted - render children
  return <>{children}</>;
}

// Export utility functions for use in other components
export function useCurrentUserPermissions() {
  const { data: user } = useUser();
  const { data: adminRoles } = useAdminRoles();
  const { data: rolePermissions } = useRolePermissions();
  const { data: permissions } = usePermissions();

  if (!user || !user?.profile?.id || !adminRoles || !rolePermissions || !permissions) {
    return { permissions: [], isSuperAdmin: false, isLoading: true };
  }

  try {
    const userPermissionTitles = getUserPermissions(user.profile.id, adminRoles, rolePermissions, permissions);
    const allPermissionTitles = permissions.map(p => p.title);
    const isSuperAdmin = allPermissionTitles.every(permission => 
      userPermissionTitles.includes(permission)
    );

    return {
      permissions: userPermissionTitles,
      isSuperAdmin,
      isLoading: false,
      canEditRoles: (targetUserId: string) => {
        try {
          // Rule 3: Current user cannot edit their own roles
          if (targetUserId.toString() === user?.profile?.id.toString()) return false;
          
          // Rule 2: Check if target is superadmin
          const targetPermissions = getUserPermissions(targetUserId, adminRoles, rolePermissions, permissions);
          const isTargetSuperAdmin = allPermissionTitles.every(permission => 
            targetPermissions.includes(permission)
          );
          
          // Rule 2: No one can edit superadmin permissions
          if (isTargetSuperAdmin) return false;
          
          return true;
        } catch (error) {
          console.error('[useCurrentUserPermissions] Error in canEditRoles:', error);
          return false;
        }
      }
    };
  } catch (error) {
    console.error('[useCurrentUserPermissions] Error processing permissions:', error);
    return { permissions: [], isSuperAdmin: false, isLoading: false };
  }
}