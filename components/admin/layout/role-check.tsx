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
    if (!user || !adminRoles || !rolePermissions || !roles || !permissions) {
      setHasAccess(null);
      return;
    }

    // Get current user's admin roles
    const currentUserRoles = adminRoles.filter(role => role.user_id === user.id);
    
    if (currentUserRoles.length === 0) {
      setHasAccess(false);
      return;
    }

    // Get all role-permission connections for user's roles
    const userRolePermissionIds = currentUserRoles.map(role => role.role_permission_id);
    const userRolePermissions = rolePermissions.filter(rp => 
      userRolePermissionIds.includes(rp.public_id)
    );

    // Get all permission titles for the user
    const userPermissionIds = userRolePermissions.map(rp => rp.permission_id);
    const userPermissionTitles = permissions
      .filter(p => userPermissionIds.includes(p.public_id))
      .map(p => p.title);

    setUserPermissions(userPermissionTitles);

    // Check if user is superadmin (has all available permissions)
    const allPermissionTitles = permissions.map(p => p.title);
    const isSuperAdmin = allPermissionTitles.every(permission => 
      userPermissionTitles.includes(permission)
    );
    setIsSuperAdmin(isSuperAdmin);

    // Check access for current page
    const currentPath = pathname.replace(/^\/[^\/]+/, ''); // Remove locale prefix
    const requiredPermission = PAGE_PERMISSIONS[currentPath as keyof typeof PAGE_PERMISSIONS];

    if (!requiredPermission) {
      // Page not in our permission mapping, allow access
      setHasAccess(true);
      return;
    }

    // Check if user has the required permission
    const hasRequiredPermission = userPermissionTitles.includes(requiredPermission);
    setHasAccess(hasRequiredPermission || isSuperAdmin);

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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

  if (!user || !adminRoles || !rolePermissions || !permissions) {
    return { permissions: [], isSuperAdmin: false, isLoading: true };
  }

  const currentUserRoles = adminRoles.filter(role => role.user_id === user.id);
  const userRolePermissionIds = currentUserRoles.map(role => role.role_permission_id);
  const userRolePermissions = rolePermissions.filter(rp => 
    userRolePermissionIds.includes(rp.public_id)
  );
  const userPermissionIds = userRolePermissions.map(rp => rp.permission_id);
  const userPermissionTitles = permissions
    .filter(p => userPermissionIds.includes(p.public_id))
    .map(p => p.title);

  const allPermissionTitles = permissions.map(p => p.title);
  const isSuperAdmin = allPermissionTitles.every(permission => 
    userPermissionTitles.includes(permission)
  );

  return {
    permissions: userPermissionTitles,
    isSuperAdmin,
    isLoading: false,
    canEditRoles: (targetUserId: string) => {
      // Rule 3: Current user cannot edit their own roles
      if (targetUserId === user.id) return false;
      
      // Rule 2: Check if target is superadmin
      const targetUserRoles = adminRoles.filter(role => role.user_id === targetUserId);
      const targetRolePermissionIds = targetUserRoles.map(role => role.role_permission_id);
      const targetRolePermissions = rolePermissions.filter(rp => 
        targetRolePermissionIds.includes(rp.public_id)
      );
      const targetPermissionIds = targetRolePermissions.map(rp => rp.permission_id);
      const targetPermissionTitles = permissions
        .filter(p => targetPermissionIds.includes(p.public_id))
        .map(p => p.title);
      
      const isTargetSuperAdmin = allPermissionTitles.every(permission => 
        targetPermissionTitles.includes(permission)
      );
      
      // Rule 2: No one can edit superadmin permissions
      if (isTargetSuperAdmin) return false;
      
      return true;
    }
  };
}