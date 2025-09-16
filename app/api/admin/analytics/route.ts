// app/api/admin/analytics/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/analytics - Get system analytics and statistics
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const supabase = await createAdminClient();

    // Get user statistics
    const [
      { data: totalUsers },
      { data: newUsers },
      { data: activeUsers },
      { data: bannedUsers }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false),
      
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false)
        .gte('created_at', startDate.toISOString()),
      
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false)
        .eq('status', 'active'),
      
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false)
        .eq('status', 'banned')
    ]);

    // Get content statistics
    const [
      { data: totalCourses },
      { data: totalClassrooms },
      { data: totalCommunityPosts },
      { data: totalEnrollments }
    ] = await Promise.all([
      supabase
        .from('course')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false),
      
      supabase
        .from('classroom')
        .select('id', { count: 'exact' }),
      
      supabase
        .from('community_post')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false),
      
      supabase
        .from('course_enrollment')
        .select('id', { count: 'exact' })
    ]);

    // Get recent activity from audit log
    const { data: recentActivity } = await supabase
      .from('audit_log')
      .select(`
        id,
        action,
        subject_type,
        created_at,
        meta,
        profiles!audit_log_actor_id_fkey(display_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get role distribution
    const { data: roleDistribution } = await supabase
      .from('profiles')
      .select('role')
      .eq('is_deleted', false);

    const roleCounts = roleDistribution?.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get daily user registrations for the period
    const { data: dailyRegistrations } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Group registrations by day
    const registrationsByDay = dailyRegistrations?.reduce((acc: Record<string, number>, user) => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      userStats: {
        total: totalUsers?.length || 0,
        new: newUsers?.length || 0,
        active: activeUsers?.length || 0,
        banned: bannedUsers?.length || 0,
        roleDistribution: roleCounts
      },
      contentStats: {
        courses: totalCourses?.length || 0,
        classrooms: totalClassrooms?.length || 0,
        communityPosts: totalCommunityPosts?.length || 0,
        enrollments: totalEnrollments?.length || 0
      },
      recentActivity: recentActivity || [],
      dailyRegistrations: registrationsByDay,
      period: parseInt(period)
    });

  } catch (error) {
    console.error('Admin analytics GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
