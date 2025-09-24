// app/api/admin/courses/[courseId]/approve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { handleCourseApprovalAutoCreation } from '@/lib/auto-creation/course-approval-flow';

// POST /api/admin/courses/[courseId]/approve - Approve a pending course
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { courseId } = await params;
    const { notes } = await request.json();
    const supabase = await createAdminClient();

    // Get course details with owner profile
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select(`
        *,
        owner:profiles!course_owner_id_fkey(id, user_id, display_name)
      `)
      .eq('public_id', courseId)
      .eq('is_deleted', false)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Update course status to active
    const { data: updatedCourse, error: updateError } = await supabase
      .from('course')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('public_id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving course:', updateError);
      return NextResponse.json({ message: 'Failed to approve course' }, { status: 500 });
    }

    // Handle auto-creation of classroom and community
    const autoCreationResult = await handleCourseApprovalAutoCreation(
      course.id,
      course.title,
      course.slug,
      course.owner_id,
      course.auto_create_classroom || false,
      course.auto_create_community || false
    );

    console.log('[CourseApproval] Auto-creation result:', autoCreationResult);

    // Log the approval action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'approve_course',
        subject_type: 'course',
        subject_id: course.id.toString(),
        meta: {
          course_title: course.title,
          course_public_id: courseId,
          previous_status: course.status,
          approval_notes: notes || null
        }
      });

    return NextResponse.json({
      message: 'Course approved successfully',
      course: updatedCourse,
      autoCreation: {
        classroomCreated: autoCreationResult.classroomCreated,
        communityCreated: autoCreationResult.communityCreated,
        success: autoCreationResult.success,
        errors: autoCreationResult.errors
      }
    });

  } catch (error) {
    console.error('Course approval error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/courses/[courseId]/reject - Reject a pending course
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
    const { reason, rejected_message } = await request.json();
    const rejectionReason = rejected_message || reason;

    if (!rejectionReason) {
      return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('*')
      .eq('public_id', courseId)
      .eq('is_deleted', false)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Update course status to inactive with rejection message
    const { data: updatedCourse, error: updateError } = await supabase
      .from('course')
      .update({
        status: 'inactive',
        rejected_message: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('public_id', courseId)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting course:', updateError);
      return NextResponse.json({ message: 'Failed to reject course' }, { status: 500 });
    }

    // Log the rejection action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'reject_course',
        subject_type: 'course',
        subject_id: course.id.toString(),
        meta: {
          course_title: course.title,
          course_public_id: courseId,
          previous_status: course.status,
          rejection_reason: rejectionReason
        }
      });

    return NextResponse.json({
      message: 'Course rejected successfully',
      course: updatedCourse
    });

  } catch (error) {
    console.error('Course rejection error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
