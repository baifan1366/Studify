// components/admin/dashboard/admin-dashboard.tsx

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminAnalytics } from '@/hooks/admin/use-admin-analytics';
import { useFormat } from '@/hooks/use-format';
import { useTranslations } from 'next-intl';
import { 
  Users, 
  UserPlus, 
  UserX, 
  BookOpen, 
  Calendar, 
  MessageSquare,
  TrendingUp,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { AdminAnalytics, AdminAuditEntry } from '@/interface/admin/admin-interface';

interface StatsCardProps {
  title: string;
  value: number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  const t = useTranslations('AdminDashboard');
  
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        )}
        {trend && (
          <div className={`text-xs flex items-center mt-2 ${
            trend.isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend.isPositive ? '+' : ''}{trend.value}% {t('stats.trend_from_last_period')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const { data: analytics, isLoading, error } = useAdminAnalytics(30);
  const { formatRelativeTime } = useFormat();
  const t = useTranslations('AdminDashboard');

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('failed_to_load')}</h3>
          <p className="text-gray-500 dark:text-gray-400">{t('try_refresh')}</p>
        </div>
      </div>
    );
  }

  const { userStats, contentStats, recentActivity } = analytics.data;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            {t('subtitle')}
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shrink-0">
          <Activity className="h-4 w-4 mr-2" />
          {t('view_full_analytics')}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('stats.total_users')}
          value={userStats.total}
          description={t('stats.total_users_desc')}
          icon={Users}
        />
        <StatsCard
          title={t('stats.new_users')}
          value={userStats.new}
          description={t('stats.new_users_desc')}
          icon={UserPlus}
        />
        <StatsCard
          title={t('stats.active_users')}
          value={userStats.active}
          description={t('stats.active_users_desc')}
          icon={Users}
        />
        <StatsCard
          title={t('stats.banned_users')}
          value={userStats.banned}
          description={t('stats.banned_users_desc')}
          icon={UserX}
        />
      </div>

      {/* Content Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title={t('stats.total_courses')}
          value={contentStats.courses}
          description={t('stats.total_courses_desc')}
          icon={BookOpen}
        />
        <StatsCard
          title={t('stats.active_classrooms')}
          value={contentStats.classrooms}
          description={t('stats.active_classrooms_desc')}
          icon={Calendar}
        />
        <StatsCard
          title={t('stats.community_posts')}
          value={contentStats.communityPosts}
          description={t('stats.community_posts_desc')}
          icon={MessageSquare}
        />
      </div>

      {/* Role Distribution */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{t('role_distribution.title')}</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('role_distribution.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {Object.entries(userStats.roleDistribution).map(([role, count]) => (
              <div key={role} className="flex items-center space-x-2">
                <Badge 
                  variant={role === 'admin' ? 'destructive' : role === 'tutor' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count as number}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{t('recent_activity.title')}</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('recent_activity.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.slice(0, 10).map((activity: AdminAuditEntry) => (
              <div key={activity.id} className="flex items-start sm:items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-1.5 sm:mt-0 shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.profiles?.display_name 
                        ? t('recent_activity.performed_action', { 
                            name: activity.profiles.display_name, 
                            action: activity.action.replace(/_/g, ' ') 
                          })
                        : t('recent_activity.system_action', { 
                            action: activity.action.replace(/_/g, ' ') 
                          })
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('recent_activity.on_subject', { subject: activity.subject_type })}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                  {formatRelativeTime(activity.created_at)}
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('recent_activity.no_activity')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
