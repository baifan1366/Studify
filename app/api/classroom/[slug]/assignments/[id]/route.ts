import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .substring(0, 100); // Limit length
}

/**
 * Individual Assignment API
 * GET /api/classroom/[slug]/assignments/[id] - Get assignment details
 * PUT /api/classroom/[slug]/assignments/[id] - Update assignment (tutor/owner only)
 * DELETE /api/classroom/[slug]/assignments/[id] - Delete assignment (tutor/owner only)
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

    // Get assignment details (matching actual schema)
    const { data: assignment, error } = await supabase
      .from('classroom_assignment')
      .select(`
        id,
        public_id,
        classroom_id,
        author_id,
        title,
        description,
        due_date,
        slug,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('classroom_id', classroom.id)
      .eq('is_deleted', false)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
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
    const { title, description, due_date } = body;

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify permissions
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

    // Update assignment with schema-matched fields
    const updateData: any = {};
    
    if (title) {
      updateData.title = title;
      
      // Generate new slug if title is being updated
      let baseSlug = generateSlug(title);
      let assignmentSlug = baseSlug;
      let counter = 1;

      // Check for slug uniqueness within the classroom (excluding current assignment)
      while (true) {
        const { data: existingAssignment } = await supabase
          .from('classroom_assignment')
          .select('id')
          .eq('classroom_id', classroom.id)
          .eq('slug', assignmentSlug)
          .neq('id', id) // Exclude current assignment
          .eq('is_deleted', false)
          .single();

        if (!existingAssignment) {
          break; // Slug is unique
        }

        // Append counter to make it unique
        assignmentSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      updateData.slug = assignmentSlug;
    }
    
    if (description) updateData.description = description;
    if (due_date) updateData.due_date = due_date;

    const { data: assignment, error } = await supabase
      .from('classroom_assignment')
      .update(updateData)
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

    // Verify permissions
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

    // Soft delete assignment (set is_deleted flag instead of hard delete)
    const { error } = await supabase
      .from('classroom_assignment')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('classroom_id', classroom.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
