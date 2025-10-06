'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAdminUsers, usePromoteToAdmin } from '@/hooks/admin/use-admin-users';
import { AdminUser, AdminUserFilters } from '@/interface/admin/admin-interface';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserPlus, 
  Shield, 
  Ban, 
  Trash2,
  Eye,
  Edit,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { useFormat } from '@/hooks/use-format';
import { toast } from 'sonner';
import { UserInfoDialog } from './user-info-dialog';

export function AdminUsersList() {
  const t = useTranslations('AdminUsersList');
  const { formatRelativeTime } = useFormat();
  
  const [filters, setFilters] = useState<AdminUserFilters>({
    page: 1,
    limit: 20,
    role: 'all',
    status: 'all',
    search: ''
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const { data, isLoading, error } = useAdminUsers(filters);
  const promoteToAdmin = usePromoteToAdmin();

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key: keyof AdminUserFilters, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value === 'all' ? undefined : value,
      page: 1 
    }));
  };

  const handlePromoteUser = async () => {
    if (!promoteEmail.trim()) {
      toast.error(t('email_required'));
      return;
    }

    try {
      await promoteToAdmin.mutateAsync({ email: promoteEmail });
      toast.success(t('user_promoted'));
      setShowPromoteDialog(false);
      setPromoteEmail('');
    } catch (error: any) {
      toast.error(error.message || t('promote_failed'));
    }
  };

  const getRoleBadgeVariant = (role: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'tutor': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'active': return 'default';
      case 'banned': return 'destructive';
      default: return 'outline';
    }
  };

  const handlePreviewUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserDialog(true);
  };

  if (error) {
    return (
      <Card className="bg-transparent p-2">
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            {t('error_loading', { message: error.message })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('page_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('page_description')}</p>
        </div>
        <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2 text-white" />
              <span className="text-white">{t('promote_to_admin')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-gray-200 dark:border-gray-700 shadow-2xl">
            <DialogHeader className="space-y-4 pb-4">
              <DialogTitle className="text-xl font-semibold text-center text-gray-900 dark:text-gray-100">
                {t('promote_dialog_title')}
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {t('promote_dialog_description')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {t('email_label')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  style={{ 
                    color: '#000000',
                    backgroundColor: '#ffffff'
                  }}
                  className="dark:text-white dark:bg-gray-800"
                />
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">{t('important_notice_title')}</p>
                    <p>{t('important_notice_description')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="pt-4 flex gap-3 sm:gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setShowPromoteDialog(false)}
                className="flex-1 py-2.5 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('cancel')}
              </Button>
              <Button 
                onClick={handlePromoteUser} 
                disabled={promoteToAdmin.isPending || !promoteEmail.trim()}
              >
                {promoteToAdmin.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    {t('promoting')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white">
                    <Shield className="h-4 w-4" />
                    {t('promote_button')}
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-transparent p-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Filter className="h-5 w-5" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder={t('search_placeholder')}
                className="pl-10"
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* Role */}
            <Select value={filters.role || 'all'} onValueChange={(value) => handleFilterChange('role', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('filter_by_role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_roles')}</SelectItem>
                <SelectItem value="admin">{t('admin')}</SelectItem>
                <SelectItem value="tutor">{t('tutor')}</SelectItem>
                <SelectItem value="student">{t('student')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('filter_by_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_status')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="banned">{t('banned')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Limit */}
            <Select value={filters.limit?.toString() || '20'} onValueChange={(value) => handleFilterChange('limit', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('items_per_page')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">{t('per_page_10')}</SelectItem>
                <SelectItem value="20">{t('per_page_20')}</SelectItem>
                <SelectItem value="50">{t('per_page_50')}</SelectItem>
                <SelectItem value="100">{t('per_page_100')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>


      {/* Users Table */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">
            {t('users_count', { count: data?.data?.pagination?.total || 0 })}
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            {t('showing_users', { 
              shown: data?.data?.users.length || 0, 
              total: data?.data?.pagination?.total || 0 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900 dark:text-gray-100">{t('table_user')}</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100">{t('table_role')}</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100">{t('table_status')}</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100">{t('table_points')}</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100">{t('table_joined')}</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100">{t('table_last_login')}</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-gray-100">{t('table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.users.map((user: AdminUser) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {user.display_name || user.full_name || t('unknown_user')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {user.status}
                      </Badge>
                      {user.status === 'banned' && user.banned_reason && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {user.banned_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{user.points}</TableCell>
                    <TableCell>
                      {user.created_at ? formatRelativeTime(user.created_at) : t('not_provided')}
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-900 dark:text-gray-100">
                        {user.last_login 
                          ? formatRelativeTime(user.last_login)
                          : t('never_logged_in')
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handlePreviewUser(user.user_id)}
                          title={t('preview_user')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {data?.data?.pagination && data.data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('page_info', { 
                  current: data.data.pagination?.page, 
                  total: data.data.pagination?.totalPages 
                })}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.data.pagination?.page <= 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.data.pagination?.page >= data.data.pagination?.totalPages}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Info Dialog */}
      <UserInfoDialog 
        userId={selectedUserId}
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
      />
    </div>
  );
}
