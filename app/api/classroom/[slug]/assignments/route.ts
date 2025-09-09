import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Classroom Assignments API
 * GET /api/classroom/[slug]/assignments - Get all assignments for classroom
 * POST /api/classroom/[slug]/assignments - Create new assignment (tutor/owner only)
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'upcoming', 'ongoing', 'completed'
  const limit = parseInt(searchParams.get('limit') || '10');
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

    // Get classroom ID and verify access
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

    // Build query
    let query = supabase
      .from('classroom_assignment')
      .select(`
        *,
        classroom_submission(
          id,
          submitted_at,
          grade,
          feedback
        )
      `)
      .eq('classroom_id', classroom.id)
      .eq('classroom_submission.student_id', profile.id);

    // Apply status filter based on due_date
    const now = new Date().toISOString();
    if (status === 'upcoming') {
      query = query.gt('due_date', now);
    } else if (status === 'ongoing') {
      query = query.lte('due_date', now);
    } else if (status === 'completed') {
      query = query.lt('due_date', now);
    }

    const { data: assignments, error } = await query
      .order('due_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to include submission status
    const transformedAssignments = assignments?.map(assignment => ({
      ...assignment,
      submission_status: assignment.classroom_submission?.[0] || null,
      classroom_submission: undefined // Remove from response
    })) || [];

    return NextResponse.json({
      assignments: transformedAssignments,
      pagination: {
        limit,
        offset,
        has_more: assignments?.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
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
    const { title, description, content, starts_at, ends_at, total_points, settings } = body;

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify user is owner or tutor
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom || !['owner', 'tutor'].includes(classroom.classroom_member[0]?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('classroom_assignment')
      .insert({
        classroom_id: classroom.id,
        title,
        description,
        due_date: ends_at,
        author_id: profile.id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
