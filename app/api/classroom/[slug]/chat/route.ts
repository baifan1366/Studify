import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// GET - Fetch chat messages for a classroom session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile ID
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify classroom access
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
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query for chat messages
    let query = supabase
      .from('classroom_chat_message')
      .select(`
        id,
        public_id,
        session_id,
        message,
        created_at,
        updated_at,
        is_deleted,
        profiles!classroom_chat_message_sender_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by session_id if provided
    if (sessionId) {
      query = query.eq('session_id', parseInt(sessionId));
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Transform messages to match frontend interface
    const transformedMessages = messages?.map(msg => ({
      id: msg.public_id,
      userId: (msg.profiles as any)?.id?.toString() || '',
      userName: (msg.profiles as any)?.display_name || 'Unknown User',
      userAvatar: (msg.profiles as any)?.avatar_url || null,
      content: msg.message,
      timestamp: new Date(msg.created_at),
      type: 'text' as const
    })) || [];

    return NextResponse.json({
      messages: transformedMessages,
      total: messages?.length || 0,
      hasMore: messages?.length === limit
    });

  } catch (error) {
    console.error('Chat messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a new chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { message, session_id } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile ID
    const supabase = await createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify classroom access
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
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Insert new chat message
    const { data: newMessage, error: insertError } = await supabase
      .from('classroom_chat_message')
      .insert({
        session_id: parseInt(session_id),
        sender_id: profile.id,
        message: message.trim(),
        is_deleted: false
      })
      .select(`
        id,
        public_id,
        session_id,
        message,
        created_at,
        profiles!classroom_chat_message_sender_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Transform message to match frontend interface
    const transformedMessage = {
      id: newMessage.public_id,
      userId: (newMessage.profiles as any)?.id?.toString() || '',
      userName: (newMessage.profiles as any)?.display_name || 'Unknown User',
      userAvatar: (newMessage.profiles as any)?.avatar_url || null,
      content: newMessage.message,
      timestamp: new Date(newMessage.created_at),
      type: 'text' as const
    };

    return NextResponse.json({ message: transformedMessage }, { status: 201 });

  } catch (error) {
    console.error('Chat message send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
