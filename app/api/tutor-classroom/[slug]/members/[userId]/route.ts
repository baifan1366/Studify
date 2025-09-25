import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Individual Member Management API
 * PUT /api/classroom/[slug]/members/[userId] - Update member role (owner/tutor only)
 * DELETE /api/classroom/[slug]/members/[userId] - Remove member (owner/tutor only)
 */

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;
  
  // Verify user authentication
  const authResult = await authorize('tutor');
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const currentUserId = authResult.sub;
  const supabase = await createAdminClient();

  try {
    const body = await request.json();
    const { role } = body;

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', currentUserId)
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

    // Update member role
    const { data: member, error } = await supabase
      .from('classroom_member')
      .update({ role })
      .eq('classroom_id', classroom.id)
      .eq('user_id', userId)
      .select(`
        id,
        role,
        joined_at,
        profiles(
          user_id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      member,
      message: 'Member role updated successfully' 
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;
  
  // Verify user authentication
  const authResult = await authorize('tutor');
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const currentUserId = authResult.sub;
  const supabase = await createAdminClient();

  try {
    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', currentUserId)
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

    // Cannot remove the owner
    const { data: targetMember } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', userId)
      .single();

    if (targetMember?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove classroom owner' }, { status: 400 });
    }

    // Remove member
    const { error } = await supabase
      .from('classroom_member')
      .delete()
      .eq('classroom_id', classroom.id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ message: 'Member removed successfully' });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
