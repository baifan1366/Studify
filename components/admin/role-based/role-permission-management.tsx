'use client';

import { useState } from 'react';
import { Link, Unlink, Edit2, Trash2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRolePermissions, useCreateRolePermissions, useUpdateRolePermissions, useDeleteRolePermissions } from '@/hooks/role-based/use-role-permissions';
import { useRoles } from '@/hooks/role-based/use-roles';
import { usePermissions } from '@/hooks/role-based/use-permissions';
import { RolePermissions } from '@/interface/admin/role-permissions-interface';

interface RolePermissionManagementProps {
  trigger?: React.ReactNode;
}

interface RolePermissionFormData {
  role_id: string;
  permission_id: string;
}

export function RolePermissionManagement({ trigger }: RolePermissionManagementProps) {
  const t = useTranslations('RolePermissionManagement');
  const [open, setOpen] = useState(false);
  const [editingRolePermission, setEditingRolePermission] = useState<RolePermissions | null>(null);
  const [deleteRolePermission, setDeleteRolePermission] = useState<RolePermissions | null>(null);
  const [formData, setFormData] = useState<RolePermissionFormData>({ role_id: '', permission_id: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: rolePermissions, isLoading } = useRolePermissions();
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const createRolePermission = useCreateRolePermissions();
  const updateRolePermission = useUpdateRolePermissions();
  const deleteRolePermissionMutation = useDeleteRolePermissions();

  const resetForm = () => {
    setFormData({ role_id: '', permission_id: '' });
    setErrors({});
    setEditingRolePermission(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.role_id) {
      newErrors.role_id = t('role_required');
    }
    if (!formData.permission_id) {
      newErrors.permission_id = t('permission_required');
    }

    // Check for duplicate connections
    if (formData.role_id && formData.permission_id && rolePermissions) {
      const existingConnection = rolePermissions.find(
        rp => rp.role_id === formData.role_id && 
              rp.permission_id === formData.permission_id &&
              (!editingRolePermission || rp.id !== editingRolePermission.id)
      );
      if (existingConnection) {
        newErrors.general = t('connection_exists');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingRolePermission) {
        await updateRolePermission.mutateAsync({
          rolePermissionId: editingRolePermission.public_id,
          role_id: formData.role_id,
          permission_id: formData.permission_id,
        });
        toast.success(t('connection_updated_success'));
      } else {
        await createRolePermission.mutateAsync({
          body: {
            role_id: formData.role_id,
            permission_id: formData.permission_id,
          },
        });
        toast.success(t('connection_created_success'));
      }
      
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || t('error_occurred'));
    }
  };

  const handleEdit = (rolePermission: RolePermissions) => {
    setEditingRolePermission(rolePermission);
    setFormData({ 
      role_id: rolePermission.role_id, 
      permission_id: rolePermission.permission_id 
    });
  };

  const handleDelete = async () => {
    if (!deleteRolePermission) return;

    try {
      await deleteRolePermissionMutation.mutateAsync(deleteRolePermission.public_id);
      toast.success(t('connection_deleted_success'));
      setDeleteRolePermission(null);
    } catch (error: any) {
      toast.error(error?.message || t('failed_to_delete'));
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles?.find(r => r.public_id === roleId);
    return role?.title || t('unknown_role');
  };

  const getPermissionName = (permissionId: string) => {
    const permission = permissions?.find(p => p.public_id === permissionId);
    return permission?.title || t('unknown_role');
  };

  const isSubmitting = createRolePermission.isPending || updateRolePermission.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm();
        }
      }}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <GitBranch className="w-4 h-4 mr-2" />
              {t('manage_role_permissions')}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{t('title')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Create/Edit Form */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle>{editingRolePermission ? t('edit_connection') : t('create_connection')}</CardTitle>
                <CardDescription>
                  {editingRolePermission ? t('edit_description') : t('create_description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.general && (
                    <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role_id">{t('select_role')}</Label>
                      <Select 
                        value={formData.role_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: value }))}
                      >
                        <SelectTrigger className={errors.role_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}>
                          <SelectValue placeholder={t('choose_role')} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.public_id}>
                              {role.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.role_id && (
                        <p className="text-sm text-red-500">{errors.role_id}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="permission_id">{t('select_permission')}</Label>
                      <Select 
                        value={formData.permission_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, permission_id: value }))}
                      >
                        <SelectTrigger className={errors.permission_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}>
                          <SelectValue placeholder={t('choose_permission')} />
                        </SelectTrigger>
                        <SelectContent>
                          {permissions?.map((permission) => (
                            <SelectItem key={permission.id} value={permission.public_id}>
                              {permission.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.permission_id && (
                        <p className="text-sm text-red-500">{errors.permission_id}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Link className="w-4 h-4 mr-2" />
                      {editingRolePermission ? t('update_connection_button') : t('create_connection_button')}
                    </Button>
                    {editingRolePermission && (
                      <Button type="button" variant="outline" onClick={resetForm} className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {t('cancel')}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Role-Permissions List */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle>{t('existing_connections')}</CardTitle>
                <CardDescription>
                  {t('manage_connections')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                ) : !rolePermissions || rolePermissions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('no_connections_found')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rolePermissions.map((rolePermission) => (
                      <div
                        key={rolePermission.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            #{rolePermission.id}
                          </Badge>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded">
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                                {getRoleName(rolePermission.role_id)}
                              </Badge>
                            </div>
                            <GitBranch className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded">
                              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                {getPermissionName(rolePermission.permission_id)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('created')}: {new Date(rolePermission.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(rolePermission)}
                            className="border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteRolePermission(rolePermission)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRolePermission} onOpenChange={() => setDeleteRolePermission(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">{t('delete_connection_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {deleteRolePermission && t('delete_connection_description', { 
                role: getRoleName(deleteRolePermission.role_id),
                permission: getPermissionName(deleteRolePermission.permission_id)
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteRolePermissionMutation.isPending}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}