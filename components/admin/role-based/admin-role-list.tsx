'use client';

import { useState, useMemo } from 'react';
import { Users, Edit2, Trash2, Search, Filter, UserCog, Crown, Shield, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminRoles, useCreateAdminRoles, useUpdateAdminRoles, useDeleteAdminRoles } from '@/hooks/role-based/use-admin-roles';
import { useRolePermissions } from '@/hooks/role-based/use-role-permissions';
import { useRoles } from '@/hooks/role-based/use-roles';
import { usePermissions } from '@/hooks/role-based/use-permissions';
import { useCurrentUserPermissions } from '@/components/admin/layout/role-check';
import { useUser } from '@/hooks/profile/use-user';
import { AdminRoles } from '@/interface/admin/admin-roles-interface';
import { RoleManagement } from './role-management';
import { PermissionManagement } from './permission-management';
import { RolePermissionManagement } from './role-permission-management';

interface GroupedAdmin {
  user_id: string;
  user_profile: {
    display_name?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  roles: AdminRoles[];
}

interface EditAdminRoleData {
  role_permission_id: string;
}

interface CreateAdminRoleData {
  user_id: string;
  role_permission_id: string;
}

export function AdminRoleList() {
  const t = useTranslations('AdminRoleList');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingAdminRole, setEditingAdminRole] = useState<AdminRoles | null>(null);
  const [deleteAdminRole, setDeleteAdminRole] = useState<AdminRoles | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditAdminRoleData>({ role_permission_id: '' });
  const [createFormData, setCreateFormData] = useState<CreateAdminRoleData>({ user_id: '', role_permission_id: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: adminRoles, isLoading } = useAdminRoles();
  const { data: rolePermissions } = useRolePermissions();
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const createAdminRole = useCreateAdminRoles();
  const updateAdminRole = useUpdateAdminRoles();
  const deleteAdminRoleMutation = useDeleteAdminRoles();
  const { canEditRoles, isSuperAdmin, isLoading: permissionsLoading } = useCurrentUserPermissions();
  const { data: user } = useUser();

  // Group admin roles by user_id
  const groupedAdmins = useMemo(() => {
    if (!adminRoles) return [];

    const grouped = adminRoles.reduce((acc, adminRole) => {
      const existingAdmin = acc.find(admin => admin.user_id === adminRole.user_id);
      
      if (existingAdmin) {
        existingAdmin.roles.push(adminRole);
      } else {
        acc.push({
          user_id: adminRole.user_id,
          user_profile: {
            display_name: `Admin ${adminRole.user_id}`,
            email: `admin.${adminRole.user_id}@studify.com`,
          },
          roles: [adminRole],
        });
      }
      
      return acc;
    }, [] as GroupedAdmin[]);

    return grouped;
  }, [adminRoles]);

  // Filter grouped admins based on search and role filter
  const filteredAdmins = useMemo(() => {
    let filtered = groupedAdmins;

    if (searchTerm) {
      filtered = filtered.filter(admin => 
        admin.user_profile.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.user_profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.user_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(admin => {
        return admin.roles.some(role => {
          const rolePermission = rolePermissions?.find(rp => rp.public_id === role.role_permission_id);
          const roleData = roles?.find(r => r.public_id === rolePermission?.role_id);
          return roleData?.title.toLowerCase() === roleFilter.toLowerCase();
        });
      });
    }

    return filtered;
  }, [groupedAdmins, searchTerm, roleFilter, rolePermissions, roles]);

  const getRolePermissionName = (rolePermissionId: string) => {
    const rolePermission = rolePermissions?.find(rp => rp.public_id === rolePermissionId);
    if (!rolePermission) return t('unknown_role');
    
    const role = roles?.find(r => r.public_id === rolePermission.role_id);
    const permission = permissions?.find(p => p.public_id === rolePermission.permission_id);
    
    return `${role?.title || 'Role'} - ${permission?.title || 'Permission'}`;
  };

  const handleEditAdminRole = (adminRole: AdminRoles) => {
    setEditingAdminRole(adminRole);
    setEditFormData({ role_permission_id: adminRole.role_permission_id });
  };

  const handleUpdateAdminRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAdminRole) return;
    
    const newErrors: Record<string, string> = {};
    if (!editFormData.role_permission_id) {
      newErrors.role_permission_id = t('role_permission_required');
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await updateAdminRole.mutateAsync({
        adminId: editingAdminRole.public_id,
        role_permission_id: editFormData.role_permission_id,
      });
      toast.success(t('admin_role_updated_success'));
      setEditingAdminRole(null);
      setEditFormData({ role_permission_id: '' });
    } catch (error: any) {
      toast.error(error?.message || t('failed_to_update'));
    }
  };

  const handleDeleteAdminRole = async () => {
    if (!deleteAdminRole) return;

    try {
      await deleteAdminRoleMutation.mutateAsync(deleteAdminRole.public_id);
      toast.success(t('admin_role_deleted_success'));
      setDeleteAdminRole(null);
    } catch (error: any) {
      toast.error(error?.message || t('failed_to_delete'));
    }
  };

  const handleCreateAdminRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!createFormData.user_id) {
      newErrors.user_id = t('user_id_required');
    }
    if (!createFormData.role_permission_id) {
      newErrors.role_permission_id = t('role_permission_required');
    }
    
    // Check for duplicate admin role
    if (createFormData.user_id && createFormData.role_permission_id && adminRoles) {
      const existingRole = adminRoles.find(
        role => role.user_id === createFormData.user_id && 
                role.role_permission_id === createFormData.role_permission_id
      );
      if (existingRole) {
        newErrors.general = t('admin_role_exists');
      }
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await createAdminRole.mutateAsync(createFormData);
      toast.success(t('admin_role_created_success'));
      setCreateDialogOpen(false);
      setCreateFormData({ user_id: '', role_permission_id: '' });
      setErrors({});
    } catch (error: any) {
      toast.error(error?.message || t('failed_to_create'));
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({ user_id: '', role_permission_id: '' });
    setErrors({});
    setCreateDialogOpen(false);
  };

  const getRoleColor = (rolePermissionId: string) => {
    const rolePermission = rolePermissions?.find(rp => rp.public_id === rolePermissionId);
    const role = roles?.find(r => r.public_id === rolePermission?.role_id);
    
    const colors: Record<string, string> = {
      'admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      'super admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      'moderator': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      'support': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    };
    
    return colors[role?.title?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
  };

  const availableRoles = useMemo(() => {
    const uniqueRoles = new Set<string>();
    rolePermissions?.forEach(rp => {
      const role = roles?.find(r => r.public_id === rp.role_id);
      if (role) uniqueRoles.add(role.title);
    });
    return Array.from(uniqueRoles);
  }, [rolePermissions, roles]);

  return (
    <div className="space-y-6">
      {/* Header with Management Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('create_admin_role')}
          </Button>
          <RoleManagement 
            trigger={
              <Button variant="default">
                <UserCog className="w-4 h-4 mr-2" />
                {t('roles')}
              </Button>
            }
          />
          <PermissionManagement 
            trigger={
              <Button variant="default">
                <Shield className="w-4 h-4 mr-2" />
                {t('permissions')}
              </Button>
            }
          />
          <RolePermissionManagement 
            trigger={
              <Button variant="default">
                <Crown className="w-4 h-4 mr-2" />
                {t('connections')}
              </Button>
            }
          />
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder={t('search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="sm:w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('filter_by_role')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectItem value="all">{t('all_roles')}</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin List */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Users className="w-5 h-5" />
            {t('admin_users_count', { count: filteredAdmins.length })}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('grouped_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {searchTerm || roleFilter !== 'all' ? t('no_admins_match_filters') : t('no_admins_found')}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAdmins.map((admin) => (
                <div key={admin.user_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Admin Info Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={admin.user_profile.avatar_url} />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {admin.user_profile.display_name?.substring(0, 2).toUpperCase() || 'AD'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {admin.user_profile.display_name || `Admin ${admin.user_id}`}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {admin.user_profile.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {t('user_id')}: {admin.user_id}
                        </p>
                      </div>
                    </div>
                    
                    <Badge variant="secondary" className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {t('roles_count', { count: admin.roles.length })}
                    </Badge>
                  </div>

                  {/* Roles List */}
                  <div className="space-y-3">
                    {admin.roles.map((role, index) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                            #{role.id}
                          </Badge>
                          <Badge className={getRoleColor(role.role_permission_id)}>
                            {getRolePermissionName(role.role_permission_id)}
                          </Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t('added')}: {new Date(role.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          {permissionsLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
                            </div>
                          ) : canEditRoles && canEditRoles(admin.user_id) ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditAdminRole(role)}
                                className="border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteAdminRole(role)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100">
                              <Shield className="w-3 h-3 mr-1" />
                              {admin.user_id === user?.id ? t('cannot_edit_self') : t('protected_admin')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Admin Role Dialog */}
      <Dialog open={!!editingAdminRole} onOpenChange={(open) => {
        if (!open) {
          setEditingAdminRole(null);
          setEditFormData({ role_permission_id: '' });
          setErrors({});
        }
      }}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{t('edit_admin_role')}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateAdminRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role_permission_id">{t('role_permission')}</Label>
              <Select 
                value={editFormData.role_permission_id} 
                onValueChange={(value) => setEditFormData({ role_permission_id: value })}
              >
                <SelectTrigger className={errors.role_permission_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}>
                  <SelectValue placeholder={t('select_role_permission')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {rolePermissions?.map((rp) => (
                    <SelectItem key={rp.id} value={rp.public_id}>
                      {getRolePermissionName(rp.public_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_permission_id && (
                <p className="text-sm text-red-500">{errors.role_permission_id}</p>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateAdminRole.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {t('update_role')}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingAdminRole(null)}
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Admin Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetCreateForm();
        } else {
          setCreateDialogOpen(open);
        }
      }}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{t('create_admin_role')}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateAdminRole} className="space-y-4">
            {errors.general && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="user_id">{t('user_id')}</Label>
              <Input
                id="user_id"
                placeholder={t('user_id_placeholder')}
                value={createFormData.user_id}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, user_id: e.target.value }))}
                className={errors.user_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}
              />
              {errors.user_id && (
                <p className="text-sm text-red-500">{errors.user_id}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role_permission_id">{t('role_permission')}</Label>
              <Select 
                value={createFormData.role_permission_id} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, role_permission_id: value }))}
              >
                <SelectTrigger className={errors.role_permission_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}>
                  <SelectValue placeholder={t('select_role_permission')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {rolePermissions?.map((rp) => (
                    <SelectItem key={rp.id} value={rp.public_id}>
                      {getRolePermissionName(rp.public_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_permission_id && (
                <p className="text-sm text-red-500">{errors.role_permission_id}</p>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createAdminRole.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {t('create_admin_role_button')}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetCreateForm}
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAdminRole} onOpenChange={() => setDeleteAdminRole(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">{t('delete_admin_role_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {t('delete_admin_role_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdminRole}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteAdminRoleMutation.isPending}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}