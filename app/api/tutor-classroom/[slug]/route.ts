import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export const runtime = 'nodejs';

// GET - Get classroom details by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get classroom by slug
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select(`
        id,
        public_id,
        name,
        description,
        slug,
        created_at,
        classroom_member!classroom_member_classroom_id_fkey (
          id,
          role,
          joined_at,
          profiles!classroom_member_user_id_fkey (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      console.error('Classroom not found for slug:', slug);
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user is a member of the classroom
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Add user's membership info to the response
    const response = {
      ...classroom,
      userMembership: membership
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update classroom details (for instructors/admins only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('tutor'); // Only tutors can update classrooms
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();
    const body = await request.json();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get classroom by slug
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user has permission to update (is instructor/admin of this classroom)
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership || membership.role !== 'tutor') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update classroom
    const { data: updatedClassroom, error: updateError } = await supabase
      .from('classroom')
      .update({
        name: body.name,
        description: body.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', classroom.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating classroom:', updateError);
      return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
    }

    return NextResponse.json(updatedClassroom);

  } catch (error) {
    console.error('Error in PUT /api/classroom/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete classroom (for owners only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get classroom by slug
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user is the owner of this classroom
    if (classroom.owner_id !== profile.id) {
      return NextResponse.json({ error: 'Only classroom owners can delete classrooms' }, { status: 403 });
    }

    // Delete all classroom members first (due to foreign key constraints)
    const { error: deleteMembersError } = await supabase      
      .from("classroom_member")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("classroom_id", classroom.id);

    if (deleteMembersError) {
      console.error('Error deleting classroom members:', deleteMembersError);
      return NextResponse.json({ error: 'Failed to delete classroom members' }, { status: 500 });
    }

    // Delete the classroom
    const { error: deleteClassroomError } = await supabase
      .from('classroom')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', classroom.id);

    if (deleteClassroomError) {
      console.error('Error deleting classroom:', deleteClassroomError);
      return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Classroom deleted successfully' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/classroom/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}