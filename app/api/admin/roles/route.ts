// app/api/admin/roles/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/roles - Get role statistics and permissions
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = await createAdminClient();

    // Get role statistics
    const { data: roleStats, error: statsError } = await supabase
      .from('profiles')
      .select('role')
      .eq('is_deleted', false);

    if (statsError) {
      console.error('Error fetching role stats:', statsError);
      return NextResponse.json({ message: 'Failed to fetch role statistics' }, { status: 500 });
    }

    // Count users by role
    const roleCounts = roleStats.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    // Define role permissions
    const rolePermissions = {
      admin: {
        name: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: [
          'manage_users',
          'manage_roles',
          'view_analytics',
          'manage_content',
          'manage_courses',
          'manage_community',
          'manage_classrooms',
          'view_reports',
          'ban_users',
          'send_announcements',
          'access_audit_logs'
        ]
      },
      tutor: {
        name: 'Tutor',
        description: 'Can create and manage courses, classrooms, and teach students',
        permissions: [
          'create_courses',
          'manage_own_courses',
          'create_classrooms',
          'manage_own_classrooms',
          'grade_assignments',
          'view_student_progress',
          'create_live_sessions',
          'manage_course_content',
          'respond_to_discussions'
        ]
      },
      student: {
        name: 'Student',
        description: 'Can enroll in courses, join classrooms, and participate in community',
        permissions: [
          'enroll_courses',
          'join_classrooms',
          'submit_assignments',
          'take_quizzes',
          'participate_community',
          'create_posts',
          'comment_posts',
          'attend_live_sessions',
          'track_progress'
        ]
      }
    };

    return NextResponse.json({
      roleStats: {
        admin: roleCounts.admin || 0,
        tutor: roleCounts.tutor || 0,
        student: roleCounts.student || 0,
        total: roleStats.length
      },
      rolePermissions
    });

  } catch (error) {
    console.error('Admin roles GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/roles/bulk-update - Bulk update user roles
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { userIds, newRole, reason } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ message: 'userIds array is required' }, { status: 400 });
    }

    if (!newRole || !['admin', 'student', 'tutor'].includes(newRole)) {
      return NextResponse.json({ message: 'Valid newRole is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Get current user data
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select('id, user_id, role, display_name, email')
      .in('user_id', userIds)
      .eq('is_deleted', false);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' }, { status: 404 });
    }

    // Update all users
    const { data: updatedUsers, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .in('id', users.map(u => u.id))
      .select();

    if (updateError) {
      console.error('Error updating user roles:', updateError);
      return NextResponse.json({ message: 'Failed to update user roles' }, { status: 500 });
    }

    // Log all actions
    const auditEntries = users.map(user => ({
      actor_id: authResult.user.profile?.id,
      action: 'bulk_role_change',
      subject_type: 'profile',
      subject_id: user.id.toString(),
      meta: {
        previous_role: user.role,
        new_role: newRole,
        reason: reason || 'Bulk role update',
        target_user_id: user.user_id,
        bulk_operation: true
      }
    }));

    await supabase
      .from('audit_log')
      .insert(auditEntries);

    return NextResponse.json({
      message: `Successfully updated ${updatedUsers?.length || 0} users to ${newRole} role`,
      updatedUsers: updatedUsers?.length || 0
    });

  } catch (error) {
    console.error('Admin roles POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
