import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// GET - List recordings for a classroom session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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

    // Parse query parameters
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    // Build query for recordings
    let query = supabase
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
          status
        )
      `)
      .eq('is_deleted', false);

    // Join with classroom_live_session to filter by classroom
    const { data: sessions } = await supabase
      .from('classroom_live_session')
      .select('id')
      .eq('classroom_id', classroom.id);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      query = query.in('session_id', sessionIds);
    } else {
      // No sessions for this classroom
      return NextResponse.json([]);
    }

    // Filter by specific session if provided
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: recordings, error: recordingsError } = await query
      .order('created_at', { ascending: false });

    if (recordingsError) {
      console.error('Error fetching recordings:', recordingsError);
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }

    return NextResponse.json(recordings || []);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/recordings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Upload/Create recording for a classroom session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('tutor'); // Only tutors can create recordings
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

    // Check if user is a member of the classroom and get their role
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied. User is not a member of this classroom.' }, { status: 403 });
    }

    // Get user's global role from profiles table
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', profile.id)
      .single();

    // Check if user is a tutor (either classroom role or global role)
    const isClassroomTutor = membership.role === 'tutor';
    const isGlobalTutor = userProfile?.role === 'tutor';
    
    if (!isClassroomTutor && !isGlobalTutor) {
      return NextResponse.json({ error: 'Access denied. Only tutors can create recordings.' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('session_id') as string;
    const durationSec = parseInt(formData.get('duration_sec') as string || '0');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session belongs to this classroom
    const { data: session, error: sessionError } = await supabase
      .from('classroom_live_session')
      .select('id')
      .eq('id', sessionId)
      .eq('classroom_id', classroom.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `recording_${sessionId}_${Date.now()}.${fileExt}`;
    const filePath = `classroom_${classroom.id}/recordings/${fileName}`;

    // Upload to Supabase Storage (same bucket as attachments)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('classroom-attachments') // Same bucket as attachments
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading recording:', uploadError);
      return NextResponse.json({ error: 'Failed to upload recording' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('classroom-attachments')
      .getPublicUrl(filePath);

    // Save recording metadata to database
    const { data: recording, error: recordingError } = await supabase
      .from('classroom_recording')
      .insert({
        session_id: parseInt(sessionId),
        url: publicUrl,
        duration_sec: durationSec,
        is_deleted: false
      })
      .select(`
        id,
        public_id,
        session_id,
        url,
        duration_sec,
        created_at
      `)
      .single();

    if (recordingError) {
      console.error('Error saving recording metadata:', recordingError);
      // Clean up uploaded file
      await supabase.storage
        .from('classroom-attachments')
        .remove([filePath]);
      return NextResponse.json({ error: 'Failed to save recording metadata' }, { status: 500 });
    }

    // Also create an attachment record for consistency (with context_type = 'recording')
    await supabase
      .from('classroom_attachments')
      .insert({
        context_id: classroom.id,
        context_type: 'recording',
        owner_id: profile.id,
        file_url: publicUrl,
        file_name: fileName,
        mime_type: file.type,
        size_bytes: file.size,
        bucket: 'classroom-attachments',
        path: filePath,
        visibility: 'classroom',
        custom_message: `Recording for session ${sessionId}`,
        is_deleted: false
      });

    return NextResponse.json(recording);

  } catch (error) {
    console.error('Error in POST /api/classroom/[slug]/recordings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
