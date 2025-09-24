import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Assignment Submission API
 * POST /api/classroom/[slug]/assignments/[id]/submit - Submit assignment
 * PUT /api/classroom/[slug]/assignments/[id]/submit - Update submission (before deadline)
 */

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
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
    const { content, attachment_ids = [] } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Since attachments_id is a single field, we'll use the first attachment ID if provided
    const attachmentId = attachment_ids.length > 0 ? attachment_ids[0] : null;

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify classroom access and assignment exists
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(user_id)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Get assignment and check deadline (using correct schema field)
    const { data: assignment, error: assignmentError } = await supabase
      .from('classroom_assignment')
      .select('id, due_date, title')
      .eq('id', id)
      .eq('classroom_id', classroom.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if deadline has passed
    const now = new Date();
    const deadline = new Date(assignment.due_date);
    if (now > deadline) {
      return NextResponse.json({ error: 'Assignment deadline has passed' }, { status: 400 });
    }

    // Check if already submitted
    const { data: existingSubmission } = await supabase
      .from('classroom_submission')
      .select('id')
      .eq('assignment_id', id)
      .eq('student_id', profile.id)
      .single();

    if (existingSubmission) {
      return NextResponse.json({ 
        error: 'Assignment already submitted. Use PUT to update.' 
      }, { status: 400 });
    }

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('classroom_submission')
      .insert({
        assignment_id: id,
        student_id: profile.id,
        content,
        submitted_at: new Date().toISOString(),
        attachments_id: attachmentId
      })
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

    if (submissionError) throw submissionError;

    return NextResponse.json({ 
      submission,
      message: 'Assignment submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { content, attachment_ids = [] } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Since attachments_id is a single field, we'll use the first attachment ID if provided
    const attachmentId = attachment_ids.length > 0 ? attachment_ids[0] : null;

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify classroom access
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(user_id)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Get assignment and check deadline (using correct schema field)
    const { data: assignment } = await supabase
      .from('classroom_assignment')
      .select('id, due_date')
      .eq('id', id)
      .eq('classroom_id', classroom.id)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if deadline has passed
    const now = new Date();
    const deadline = new Date(assignment.due_date);
    if (now > deadline) {
      return NextResponse.json({ error: 'Cannot update submission after deadline' }, { status: 400 });
    }

    // Update existing submission
    const { data: submission, error: updateError } = await supabase
      .from('classroom_submission')
      .update({
        content,
        submitted_at: new Date().toISOString(),
        attachments_id: attachmentId
      })
      .eq('assignment_id', id)
      .eq('student_id', profile.id)
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

    if (updateError) throw updateError;

    return NextResponse.json({ 
      submission,
      message: 'Assignment submission updated successfully'
    });

  } catch (error) {
    console.error('Error updating assignment submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
