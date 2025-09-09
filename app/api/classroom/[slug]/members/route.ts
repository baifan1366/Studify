import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Classroom Members API
 * GET /api/classroom/[slug]/members - Get all classroom members
 * POST /api/classroom/[slug]/members - Add member to classroom (owner/tutor only)
 * DELETE /api/classroom/[slug]/members/[userId] - Remove member (owner/tutor only)
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role'); // Filter by role: 'student', 'tutor', 'owner'
  
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
        name,
        classroom_member!classroom_member_classroom_id_fkey!inner(role)
      `)
      .eq('slug', slug)
      .eq('classroom_member.user_id', profile.id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 });
    }

    // Build members query
    let query = supabase
      .from('classroom_member')
      .select(`
        id,
        role,
        joined_at,
        profiles!classroom_member_user_id_fkey(
          user_id,
          email,
          display_name,
          avatar_url
        )
      `)
      .eq('classroom_id', classroom.id);

    if (role) {
      query = query.eq('role', role);
    }

    const { data: members, error } = await query.order('joined_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      classroom: {
        id: classroom.id,
        name: classroom.name
      },
      members: members || [],
      user_role: classroom.classroom_member[0]?.role
    });
  } catch (error) {
    console.error('Error fetching classroom members:', error);
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
    const { email, role = 'student' } = body;

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

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', targetUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this classroom' }, { status: 400 });
    }

    // Add member
    const { data: member, error } = await supabase
      .from('classroom_member')
      .insert({
        classroom_id: classroom.id,
        user_id: targetUser.id,
        role,
        joined_at: new Date().toISOString()
      })
      .select(`
        user_id,
        role,
        joined_at,
        profiles!classroom_member_user_id_fkey(
          user_id,
          email,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      member,
      message: 'Member added successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding classroom member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
