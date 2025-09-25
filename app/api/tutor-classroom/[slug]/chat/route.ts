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
    // Accept both session_id and sessionId for compatibility
    const sessionId = searchParams.get('session_id') || searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Authorize user
    const authResult = await authorize('tutor');
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

    // Get all live sessions for this classroom
    const { data: classroomSessions, error: sessionsError } = await supabase
      .from('classroom_live_session')
      .select('id')
      .eq('classroom_id', classroom.id);

    if (sessionsError) {
      console.error('Error fetching classroom sessions:', sessionsError);
      // Return empty list instead of 500 to avoid breaking UI
      return NextResponse.json({
        success: true,
        messages: [],
        total: 0,
        hasMore: false
      });
    }

    const sessionIds = classroomSessions?.map(s => s.id) || [];
    
    if (sessionIds.length === 0) {
      // No sessions found, return empty messages
      return NextResponse.json({
        success: true,
        messages: [],
        total: 0,
        hasMore: false
      });
    }

    // Query chat messages for these sessions
    let query = supabase
      .from('classroom_chat_message')
      .select(`
        id,
        public_id,
        session_id,
        message,
        created_at,
        sender_id,
        attachment_id,
        classroom_attachments!classroom_chat_message_attachment_id_fkey (
          id,
          public_id,
          file_url,
          file_name,
          mime_type,
          size_bytes,
          created_at,
          visibility,
          bucket,
          path,
          profiles!classroom_attachments_owner_id_fkey (
            display_name,
            avatar_url
          )
        )
      `)
      .in('session_id', sessionIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by specific session_id if provided
    if (sessionId) {
      query = query.eq('session_id', parseInt(sessionId));
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      // Return empty list instead of 500 to avoid breaking UI
      return NextResponse.json({
        success: true,
        messages: [],
        total: 0,
        hasMore: false
      });
    }

    // If there are no messages, return early
    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        messages: [],
        total: 0,
        hasMore: false
      });
    }

    // Get user profiles for message senders
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    let profiles: { id: number; display_name: string | null; avatar_url: string | null }[] | null = [];
    if (senderIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', senderIds);
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Proceed without profiles to avoid failing the whole request
        profiles = [];
      } else {
        profiles = profilesData;
      }
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Get current user's profile for comparison
    const currentUserProfile = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    // Transform messages to match frontend interface
    const transformedMessages = messages?.map(msg => {
      const profile = profileMap.get(msg.sender_id);
      const isCurrentUser = msg.sender_id === currentUserProfile.data?.id;
      
      // Transform attachment data if exists
      let attachment = undefined;
      if (msg.classroom_attachments) {
        const attachmentData = msg.classroom_attachments as any; // Type assertion to handle Supabase join
        attachment = {
          id: attachmentData.id,
          public_id: attachmentData.public_id,
          file_url: attachmentData.file_url,
          file_name: attachmentData.file_name,
          mime_type: attachmentData.mime_type,
          size_bytes: attachmentData.size_bytes,
          created_at: attachmentData.created_at,
          visibility: attachmentData.visibility,
          bucket: attachmentData.bucket,
          path: attachmentData.path,
          profiles: {
            display_name: attachmentData.profiles?.display_name || 'Unknown User',
            avatar_url: attachmentData.profiles?.avatar_url || undefined
          }
        };
      }
      
      return {
        id: msg.public_id,
        userId: isCurrentUser ? currentUserProfile.data?.user_id || '' : profile?.id?.toString() || '',
        userName: profile?.display_name || 'Unknown User',
        userAvatar: profile?.avatar_url || null,
        content: msg.message,
        timestamp: new Date(msg.created_at),
        type: 'user' as const,
        attachment: attachment
      };
    }) || [];

    return NextResponse.json({
      success: true,
      messages: transformedMessages,
      total: transformedMessages.length,
      hasMore: transformedMessages.length === limit
    });

  } catch (error) {
    console.error('Chat messages fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

    return NextResponse.json({ success: true, message: transformedMessage }, { status: 201 });

  } catch (error) {
    console.error('Chat message send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
