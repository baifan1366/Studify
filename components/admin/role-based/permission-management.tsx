'use client';

import { useState } from 'react';
import { Shield, Edit2, Trash2, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePermissions, useCreatePermissions, useUpdatePermissions, useDeletePermissions } from '@/hooks/role-based/use-permissions';
import { Permissions } from '@/interface/admin/permissions-interface';

interface PermissionManagementProps {
  trigger?: React.ReactNode;
}

interface PermissionFormData {
  title: string;
}

export function PermissionManagement({ trigger }: PermissionManagementProps) {
  const t = useTranslations('PermissionManagement');
  const [open, setOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permissions | null>(null);
  const [deletePermission, setDeletePermission] = useState<Permissions | null>(null);
  const [formData, setFormData] = useState<PermissionFormData>({ title: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: permissions, isLoading } = usePermissions();
  const createPermission = useCreatePermissions();
  const updatePermission = useUpdatePermissions();
  const deletePermissionMutation = useDeletePermissions();

  const resetForm = () => {
    setFormData({ title: '' });
    setErrors({});
    setEditingPermission(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = t('permission_title_required');
    } else if (formData.title.length < 2) {
      newErrors.title = t('permission_title_min_length');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingPermission) {
        await updatePermission.mutateAsync({
          permissionId: editingPermission.public_id,
          title: formData.title,
        });
        toast.success(t('permission_updated_success'));
      } else {
        await createPermission.mutateAsync({
          body: {
            title: formData.title,
          },
        });
        toast.success(t('permission_created_success'));
      }
      
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || t('error_occurred'));
    }
  };

  const handleEdit = (permission: Permissions) => {
    setEditingPermission(permission);
    setFormData({ title: permission.title });
  };

  const handleDelete = async () => {
    if (!deletePermission) return;

    try {
      await deletePermissionMutation.mutateAsync(deletePermission.public_id);
      toast.success(t('permission_deleted_success'));
      setDeletePermission(null);
    } catch (error: any) {
      toast.error(error?.message || t('failed_to_delete'));
    }
  };

  const isSubmitting = createPermission.isPending || updatePermission.isPending;

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
              <Key className="w-4 h-4 mr-2" />
              {t('manage_permissions')}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{t('title')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Create/Edit Form */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle>{editingPermission ? t('edit_permission') : t('create_permission')}</CardTitle>
                <CardDescription>
                  {editingPermission ? t('edit_description') : t('create_description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('permission_title')}</Label>
                    <Input
                      id="title"
                      placeholder={t('permission_title_placeholder')}
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">{errors.title}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {editingPermission ? t('update_permission_button') : t('create_permission_button')}
                    </Button>
                    {editingPermission && (
                      <Button type="button" variant="outline" onClick={resetForm} className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {t('cancel')}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Permissions List */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle>{t('existing_permissions')}</CardTitle>
                <CardDescription>
                  {t('manage_system_permissions')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                ) : !permissions || permissions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('no_permissions_found')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            #{permission.id}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-gray-100">{permission.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('created')}: {new Date(permission.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(permission)}
                            className="border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletePermission(permission)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
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
      <AlertDialog open={!!deletePermission} onOpenChange={() => setDeletePermission(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">{t('delete_permission_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {t('delete_permission_description', { title: deletePermission?.title || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletePermissionMutation.isPending}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}