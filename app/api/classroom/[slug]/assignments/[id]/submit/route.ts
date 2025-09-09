import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Assignment Submission API
 * POST /api/classroom/[slug]/assignments/[id]/submit - Submit assignment
 * PUT /api/classroom/[slug]/assignments/[id]/submit - Update submission (before deadline)
 */

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { answer, file_url } = body;

    // Verify classroom access and assignment exists
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(user_id)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', user.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Get assignment and check deadline
    const { data: assignment, error: assignmentError } = await supabase
      .from('classroom_assignment')
      .select('id, ends_at, title')
      .eq('id', id)
      .eq('classroom_id', classroom.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if deadline has passed
    const now = new Date();
    const deadline = new Date(assignment.ends_at);
    if (now > deadline) {
      return NextResponse.json({ error: 'Assignment deadline has passed' }, { status: 400 });
    }

    // Check if already submitted
    const { data: existingSubmission } = await supabase
      .from('classroom_submission')
      .select('id')
      .eq('assignment_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingSubmission) {
      return NextResponse.json({ error: 'Assignment already submitted. Use PUT to update.' }, { status: 400 });
    }

    // Create submission
    const { data: submission, error } = await supabase
      .from('classroom_submission')
      .insert({
        assignment_id: id,
        user_id: user.id,
        answer,
        file_url,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      .select()
      .single();

    if (error) throw error;

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
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { answer, file_url } = body;

    // Verify classroom access
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(user_id)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', user.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Get assignment and check deadline
    const { data: assignment } = await supabase
      .from('classroom_assignment')
      .select('id, ends_at')
      .eq('id', id)
      .eq('classroom_id', classroom.id)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if deadline has passed
    const now = new Date();
    const deadline = new Date(assignment.ends_at);
    if (now > deadline) {
      return NextResponse.json({ error: 'Cannot update submission after deadline' }, { status: 400 });
    }

    // Update submission
    const { data: submission, error } = await supabase
      .from('classroom_submission')
      .update({
        answer,
        file_url,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      .eq('assignment_id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      submission,
      message: 'Assignment submission updated successfully' 
    });

  } catch (error) {
    console.error('Error updating assignment submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
