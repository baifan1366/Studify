import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Classroom Submissions API
 * GET /api/classroom/[slug]/submissions - Get all submissions for classroom (tutor/owner only)
 * POST /api/classroom/[slug]/submissions - Create new submission (students only)
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignment_id');
  const studentId = searchParams.get('student_id');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Verify user authentication
  const authResult = await authorize('student');
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

    // Build query based on user role
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
        attachments_id,
        classroom_assignment!classroom_submission_assignment_id_fkey (
          id,
          title,
          due_date,
          classroom_id
        ),
        profiles!classroom_submission_student_id_fkey (
          id,
          display_name,
          email
        ),
        classroom_attachments!classroom_submission_attachments_id_fkey (
          id,
          file_name,
          file_url,
          mime_type,
          size_bytes,
          created_at
        )
      `)
      .eq('classroom_assignment.classroom_id', classroom.id);

    // Apply filters
    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    // If student, only show their own submissions
    if (!isOwnerOrTutor) {
      query = query.eq('student_id', profile.id);
    }

    const { data: submissions, error } = await query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      submissions: submissions || [],
      pagination: {
        limit,
        offset,
        has_more: submissions?.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Verify user authentication
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult.sub;
  const supabase = await createAdminClient();

  try {
    const body = await request.json();
    const { assignment_id, content, attachment_ids = [] } = body;

    // Validate required fields
    if (!assignment_id || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: assignment_id, content' 
      }, { status: 400 });
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
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Get assignment and verify it belongs to the classroom
    const { data: assignment, error: assignmentError } = await supabase
      .from('classroom_assignment')
      .select('id, title, due_date')
      .eq('id', assignment_id)
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
      .eq('assignment_id', assignment_id)
      .eq('student_id', profile.id)
      .single();

    if (existingSubmission) {
      return NextResponse.json({ 
        error: 'Assignment already submitted. Use PUT to update.' 
      }, { status: 400 });
    }

    // Create submission
    const { data: submission, error } = await supabase
      .from('classroom_submission')
      .insert({
        assignment_id,
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
        feedback,
        attachments_id
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      submission,
      message: 'Assignment submitted successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
