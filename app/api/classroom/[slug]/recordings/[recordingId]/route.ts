import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// GET - Get specific recording details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; recordingId: string }> }
) {
  try {
    const { slug, recordingId } = await params;
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

    // Get recording with session info
    const { data: recording, error: recordingError } = await supabase
      .from('classroom_recording')
      .select(`
        id,
        public_id,
        session_id,
        url,
        duration_sec,
        created_at,
        classroom_live_session!classroom_recording_session_id_fkey (
          id,
          session_name,
          status,
          classroom_id
        )
      `)
      .eq('id', recordingId)
      .eq('is_deleted', false)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Verify recording belongs to this classroom
    const session = recording.classroom_live_session?.[0];
    if (!session || session.classroom_id !== classroom.id) {
      return NextResponse.json({ error: 'Recording not found in this classroom' }, { status: 404 });
    }

    return NextResponse.json(recording);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/recordings/[recordingId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete recording (only tutors)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; recordingId: string }> }
) {
  try {
    const { slug, recordingId } = await params;
    const authResult = await authorize('tutor'); // Only tutors can delete recordings
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

    // Check if user is a tutor of the classroom
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .eq('role', 'tutor')
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied. Only tutors can delete recordings.' }, { status: 403 });
    }

    // Get recording to verify ownership and get file path
    const { data: recording, error: recordingError } = await supabase
      .from('classroom_recording')
      .select(`
        id,
        url,
        classroom_live_session!classroom_recording_session_id_fkey (
          classroom_id
        )
      `)
      .eq('id', recordingId)
      .eq('is_deleted', false)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Verify recording belongs to this classroom
    const session = recording.classroom_live_session?.[0];
    if (!session || session.classroom_id !== classroom.id) {
      return NextResponse.json({ error: 'Recording not found in this classroom' }, { status: 404 });
    }

    // Mark as deleted in database (soft delete)
    const { error: deleteError } = await supabase
      .from('classroom_recording')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (deleteError) {
      console.error('Error deleting recording:', deleteError);
      return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
    }

    // Also mark corresponding attachment as deleted
    await supabase
      .from('classroom_attachments')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('context_id', classroom.id)
      .eq('context_type', 'recording')
      .eq('file_url', recording.url);

    // Optionally delete from storage (uncomment if you want hard delete)
    /*
    try {
      const url = new URL(recording.url);
      const pathSegments = url.pathname.split('/');
      const filePath = pathSegments.slice(2).join('/'); // Remove leading /storage/v1/object/public/bucket-name/
      
      await supabase.storage
        .from('classroom-attachments')
        .remove([filePath]);
    } catch (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Don't fail the request if storage deletion fails
    }
    */

    return NextResponse.json({ message: 'Recording deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/classroom/[slug]/recordings/[recordingId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update recording metadata (only tutors)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; recordingId: string }> }
) {
  try {
    const { slug, recordingId } = await params;
    const authResult = await authorize('tutor'); // Only tutors can update recordings
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

    // Check if user is a tutor of the classroom
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .eq('role', 'tutor')
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied. Only tutors can update recordings.' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { duration_sec } = body;

    // Verify recording exists and belongs to this classroom
    const { data: recording, error: recordingError } = await supabase
      .from('classroom_recording')
      .select(`
        id,
        classroom_live_session!classroom_recording_session_id_fkey (
          classroom_id
        )
      `)
      .eq('id', recordingId)
      .eq('is_deleted', false)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const session = recording.classroom_live_session?.[0];
    if (!session || session.classroom_id !== classroom.id) {
      return NextResponse.json({ error: 'Recording not found in this classroom' }, { status: 404 });
    }

    // Update recording
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (duration_sec !== undefined) {
      updateData.duration_sec = duration_sec;
    }

    const { data: updatedRecording, error: updateError } = await supabase
      .from('classroom_recording')
      .update(updateData)
      .eq('id', recordingId)
      .select(`
        id,
        public_id,
        session_id,
        url,
        duration_sec,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating recording:', updateError);
      return NextResponse.json({ error: 'Failed to update recording' }, { status: 500 });
    }

    return NextResponse.json(updatedRecording);

  } catch (error) {
    console.error('Error in PATCH /api/classroom/[slug]/recordings/[recordingId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
