// components/admin/dashboard/admin-dashboard.tsx

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminAnalytics } from '@/hooks/admin/use-admin-analytics';
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
import { formatDistanceToNow } from 'date-fns';
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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className={`text-xs flex items-center mt-1 ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend.isPositive ? '+' : ''}{trend.value}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const { data: analytics, isLoading, error } = useAdminAnalytics(30);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load analytics</h3>
          <p className="text-gray-500">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const { userStats, contentStats, recentActivity } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Overview of your Studify platform
          </p>
        </div>
        <Button>
          <Activity className="h-4 w-4 mr-2" />
          View Full Analytics
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={userStats.total}
          description="All registered users"
          icon={Users}
        />
        <StatsCard
          title="New Users"
          value={userStats.new}
          description="Last 30 days"
          icon={UserPlus}
        />
        <StatsCard
          title="Active Users"
          value={userStats.active}
          description="Currently active"
          icon={Users}
        />
        <StatsCard
          title="Banned Users"
          value={userStats.banned}
          description="Requires attention"
          icon={UserX}
        />
      </div>

      {/* Content Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Courses"
          value={contentStats.courses}
          description="Published courses"
          icon={BookOpen}
        />
        <StatsCard
          title="Active Classrooms"
          value={contentStats.classrooms}
          description="Live classrooms"
          icon={Calendar}
        />
        <StatsCard
          title="Community Posts"
          value={contentStats.communityPosts}
          description="User-generated content"
          icon={MessageSquare}
        />
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>User Role Distribution</CardTitle>
          <CardDescription>
            Breakdown of users by role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(userStats.roleDistribution).map(([role, count]) => (
              <div key={role} className="flex items-center space-x-2">
                <Badge variant={role === 'admin' ? 'destructive' : role === 'tutor' ? 'default' : 'secondary'}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
                <span className="text-sm font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Activity</CardTitle>
          <CardDescription>
            Latest administrative actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.slice(0, 10).map((activity: AdminAuditEntry) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">
                      {activity.profiles?.display_name || 'System'} performed {activity.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      on {activity.subject_type}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
