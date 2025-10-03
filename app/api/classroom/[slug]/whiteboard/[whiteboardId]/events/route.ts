import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// GET - Get whiteboard events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; whiteboardId: string }> }
) {
  try {
    const { slug, whiteboardId } = await params;
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

    // Parse query parameters
    const url = new URL(request.url);
    const since = url.searchParams.get('since'); // ISO timestamp for incremental updates
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Build query for events
    let query = supabase
      .from('classroom_whiteboard_event')
      .select(`
        id,
        public_id,
        wb_id,
        actor_id,
        kind,
        payload,
        created_at,
        profiles (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('wb_id', whiteboardId);

    // Filter by timestamp if provided (for incremental updates)
    if (since) {
      query = query.gt('created_at', since);
    }

    const { data: events, error: eventsError } = await query
      .order('created_at', { ascending: true })
      .limit(limit);

    if (eventsError) {
      console.error('Error fetching whiteboard events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch whiteboard events' }, { status: 500 });
    }

    return NextResponse.json(events || []);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/whiteboard/[whiteboardId]/events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new whiteboard event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; whiteboardId: string }> }
) {
  try {
    const { slug, whiteboardId } = await params;
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
    const { kind, payload } = body;

    if (!kind || !payload) {
      return NextResponse.json({ error: 'Kind and payload are required' }, { status: 400 });
    }

    // Validate event kind
    const validKinds = [
      'draw_start', 'draw_move', 'draw_end',
      'shape_create', 'shape_update', 'shape_delete',
      'text_create', 'text_update', 'text_delete',
      'clear_canvas', 'undo', 'redo',
      'cursor_move', 'user_join', 'user_leave'
    ];

    if (!validKinds.includes(kind)) {
      return NextResponse.json({ error: 'Invalid event kind' }, { status: 400 });
    }

    // Create whiteboard event
    const { data: event, error: eventError } = await supabase
      .from('classroom_whiteboard_event')
      .insert({
        wb_id: parseInt(whiteboardId),
        actor_id: profile.id,
        kind,
        payload
      })
      .select(`
        id,
        public_id,
        wb_id,
        actor_id,
        kind,
        payload,
        created_at
      `)
      .single();

    if (eventError) {
      console.error('Error creating whiteboard event:', eventError);
      return NextResponse.json({ error: 'Failed to create whiteboard event' }, { status: 500 });
    }

    return NextResponse.json(event);

  } catch (error) {
    console.error('Error in POST /api/classroom/[slug]/whiteboard/[whiteboardId]/events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
