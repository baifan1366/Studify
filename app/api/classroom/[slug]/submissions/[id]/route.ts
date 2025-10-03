import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Individual Submission API
 * GET /api/classroom/[slug]/submissions/[id] - Get submission details
 * PUT /api/classroom/[slug]/submissions/[id] - Update submission (student before deadline, or tutor for grading)
 * DELETE /api/classroom/[slug]/submissions/[id] - Delete submission (student before deadline only)
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  
  // Verify user authentication
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult.sub;
  const supabase = await createAdminClient();

  try {
    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get classroom and verify access
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    const userRole = classroom.classroom_member[0]?.role;
    const isOwnerOrTutor = ['owner', 'tutor'].includes(userRole);

    // Get submission with assignment details
    let query = supabase
      .from('classroom_submission')
      .select(`
        id,
        assignment_id,
        student_id,
        content,
        submitted_at,
        grade,
        feedback,
        classroom_assignment!classroom_submission_assignment_id_fkey (
          id,
          title,
          description,
          due_date,
          classroom_id
        ),
        profiles!classroom_submission_student_id_fkey (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .eq('classroom_assignment.classroom_id', classroom.id);

    // If student, only allow viewing their own submissions
    if (!isOwnerOrTutor) {
      query = query.eq('student_id', profile.id);
    }

    const { data: submission, error } = await query.single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  
  // Verify user authentication
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult.sub;
  const supabase = await createAdminClient();

  try {
    const body = await request.json();
    const { content, grade, feedback } = body;

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get classroom and verify access
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    const userRole = classroom.classroom_member[0]?.role;
    const isOwnerOrTutor = ['owner', 'tutor'].includes(userRole);

    // Get existing submission with assignment details
    const { data: existingSubmission, error: submissionError } = await supabase
      .from('classroom_submission')
      .select(`
        id,
        assignment_id,
        student_id,
        content,
        submitted_at,
        grade,
        feedback,
        classroom_assignment!classroom_submission_assignment_id_fkey (
          id,
          due_date
        )
      `)
      .eq('id', id)
      .eq('classroom_assignment.classroom_id', classroom.id)
      .single();

    if (submissionError || !existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Determine update type and permissions
    const isGrading = grade !== undefined || feedback !== undefined;
    const isContentUpdate = content !== undefined;

    if (isGrading && !isOwnerOrTutor) {
      return NextResponse.json({ error: 'Only tutors and owners can grade submissions' }, { status: 403 });
    }

    if (isContentUpdate) {
      // Student updating their own submission
      if (existingSubmission.student_id !== profile.id) {
        return NextResponse.json({ error: 'Can only update your own submissions' }, { status: 403 });
      }

      // Check if deadline has passed
      const now = new Date();
      const deadline = new Date(existingSubmission.classroom_assignment[0]?.due_date);
      if (now > deadline) {
        return NextResponse.json({ error: 'Cannot update submission after deadline' }, { status: 400 });
      }
    }

    // Build update object
    const updateData: any = {};
    if (content !== undefined) {
      updateData.content = content;
      updateData.submitted_at = new Date().toISOString(); // Update submission time
    }
    if (grade !== undefined) updateData.grade = grade;
    if (feedback !== undefined) updateData.feedback = feedback;

    // Update submission
    const { data: submission, error } = await supabase
      .from('classroom_submission')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        assignment_id,
        student_id,
        content,
        submitted_at,
        grade,
        feedback
      `)
      .single();

    if (error) throw error;

    const message = isGrading ? 'Submission graded successfully' : 'Submission updated successfully';
    return NextResponse.json({ submission, message });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  
  // Verify user authentication
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult.sub;
  const supabase = await createAdminClient();

  try {
    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get classroom and verify access
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Get submission with assignment details
    const { data: submission, error: submissionError } = await supabase
      .from('classroom_submission')
      .select(`
        id,
        student_id,
        classroom_assignment!classroom_submission_assignment_id_fkey (
          due_date,
          classroom_id
        )
      `)
      .eq('id', id)
      .eq('classroom_assignment.classroom_id', classroom.id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Only allow student to delete their own submission
    if (submission.student_id !== profile.id) {
      return NextResponse.json({ error: 'Can only delete your own submissions' }, { status: 403 });
    }

    // Check if deadline has passed
    const now = new Date();
    const deadline = new Date(submission.classroom_assignment[0]?.due_date);
    if (now > deadline) {
      return NextResponse.json({ error: 'Cannot delete submission after deadline' }, { status: 400 });
    }

    // Delete submission
    const { error } = await supabase
      .from('classroom_submission')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
