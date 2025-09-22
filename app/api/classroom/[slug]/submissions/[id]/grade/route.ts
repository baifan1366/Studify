import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Submission Grading API
 * PUT /api/classroom/[slug]/submissions/[id]/grade - Grade a submission (tutor/owner only)
 */

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  
  // Verify user authentication
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult.sub;
  const supabase = await createAdminClient();

  try {
    const body = await request.json();
    const { grade, feedback } = body;

    // Validate required fields
    if (grade === undefined || grade === null) {
      return NextResponse.json({ 
        error: 'Grade is required' 
      }, { status: 400 });
    }

    if (typeof grade !== 'number' || grade < 0 || grade > 100) {
      return NextResponse.json({ 
        error: 'Grade must be a number between 0 and 100' 
      }, { status: 400 });
    }

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user is tutor or owner
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
    if (!['owner', 'tutor'].includes(userRole)) {
      return NextResponse.json({ error: 'Only tutors and owners can grade submissions' }, { status: 403 });
    }

    // Get submission and verify it belongs to the classroom
    const { data: submission, error: submissionError } = await supabase
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
          classroom_id
        ),
        profiles!classroom_submission_student_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .eq('id', id)
      .eq('classroom_assignment.classroom_id', classroom.id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Update submission with grade and feedback
    const { data: gradedSubmission, error } = await supabase
      .from('classroom_submission')
      .update({
        grade,
        feedback: feedback || null
      })
      .eq('id', id)
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
          title
        ),
        profiles!classroom_submission_student_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      submission: gradedSubmission,
      message: 'Submission graded successfully' 
    });

  } catch (error) {
    console.error('Error grading submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
