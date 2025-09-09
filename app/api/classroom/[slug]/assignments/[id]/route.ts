import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Individual Assignment API
 * GET /api/classroom/[slug]/assignments/[id] - Get assignment details
 * PUT /api/classroom/[slug]/assignments/[id] - Update assignment (tutor/owner only)
 * DELETE /api/classroom/[slug]/assignments/[id] - Delete assignment (tutor/owner only)
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get classroom and verify access
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', user.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Get assignment with submission status
    const { data: assignment, error } = await supabase
      .from('classroom_assignment')
      .select(`
        *,
        classroom_submission(
          id,
          answer,
          file_url,
          submitted_at,
          score,
          feedback,
          status,
          graded_at,
          graded_by
        )
      `)
      .eq('id', id)
      .eq('classroom_id', classroom.id)
      .eq('classroom_submission.user_id', user.id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Transform response
    const response = {
      ...assignment,
      user_submission: assignment.classroom_submission?.[0] || null,
      classroom_submission: undefined
    };

    return NextResponse.json({ assignment: response });
  } catch (error) {
    console.error('Error fetching assignment:', error);
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
    const { title, description, content, starts_at, ends_at, total_points, settings } = body;

    // Verify permissions
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', user.id)
      .single();

    if (!classroom || !['owner', 'tutor'].includes(classroom.classroom_member[0]?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update assignment
    const { data: assignment, error } = await supabase
      .from('classroom_assignment')
      .update({
        title,
        description,
        content,
        starts_at,
        ends_at,
        total_points,
        settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('classroom_id', classroom.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const supabase = await createServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify permissions
    const { data: classroom } = await supabase
      .from('classroom')
      .select(`
        id,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', user.id)
      .single();

    if (!classroom || !['owner', 'tutor'].includes(classroom.classroom_member[0]?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete assignment (cascade will handle submissions)
    const { error } = await supabase
      .from('classroom_assignment')
      .delete()
      .eq('id', id)
      .eq('classroom_id', classroom.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
