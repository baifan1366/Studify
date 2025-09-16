// app/api/admin/courses/[courseId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/courses/[courseId] - Get specific course details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { courseId } = await params;
    const supabase = await createAdminClient();

    // Get course details with owner info and modules/lessons
    const { data: course, error } = await supabase
      .from('course')
      .select(`
        *,
        profiles!course_owner_id_fkey(
          id,
          display_name,
          email,
          avatar_url
        ),
        course_module(
          id,
          title,
          position,
          course_lesson(
            id,
            title,
            kind,
            duration_sec,
            is_preview
          )
        )
      `)
      .eq('public_id', courseId)
      .eq('is_deleted', false)
      .single();

    if (error || !course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Get enrollment statistics
    const { data: enrollmentStats } = await supabase
      .from('course_enrollment')
      .select('status')
      .eq('course_id', course.id);

    const stats = {
      totalEnrollments: enrollmentStats?.length || 0,
      activeEnrollments: enrollmentStats?.filter(e => e.status === 'active').length || 0,
      completedEnrollments: enrollmentStats?.filter(e => e.status === 'completed').length || 0,
    };

    return NextResponse.json({
      course,
      stats
    });

  } catch (error) {
    console.error('Admin course GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/courses/[courseId] - Update course (admin privileges)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { courseId } = await params;
    const updates = await request.json();
    const supabase = await createAdminClient();

    // Get current course data for audit log
    const { data: currentCourse } = await supabase
      .from('course')
      .select('*')
      .eq('public_id', courseId)
      .single();

    if (!currentCourse) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Update course
    const { data: updatedCourse, error } = await supabase
      .from('course')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('public_id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      return NextResponse.json({ message: 'Failed to update course' }, { status: 500 });
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'admin_update_course',
        subject_type: 'course',
        subject_id: currentCourse.id.toString(),
        meta: {
          course_title: currentCourse.title,
          course_public_id: courseId,
          previous_status: currentCourse.status,
          new_status: updates.status || currentCourse.status,
          changes: Object.keys(updates)
        }
      });

    return NextResponse.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });

  } catch (error) {
    console.error('Admin course PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/courses/[courseId] - Delete course (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { courseId } = await params;
    const supabase = await createAdminClient();

    // Get course info for audit log
    const { data: course } = await supabase
      .from('course')
      .select('*')
      .eq('public_id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Soft delete the course
    const { error } = await supabase
      .from('course')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('public_id', courseId);

    if (error) {
      console.error('Error deleting course:', error);
      return NextResponse.json({ message: 'Failed to delete course' }, { status: 500 });
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'admin_delete_course',
        subject_type: 'course',
        subject_id: course.id.toString(),
        meta: {
          course_title: course.title,
          course_public_id: courseId,
          deletion_reason: 'Admin deletion'
        }
      });

    return NextResponse.json({
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Admin course DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
