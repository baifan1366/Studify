import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Chat Messages API
 * GET /api/chat/conversations/[conversationId]/messages - Get messages for conversation
 * POST /api/chat/conversations/[conversationId]/messages - Send new message
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    
    // Authorize user
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // For direct messages, extract participant ID from conversation ID (format: user_123)
    const participantId = parseInt(conversationId.replace('user_', ''));
    
    if (isNaN(participantId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Get the actual conversation ID from the database
    const { data: conversation, error: convError } = await supabase
      .rpc('create_or_get_conversation', {
        user1_id: profile.id,
        user2_id: participantId
      });

    if (convError || !conversation) {
      console.error('Error getting conversation:', convError);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const actualConversationId = conversation;

    // Fetch messages from direct_messages table with read status and attachments
    // Include deleted messages to show "This message was deleted"
    const { data: messages, error: messagesError } = await supabase
      .from('direct_messages')
      .select(`
        id,
        content,
        sender_id,
        message_type,
        created_at,
        delivered_at,
        is_edited,
        is_deleted,
        deleted_at,
        attachment_id,
        sender:profiles!direct_messages_sender_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        attachment:chat_attachments!direct_messages_attachment_id_fkey (
          id,
          file_name,
          original_name,
          mime_type,
          size_bytes,
          file_url,
          custom_message
        ),
        read_status:message_read_status (
          user_id,
          read_at
        )
      `)
      .eq('conversation_id', actualConversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Transform messages to match expected format with status
    const transformedMessages = messages?.map(msg => {
      const isFromMe = msg.sender_id === profile.id;
      
      // Determine message status
      let status: 'sending' | 'sent' | 'delivered' | 'read' = 'sent';
      
      if (isFromMe) {
        // For messages sent by current user, check recipient's read status
        const otherUserReadStatus = Array.isArray(msg.read_status) 
          ? msg.read_status.find(rs => rs.user_id === participantId)
          : null;
        
        if (otherUserReadStatus) {
          status = 'read'; // Recipient has read the message
        } else if (msg.delivered_at) {
          status = 'delivered'; // Message delivered but not read
        } else {
          status = 'sent'; // Message sent but not delivered
        }
      } else {
        // For messages received, always show as read (since we're viewing them)
        status = 'read';
      }

      return {
        id: msg.id.toString(),
        content: msg.content,
        senderId: msg.sender_id.toString(),
        senderName: Array.isArray(msg.sender) 
          ? (msg.sender[0] as any)?.display_name || 'Unknown User'
          : (msg.sender as any)?.display_name || 'Unknown User',
        senderAvatar: Array.isArray(msg.sender) 
          ? (msg.sender[0] as any)?.avatar_url
          : (msg.sender as any)?.avatar_url,
        timestamp: msg.created_at,
        deliveredAt: msg.delivered_at,
        type: msg.message_type || 'text',
        isFromMe,
        status,
        isEdited: msg.is_edited || false,
        isDeleted: msg.is_deleted || false,
        deletedAt: msg.deleted_at,
        attachmentId: msg.attachment_id,
        attachment: msg.attachment ? {
          id: Array.isArray(msg.attachment) ? msg.attachment[0]?.id : (msg.attachment as any)?.id,
          file_name: Array.isArray(msg.attachment) ? msg.attachment[0]?.file_name : (msg.attachment as any)?.file_name,
          original_name: Array.isArray(msg.attachment) ? msg.attachment[0]?.original_name : (msg.attachment as any)?.original_name,
          mime_type: Array.isArray(msg.attachment) ? msg.attachment[0]?.mime_type : (msg.attachment as any)?.mime_type,
          size_bytes: Array.isArray(msg.attachment) ? msg.attachment[0]?.size_bytes : (msg.attachment as any)?.size_bytes,
          file_url: Array.isArray(msg.attachment) ? msg.attachment[0]?.file_url : (msg.attachment as any)?.file_url,
          custom_message: Array.isArray(msg.attachment) ? msg.attachment[0]?.custom_message : (msg.attachment as any)?.custom_message,
        } : undefined,
      };
    }) || [];

    return NextResponse.json({ 
      messages: transformedMessages,
      pagination: {
        total: messages.length,
        limit,
        offset,
        hasMore: false,
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    
    // Authorize user
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { content, type = 'text' } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ 
        error: 'Message content is required' 
      }, { status: 400 });
    }

    // For direct messages, extract participant ID from conversationId
    const participantId = conversationId.startsWith('user_') 
      ? parseInt(conversationId.replace('user_', ''))
      : null;

    if (!participantId) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    // Verify participant exists
    const { data: participant, error: participantError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Get or create the conversation
    const { data: actualConversationId, error: convError } = await supabase
      .rpc('create_or_get_conversation', {
        user1_id: profile.id,
        user2_id: participantId
      });

    if (convError || !actualConversationId) {
      console.error('Error getting conversation:', convError);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Insert the message into direct_messages table
    const { data: newMessageData, error: messageError } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: actualConversationId,
        sender_id: profile.id,
        content,
        message_type: type,
        delivered_at: new Date().toISOString(), // Mark as delivered immediately for demo
        attachment_id: null, // TODO: Handle file attachments
      })
      .select(`
        id,
        content,
        sender_id,
        message_type,
        created_at,
        delivered_at,
        is_edited,
        attachment_id,
        sender:profiles!direct_messages_sender_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (messageError || !newMessageData) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Transform the new message to match expected format
    const newMessage = {
      id: newMessageData.id.toString(),
      content: newMessageData.content,
      senderId: newMessageData.sender_id.toString(),
      senderName: (newMessageData.sender as any)?.display_name || 'You',
      senderAvatar: (newMessageData.sender as any)?.avatar_url,
      timestamp: newMessageData.created_at,
      type: newMessageData.message_type || 'text',
      fileName: null,
      fileSize: null,
      isFromMe: true,
      status: 'sent' as const,
      isEdited: false,
      attachmentId: newMessageData.attachment_id,
    };

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
