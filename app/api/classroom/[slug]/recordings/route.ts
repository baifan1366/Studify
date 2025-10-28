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
    console.log('📹 [Recordings API] POST request received for classroom:', slug);
    
    // Use more permissive authorization - check classroom role later
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      console.log('📹 [Recordings API] Authorization failed');
      return authResult;
    }
    const { user } = authResult;
    console.log('📹 [Recordings API] User authorized:', user.id);

    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('📹 [Recordings API] Profile not found:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('📹 [Recordings API] Profile found:', { id: profile.id, role: profile.role });

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      console.log('📹 [Recordings API] Classroom not found:', classroomError);
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    console.log('📹 [Recordings API] Classroom found:', classroom.id);

    // Check if user is a member of the classroom and get their role
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (membershipError || !membership) {
      console.log('📹 [Recordings API] Membership not found:', membershipError);
      return NextResponse.json({ error: 'Access denied. User is not a member of this classroom.' }, { status: 403 });
    }

    console.log('📹 [Recordings API] Membership found:', { role: membership.role });

    // Check if user has permission to create recordings (tutor or owner in classroom)
    const canCreateRecording = membership.role === 'tutor' || membership.role === 'owner';
    
    if (!canCreateRecording) {
      console.log('📹 [Recordings API] User does not have permission. Role:', membership.role);
      return NextResponse.json({ error: 'Access denied. Only tutors and owners can create recordings.' }, { status: 403 });
    }

    console.log('📹 [Recordings API] User has permission to create recording');

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
    // sessionId can be either numeric id, public_id (UUID), or slug
    let sessionQuery = supabase
      .from('classroom_live_session')
      .select('id')
      .eq('classroom_id', classroom.id);

    // Check if sessionId is a number
    if (!isNaN(Number(sessionId))) {
      sessionQuery = sessionQuery.eq('id', parseInt(sessionId));
    } else {
      // Try matching against public_id or slug
      sessionQuery = sessionQuery.or(`public_id.eq.${sessionId},slug.eq.${sessionId}`);
    }

    const { data: session, error: sessionError } = await sessionQuery.single();

    if (sessionError || !session) {
      console.error('📹 [Recordings API] Session lookup error:', { sessionId, sessionError });
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    console.log('📹 [Recordings API] Session found:', session.id);

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `recording_${session.id}_${Date.now()}.${fileExt}`;
    const filePath = `classroom_${classroom.id}/recordings/${fileName}`;

    console.log('📹 [Recordings API] Uploading file:', { fileName, filePath, fileSize: file.size, fileType: file.type });

    // Convert File to ArrayBuffer for Supabase storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('live-recording') // Use the live-recording bucket
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('📹 [Recordings API] Error uploading recording:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload recording', 
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('📹 [Recordings API] File uploaded successfully:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('live-recording')
      .getPublicUrl(filePath);

    // Save recording metadata to database (use the numeric session.id)
    console.log('📹 [Recordings API] Inserting recording metadata:', {
      session_id: session.id,
      url: publicUrl,
      duration_sec: durationSec
    });

    const { data: recording, error: recordingError } = await supabase
      .from('classroom_recording')
      .insert({
        session_id: session.id, // Use the numeric ID from the session lookup
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
      console.error('📹 [Recordings API] Error saving recording metadata:', recordingError);
      // Clean up uploaded file
      await supabase.storage
        .from('live-recording')
        .remove([filePath]);
      return NextResponse.json({ 
        error: 'Failed to save recording metadata',
        details: recordingError.message 
      }, { status: 500 });
    }

    console.log('📹 [Recordings API] Recording metadata saved:', recording.id);

    // Also create an attachment record for consistency (with context_type = 'recording')
    console.log('📹 [Recordings API] Creating attachment record');
    
    const { error: attachmentError } = await supabase
      .from('classroom_attachments')
      .insert({
        context_id: classroom.id,
        context_type: 'recording',
        owner_id: profile.id,
        file_url: publicUrl,
        file_name: fileName,
        mime_type: file.type,
        size_bytes: file.size,
        bucket: 'live-recording',
        path: filePath,
        visibility: 'classroom',
        custom_message: `Recording for session ${session.id}`,
        is_deleted: false
      });

    if (attachmentError) {
      console.error('📹 [Recordings API] Error creating attachment record (non-critical):', attachmentError);
      // Don't fail the request if attachment record fails
    } else {
      console.log('📹 [Recordings API] Attachment record created');
    }

    console.log('📹 [Recordings API] Upload complete, returning recording data');
    return NextResponse.json(recording);

  } catch (error) {
    console.error('Error in POST /api/classroom/[slug]/recordings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
