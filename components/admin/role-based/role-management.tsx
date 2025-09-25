'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRoles, useCreateRoles, useUpdateRoles, useDeleteRoles } from '@/hooks/role-based/use-roles';
import { Roles } from '@/interface/admin/roles-interface';

interface RoleManagementProps {
  trigger?: React.ReactNode;
}

interface RoleFormData {
  title: string;
}

export function RoleManagement({ trigger }: RoleManagementProps) {
  const t = useTranslations('RoleManagement');
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Roles | null>(null);
  const [deleteRole, setDeleteRole] = useState<Roles | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({ title: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: roles, isLoading } = useRoles();
  const createRole = useCreateRoles();
  const updateRole = useUpdateRoles();
  const deleteRoleMutation = useDeleteRoles();

  const resetForm = () => {
    setFormData({ title: '' });
    setErrors({});
    setEditingRole(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = t('role_title_required');
    } else if (formData.title.length < 2) {
      newErrors.title = t('role_title_min_length');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingRole) {
        await updateRole.mutateAsync({
          roleId: editingRole.public_id,
          title: formData.title,
        });
        toast.success(t('role_updated_success'));
      } else {
        await createRole.mutateAsync({
          body: {
            title: formData.title,
          },
        });
        toast.success(t('role_created_success'));
      }
      
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || t('error_occurred'));
    }
  };

  const handleEdit = (role: Roles) => {
    setEditingRole(role);
    setFormData({ title: role.title });
  };

  const handleDelete = async () => {
    if (!deleteRole) return;

    try {
      await deleteRoleMutation.mutateAsync(deleteRole.public_id);
      toast.success(t('role_deleted_success'));
      setDeleteRole(null);
    } catch (error: any) {
      toast.error(error?.message || t('failed_to_delete'));
    }
  };

  const isSubmitting = createRole.isPending || updateRole.isPending;

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
              <Settings className="w-4 h-4 mr-2" />
              {t('manage_roles')}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Create/Edit Form */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle>{editingRole ? t('edit_role') : t('create_role')}</CardTitle>
                <CardDescription>
                  {editingRole ? t('edit_description') : t('create_description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('role_title')}</Label>
                    <Input
                      id="title"
                      placeholder={t('role_title_placeholder')}
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">{errors.title}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {editingRole ? t('update_role_button') : t('create_role_button')}
                    </Button>
                    {editingRole && (
                      <Button type="button" variant="ghost" onClick={resetForm} className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {t('cancel')}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Roles List */}
            <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle>{t('existing_roles')}</CardTitle>
                <CardDescription>
                  {t('manage_system_roles')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  </div>
                ) : !roles || roles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('no_roles_found')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            #{role.id}
                          </Badge>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{role.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t('created')}: {new Date(role.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(role)}
                            className="border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteRole(role)}
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
      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">{t('delete_role_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {t('delete_role_description', { title: deleteRole?.title || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteRoleMutation.isPending}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}