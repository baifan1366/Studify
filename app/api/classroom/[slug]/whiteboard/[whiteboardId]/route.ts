import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// GET - Get specific whiteboard details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; whiteboardId: string }> }
) {
  try {
    const { slug, whiteboardId } = await params;
    const authResult = await authorize('student');
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

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
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

    // Get whiteboard with session info
    const { data: whiteboard, error: whiteboardError } = await supabase
      .from('classroom_whiteboard_session')
      .select(`
        id,
        public_id,
        session_id,
        title,
        created_at,
        updated_at,
        classroom_live_session (
          id,
          session_name,
          status,
          classroom_id
        )
      `)
      .eq('id', whiteboardId)
      .eq('is_deleted', false)
      .single();

    if (whiteboardError || !whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    // Verify whiteboard belongs to this classroom
    const session = whiteboard.classroom_live_session?.[0];
    if (!session || session.classroom_id !== classroom.id) {
      return NextResponse.json({ error: 'Whiteboard not found in this classroom' }, { status: 404 });
    }

    return NextResponse.json(whiteboard);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/whiteboard/[whiteboardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update whiteboard metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; whiteboardId: string }> }
) {
  try {
    const { slug, whiteboardId } = await params;
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user is a member of the classroom and get their role
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user can update whiteboards (tutor in classroom or global tutor)
    const isClassroomTutor = membership.role === 'tutor';
    const isGlobalTutor = profile.role === 'tutor';
    
    if (!isClassroomTutor && !isGlobalTutor) {
      return NextResponse.json({ error: 'Access denied. Only tutors can update whiteboards.' }, { status: 403 });
    }

    // Verify whiteboard exists and belongs to this classroom
    const { data: whiteboard, error: whiteboardError } = await supabase
      .from('classroom_whiteboard_session')
      .select(`
        id,
        classroom_live_session (
          classroom_id
        )
      `)
      .eq('id', whiteboardId)
      .eq('is_deleted', false)
      .single();

    if (whiteboardError || !whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    const session = whiteboard.classroom_live_session?.[0];
    if (!session || session.classroom_id !== classroom.id) {
      return NextResponse.json({ error: 'Whiteboard not found in this classroom' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { title } = body;

    // Update whiteboard
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    const { data: updatedWhiteboard, error: updateError } = await supabase
      .from('classroom_whiteboard_session')
      .update(updateData)
      .eq('id', whiteboardId)
      .select(`
        id,
        public_id,
        session_id,
        title,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating whiteboard:', updateError);
      return NextResponse.json({ error: 'Failed to update whiteboard' }, { status: 500 });
    }

    return NextResponse.json(updatedWhiteboard);

  } catch (error) {
    console.error('Error in PATCH /api/classroom/[slug]/whiteboard/[whiteboardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete whiteboard (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; whiteboardId: string }> }
) {
  try {
    const { slug, whiteboardId } = await params;
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user is a member of the classroom and get their role
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user can delete whiteboards (tutor in classroom or global tutor)
    const isClassroomTutor = membership.role === 'tutor';
    const isGlobalTutor = profile.role === 'tutor';
    
    if (!isClassroomTutor && !isGlobalTutor) {
      return NextResponse.json({ error: 'Access denied. Only tutors can delete whiteboards.' }, { status: 403 });
    }

    // Verify whiteboard exists and belongs to this classroom
    const { data: whiteboard, error: whiteboardError } = await supabase
      .from('classroom_whiteboard_session')
      .select(`
        id,
        classroom_live_session (
          classroom_id
        )
      `)
      .eq('id', whiteboardId)
      .eq('is_deleted', false)
      .single();

    if (whiteboardError || !whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 });
    }

    const session = whiteboard.classroom_live_session?.[0];
    if (!session || session.classroom_id !== classroom.id) {
      return NextResponse.json({ error: 'Whiteboard not found in this classroom' }, { status: 404 });
    }

    // Soft delete whiteboard
    const { error: deleteError } = await supabase
      .from('classroom_whiteboard_session')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', whiteboardId);

    if (deleteError) {
      console.error('Error deleting whiteboard:', deleteError);
      return NextResponse.json({ error: 'Failed to delete whiteboard' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Whiteboard deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/classroom/[slug]/whiteboard/[whiteboardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
