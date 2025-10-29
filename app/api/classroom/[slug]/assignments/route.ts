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

    // Get classroom ID and verify access
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Verify user has access to this classroom
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query - only get assignments for now, submissions can be joined if needed
    let query = supabase
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
      .eq('classroom_id', classroom.id)
      .eq('is_deleted', false);

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

    // Return assignments directly - submissions can be fetched separately if needed
    return NextResponse.json({
      assignments: assignments || [],
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
  
  console.log('📝 POST /api/classroom/[slug]/assignments - Starting');
  console.log('Slug:', slug);
  
  // Verify user authentication
  const authResult = await authorize(['student', 'tutor']);
  if (authResult instanceof NextResponse) {
    console.log('❌ Authorization failed');
    return authResult;
  }
  
  const userId = authResult.sub;
  console.log('✅ User authenticated:', userId);
  
  const supabase = await createAdminClient();

  try {
    const body = await request.json();
    const { title, description, due_date } = body;
    console.log('📦 Request body:', { title, description, due_date });

    // Validate required fields
    if (!title || !description || !due_date) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, due_date' 
      }, { status: 400 });
    }

    // Get user's profile ID (we need the integer id for classroom_member lookup)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', userId)
      .single();

    console.log('👤 Profile lookup:', { profile, profileError });

    if (profileError || !profile) {
      console.log('❌ User profile not found');
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    console.log('🏫 Classroom lookup:', { classroom, classroomError });

    if (classroomError || !classroom) {
      console.log('❌ Classroom not found');
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Verify user is owner or tutor
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    console.log('👥 Membership lookup:', { membership, membershipError });

    if (!membership || !['owner', 'tutor'].includes(membership.role)) {
      console.log('❌ Insufficient permissions. Role:', membership?.role);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate unique slug for this assignment within the classroom
    let baseSlug = generateSlug(title);
    let assignmentSlug = baseSlug;
    let counter = 1;

    // Check for slug uniqueness within the classroom
    while (true) {
      const { data: existingAssignment } = await supabase
        .from('classroom_assignment')
        .select('id')
        .eq('classroom_id', classroom.id)
        .eq('slug', assignmentSlug)
        .eq('is_deleted', false)
        .single();

      if (!existingAssignment) {
        break; // Slug is unique
      }

      // Append counter to make it unique
      assignmentSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    console.log('🔗 Generated assignment slug:', assignmentSlug);

    // Create assignment with only the required schema fields
    // Use user_id (UUID) for author_id, not profile.id (integer)
    const assignmentData = {
      classroom_id: classroom.id,
      author_id: profile.user_id, // Use UUID from auth, not integer id
      title,
      description,
      due_date,
      slug: assignmentSlug, // Unique slug for this assignment
      is_deleted: false,
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Creating assignment with data:', assignmentData);
    
    const { data: assignment, error } = await supabase
      .from('classroom_assignment')
      .insert(assignmentData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating assignment:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Assignment created successfully:', assignment);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating assignment:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json({ 
      error: 'Failed to create assignment',
      details: error?.message || 'Internal server error',
      code: error?.code
    }, { status: 500 });
  }
}
