// app/api/admin/courses/analytics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/courses/analytics - Get course analytics and statistics
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30'); // days
    const supabase = await createAdminClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    // Get course statistics
    const [
      totalCoursesResult,
      coursesByStatusResult,
      coursesByCategoryResult,
      recentCoursesResult,
      enrollmentStatsResult,
      revenueStatsResult
    ] = await Promise.all([
      // Total courses
      supabase
        .from('course')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),

      // Courses by status
      supabase
        .from('course')
        .select('status')
        .eq('is_deleted', false),

      // Courses by category
      supabase
        .from('course')
        .select('category')
        .eq('is_deleted', false)
        .not('category', 'is', null),

      // Recent courses (last 30 days)
      supabase
        .from('course')
        .select(`
          id,
          title,
          status,
          created_at,
          profiles!course_owner_id_fkey(display_name)
        `)
        .eq('is_deleted', false)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Enrollment statistics
      supabase
        .from('course_enrollment')
        .select('course_id, status, created_at')
        .gte('created_at', startDate.toISOString()),

      // Revenue statistics (if applicable)
      supabase
        .from('course_payment')
        .select('amount_cents, currency, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed')
    ]);

    // Process course status distribution
    const statusDistribution = coursesByStatusResult.data?.reduce((acc: any, course: any) => {
      acc[course.status] = (acc[course.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Process category distribution
    const categoryDistribution = coursesByCategoryResult.data?.reduce((acc: any, course: any) => {
      if (course.category) {
        acc[course.category] = (acc[course.category] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    // Process enrollment statistics
    const enrollmentStats = enrollmentStatsResult.data?.reduce((acc: any, enrollment: any) => {
      acc.total = (acc.total || 0) + 1;
      acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Process revenue statistics
    const revenueStats = revenueStatsResult.data?.reduce((acc: any, payment: any) => {
      acc.totalRevenue = (acc.totalRevenue || 0) + payment.amount_cents;
      acc.totalTransactions = (acc.totalTransactions || 0) + 1;
      return acc;
    }, { totalRevenue: 0, totalTransactions: 0 }) || {};

    // Get top performing courses
    const { data: topCourses } = await supabase
      .from('course')
      .select(`
        id,
        title,
        total_students,
        average_rating,
        total_lessons,
        profiles!course_owner_id_fkey(display_name)
      `)
      .eq('is_deleted', false)
      .eq('status', 'active')
      .order('total_students', { ascending: false })
      .limit(5);

    // Get courses needing review (pending status)
    const { data: pendingCourses } = await supabase
      .from('course')
      .select(`
        id,
        public_id,
        title,
        created_at,
        profiles!course_owner_id_fkey(display_name, email)
      `)
      .eq('is_deleted', false)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    return NextResponse.json({
      overview: {
        totalCourses: totalCoursesResult.count || 0,
        activeCourses: statusDistribution.active || 0,
        pendingCourses: statusDistribution.pending || 0,
        inactiveCourses: statusDistribution.inactive || 0,
        totalEnrollments: enrollmentStats.total || 0,
        activeEnrollments: enrollmentStats.active || 0,
        completedEnrollments: enrollmentStats.completed || 0,
        totalRevenue: revenueStats.totalRevenue / 100, // Convert cents to currency
        totalTransactions: revenueStats.totalTransactions
      },
      distributions: {
        status: statusDistribution,
        category: categoryDistribution
      },
      recentCourses: recentCoursesResult.data || [],
      topCourses: topCourses || [],
      pendingCourses: pendingCourses || [],
      period
    });

  } catch (error) {
    console.error('Course analytics error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
