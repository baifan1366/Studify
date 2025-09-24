import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// GET - List whiteboard sessions for a classroom
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

    // Build query for whiteboard sessions
    let query = supabase
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

    const { data: whiteboards, error: whiteboardsError } = await query
      .order('created_at', { ascending: false });

    if (whiteboardsError) {
      console.error('Error fetching whiteboards:', whiteboardsError);
      return NextResponse.json({ error: 'Failed to fetch whiteboards' }, { status: 500 });
    }

    return NextResponse.json(whiteboards || []);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/whiteboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new whiteboard session
export async function POST(
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
      return NextResponse.json({ error: 'Access denied. User is not a member of this classroom.' }, { status: 403 });
    }

    // Check if user can create whiteboards (tutor in classroom or global tutor)
    const isClassroomTutor = membership.role === 'tutor';
    const isGlobalTutor = profile.role === 'tutor';
    
    if (!isClassroomTutor && !isGlobalTutor) {
      return NextResponse.json({ error: 'Access denied. Only tutors can create whiteboards.' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { session_id, title } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session belongs to this classroom
    const { data: session, error: sessionError } = await supabase
      .from('classroom_live_session')
      .select('id')
      .eq('id', session_id)
      .eq('classroom_id', classroom.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    // Create whiteboard session
    const { data: whiteboard, error: whiteboardError } = await supabase
      .from('classroom_whiteboard_session')
      .insert({
        session_id: parseInt(session_id),
        title: title || `Whiteboard - ${new Date().toLocaleString()}`,
        is_deleted: false
      })
      .select(`
        id,
        public_id,
        session_id,
        title,
        created_at,
        updated_at
      `)
      .single();

    if (whiteboardError) {
      console.error('Error creating whiteboard session:', whiteboardError);
      return NextResponse.json({ error: 'Failed to create whiteboard session' }, { status: 500 });
    }

    return NextResponse.json(whiteboard);

  } catch (error) {
    console.error('Error in POST /api/classroom/[slug]/whiteboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
