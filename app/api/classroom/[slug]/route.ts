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
    const authResult = await authorize(['student', 'tutor']);
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
        color,
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

    console.log('📖 [GET] Classroom fetched:', {
      slug,
      classroomId: classroom?.id,
      color: classroom?.color,
      hasColor: !!classroom?.color
    });

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

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields if they exist in the request body
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.color !== undefined) updateData.color = body.color;

    console.log('📝 [PUT] Updating classroom:', {
      slug,
      classroomId: classroom.id,
      updateData,
      hasColorUpdate: body.color !== undefined,
      newColor: body.color
    });

    // Update classroom
    const { data: updatedClassroom, error: updateError } = await supabase
      .from('classroom')
      .update(updateData)
      .eq('id', classroom.id)
      .select('id, public_id, slug, name, description, color, updated_at')
      .single();

    if (updateError) {
      console.error('❌ [PUT] Error updating classroom:', updateError);
      return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
    }

    console.log('✅ [PUT] Classroom updated successfully:', {
      classroomId: updatedClassroom.id,
      slug: updatedClassroom.slug,
      newColor: updatedClassroom.color,
      colorUpdated: body.color !== undefined && updatedClassroom.color === body.color
    });

    return NextResponse.json(updatedClassroom);

  } catch (error) {
    console.error('Error in PUT /api/classroom/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete classroom (soft delete)
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

    // Check if user is the owner
    if (classroom.owner_id !== profile.id) {
      return NextResponse.json({ error: 'Only the owner can delete the classroom' }, { status: 403 });
    }

    console.log('🗑️ [DELETE] Deleting classroom:', {
      slug,
      classroomId: classroom.id,
      ownerId: profile.id
    });

    // Soft delete the classroom
    const { data: deletedClassroom, error: deleteError } = await supabase
      .from('classroom')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', classroom.id)
      .select()
      .single();

    if (deleteError) {
      console.error('❌ [DELETE] Error deleting classroom:', deleteError);
      return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
    }

    console.log('✅ [DELETE] Classroom deleted successfully:', {
      classroomId: deletedClassroom.id,
      slug: deletedClassroom.slug
    });

    return NextResponse.json({ 
      message: 'Classroom deleted successfully',
      classroom: deletedClassroom 
    });

  } catch (error) {
    console.error('Error in DELETE /api/classroom/[slug]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
