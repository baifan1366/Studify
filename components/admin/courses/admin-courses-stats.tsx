'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useAdminCourseAnalytics } from '@/hooks/admin/use-admin-courses';
import { useFormat } from '@/hooks/use-format';

export default function AdminCoursesStats() {
  const { formatNumber } = useFormat();
  const { data: analytics, isLoading, error } = useAdminCourseAnalytics(30);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-24">
          <div className="text-center">
            <BookOpen className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load stats</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: 'Total Courses',
      value: analytics.overview.totalCourses,
      description: 'All courses in system',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Courses',
      value: analytics.overview.activeCourses,
      description: 'Published & available',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Pending Review',
      value: analytics.overview.pendingCourses,
      description: 'Awaiting approval',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Total Students',
      value: analytics.overview.totalEnrollments,
      description: 'Enrolled students',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="font-medium">
                  ${formatNumber(analytics.overview.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <span className="font-medium">{analytics.overview.totalTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg. per Transaction</span>
                <span className="font-medium">
                  ${analytics.overview.totalTransactions > 0 
                    ? formatNumber(analytics.overview.totalRevenue / analytics.overview.totalTransactions, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0.00'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Enrollment Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Enrollments</span>
                <span className="font-medium">{analytics.overview.activeEnrollments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-medium">{analytics.overview.completedEnrollments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-medium">
                  {analytics.overview.totalEnrollments > 0
                    ? formatNumber((analytics.overview.completedEnrollments / analytics.overview.totalEnrollments) * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : '0'
                  }%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Courses */}
      {analytics.topCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Courses</CardTitle>
            <CardDescription>
              Courses with the highest student enrollment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCourses.map((course, index) => (
                <div key={course.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        by {course.profiles.display_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{course.total_students} students</p>
                    <p className="text-xs text-muted-foreground">
                      ⭐ {course.average_rating ? formatNumber(course.average_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : 'N/A'} • {course.total_lessons} lessons
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Courses */}
      {analytics.pendingCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Courses Awaiting Review</CardTitle>
            <CardDescription>
              Courses submitted for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.pendingCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      by {course.profiles.display_name} • {course.profiles.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(course.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
