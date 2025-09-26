'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAdminUser } from '@/hooks/admin/use-admin-users';
import { AdminUserDetails } from '@/interface/admin/admin-interface';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Trophy,
  BookOpen,
  Users,
  MessageCircle,
  Activity,
  CheckCircle,
  Clock,
  Ban,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useFormat } from '@/hooks/use-format';

interface UserInfoDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserInfoDialog({ userId, open, onOpenChange }: UserInfoDialogProps) {
  const t = useTranslations('UserInfoDialog');
  const { formatRelativeTime } = useFormat();
  const { data: user, isLoading, error } = useAdminUser(userId || '');

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

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader> 
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-600 dark:text-gray-400">
            <User className="h-6 w-6" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">{t('loading')}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-6 w-6 mr-2" />
            {t('error_loading_user')}
          </div>
        ) : user?.data?.user ? (
          <div className="space-y-6">
            {/* User Basic Info */}
            <Card className="bg-transparent border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <User className="h-5 w-5" />
                  {t('basic_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('display_name')}
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {user.data.user.display_name || user.data.user.full_name || t('not_provided')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {t('email')}
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">
                      {user.data.user.email}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      {t('role')}
                    </label>
                    <Badge variant={getRoleBadgeVariant(user.data.user.role)} className="mt-1">
                      {user.data.user.role}
                    </Badge>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('status')}
                    </label>
                    <div className="flex flex-col gap-2 mt-1">
                      <Badge variant={getStatusBadgeVariant(user.data.user.status)}>
                        {user.data.user.status}
                      </Badge>
                      {user.data.user.status === 'banned' && user.data.user.banned_reason && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Ban className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-red-800 dark:text-red-200">{t('ban_reason')}</p>
                              <p className="text-red-600 dark:text-red-300">{user.data.user.banned_reason}</p>
                              {user.data.user.banned_at && (
                                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                  {t('banned_at')}: {formatRelativeTime(user.data.user.banned_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {t('points')}
                    </label>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {user.data.user.points}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {t('onboarding_status')}
                    </label>
                    <Badge variant={user.data.user.onboarded ? 'default' : 'secondary'} className="mt-1">
                      {user.data.user.onboarded ? t('completed') : t('pending')}
                    </Badge>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('profile_completion')}
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${user.data.user.profile_completion}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {user.data.user.profile_completion}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t('joined')}
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {user.data.user.created_at ? formatRelativeTime(user.data.user.created_at) : t('not_provided')}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {t('last_login')}
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {user.data.user.last_login 
                        ? formatRelativeTime(user.data.user.last_login)
                        : t('never_logged_in')
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Stats - Hide for admin users */}
            {user.data.user.role !== 'admin' && (
              <Card className="bg-transparent border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Activity className="h-5 w-5" />
                    {t('activity_stats')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-center">
                      <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {user.data.user.course_enrollment?.[0]?.count || 0}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {t('enrollments')}
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 text-center">
                      <Users className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {user.data.user.classroom_member?.[0]?.count || 0}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        {t('classrooms')}
                      </p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 text-center">
                      <MessageCircle className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {user.data.user.community_post?.[0]?.count || 0}
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                        {t('posts')}
                      </p>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 text-center">
                      <MessageCircle className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {user.data.user.community_comment?.[0]?.count || 0}
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                        {t('comments')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}