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

    // Detect conversation type: group or direct
    const isGroupConversation = conversationId.startsWith('group_');
    
    if (isGroupConversation) {
      // Handle GROUP messages
      const groupId = parseInt(conversationId.replace('group_', ''));
      
      if (isNaN(groupId)) {
        return NextResponse.json({ error: 'Invalid group conversation ID' }, { status: 400 });
      }

      // Verify user is a member of this group
      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('id')
        .eq('conversation_id', groupId)
        .eq('user_id', profile.id)
        .is('left_at', null)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      // Fetch group messages
      const { data: messages, error: messagesError } = await supabase
        .from('group_messages')
        .select(`
          id,
          content,
          sender_id,
          message_type,
          created_at,
          is_edited,
          is_deleted,
          deleted_at,
          attachment_id,
          reply_to_id,
          sender:profiles!group_messages_sender_id_fkey (
            id,
            display_name,
            avatar_url
          ),
          attachment:chat_attachments!group_messages_attachment_id_fkey (
            id,
            file_name,
            original_name,
            mime_type,
            size_bytes,
            file_url,
            custom_message
          )
        `)
        .eq('conversation_id', groupId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching group messages:', messagesError);
        return NextResponse.json({ 
          error: 'Failed to fetch messages',
          details: messagesError.message 
        }, { status: 500 });
      }

      // Collect unique reply_to_ids for separate query
      const replyToIds = new Set<number>();
      messages?.forEach(msg => {
        if (msg.reply_to_id) {
          replyToIds.add(msg.reply_to_id);
        }
      });

      // Fetch reply_to messages if any exist
      let replyToMessages: { [key: number]: any } = {};
      let replyToSenderProfiles: { [key: number]: any } = {};
      
      if (replyToIds.size > 0) {
        const { data: replyMessages, error: replyError } = await supabase
          .from('group_messages')
          .select('id, content, is_deleted, sender_id')
          .in('id', Array.from(replyToIds));

        if (!replyError && replyMessages) {
          replyMessages.forEach(replyMsg => {
            replyToMessages[replyMsg.id] = replyMsg;
          });

          const replyToSenderIds = new Set<number>();
          replyMessages.forEach(replyMsg => {
            if (replyMsg.sender_id) {
              replyToSenderIds.add(replyMsg.sender_id);
            }
          });

          if (replyToSenderIds.size > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', Array.from(replyToSenderIds));

            if (!profilesError && profiles) {
              profiles.forEach(profile => {
                replyToSenderProfiles[profile.id] = profile;
              });
            }
          }
        }
      }

      // Transform group messages
      const transformedMessages = messages?.map(msg => {
        const isFromMe = msg.sender_id === profile.id;
        
        // Process reply_to information
        let replyTo = undefined;
        if (msg.reply_to_id) {
          const replyToData = replyToMessages[msg.reply_to_id];
          if (replyToData) {
            const senderProfile = replyToSenderProfiles[replyToData.sender_id];
            replyTo = {
              id: replyToData.id?.toString(),
              content: replyToData.content,
              isDeleted: replyToData.is_deleted || false,
              senderId: replyToData.sender_id?.toString(),
              senderName: senderProfile?.display_name || 'Unknown User',
              senderAvatar: senderProfile?.avatar_url,
            };
          }
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
          type: msg.message_type || 'text',
          isFromMe,
          status: 'sent' as const,
          isEdited: msg.is_edited || false,
          isDeleted: msg.is_deleted || false,
          deletedAt: msg.deleted_at,
          attachmentId: msg.attachment_id,
          replyToId: msg.reply_to_id,
          replyTo,
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
    }

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

    // First, fetch basic messages without reply_to join to avoid schema cache issues
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
        reply_to_id,
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
      console.error('Error details:', {
        message: messagesError.message,
        details: messagesError.details,
        hint: messagesError.hint,
        code: messagesError.code
      });
      return NextResponse.json({ 
        error: 'Failed to fetch messages',
        details: messagesError.message 
      }, { status: 500 });
    }

    // Collect unique reply_to_ids for separate query
    const replyToIds = new Set<number>();
    messages?.forEach(msg => {
      if (msg.reply_to_id) {
        replyToIds.add(msg.reply_to_id);
      }
    });

    // Fetch reply_to messages and their senders if any exist
    let replyToMessages: { [key: number]: any } = {};
    let replyToSenderProfiles: { [key: number]: any } = {};
    
    if (replyToIds.size > 0) {
      // First, get the reply_to messages
      const { data: replyMessages, error: replyError } = await supabase
        .from('direct_messages')
        .select(`
          id,
          content,
          is_deleted,
          sender_id
        `)
        .in('id', Array.from(replyToIds));

      if (!replyError && replyMessages) {
        // Store reply messages by ID
        replyMessages.forEach(replyMsg => {
          replyToMessages[replyMsg.id] = replyMsg;
        });

        // Collect unique sender_ids from reply messages
        const replyToSenderIds = new Set<number>();
        replyMessages.forEach(replyMsg => {
          if (replyMsg.sender_id) {
            replyToSenderIds.add(replyMsg.sender_id);
          }
        });

        // Fetch profiles for reply_to senders
        if (replyToSenderIds.size > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', Array.from(replyToSenderIds));

          if (!profilesError && profiles) {
            profiles.forEach(profile => {
              replyToSenderProfiles[profile.id] = profile;
            });
          }
        }
      }
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

      // Process reply_to information with separately fetched data
      let replyTo = undefined;
      if (msg.reply_to_id) {
        const replyToData = replyToMessages[msg.reply_to_id];
        if (replyToData) {
          const senderProfile = replyToSenderProfiles[replyToData.sender_id];
          
          replyTo = {
            id: replyToData.id?.toString(),
            content: replyToData.content,
            isDeleted: replyToData.is_deleted || false,
            senderId: replyToData.sender_id?.toString(),
            senderName: senderProfile?.display_name || 'Unknown User',
            senderAvatar: senderProfile?.avatar_url,
          };
        }
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
        replyToId: msg.reply_to_id,
        replyTo,
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

    const { content, type = 'text', reply_to_id } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ 
        error: 'Message content is required' 
      }, { status: 400 });
    }

    // Detect conversation type: group or direct
    const isGroupConversation = conversationId.startsWith('group_');

    if (isGroupConversation) {
      // Handle GROUP message sending
      const groupId = parseInt(conversationId.replace('group_', ''));
      
      if (isNaN(groupId)) {
        return NextResponse.json({ error: 'Invalid group conversation ID' }, { status: 400 });
      }

      // Verify user is a member of this group
      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('id')
        .eq('conversation_id', groupId)
        .eq('user_id', profile.id)
        .is('left_at', null)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }

      // Validate reply_to_id if provided
      if (reply_to_id) {
        const { data: replyToMessage, error: replyError } = await supabase
          .from('group_messages')
          .select('id, conversation_id')
          .eq('id', reply_to_id)
          .eq('conversation_id', groupId)
          .single();

        if (replyError || !replyToMessage) {
          return NextResponse.json({ 
            error: 'Reply to message not found or not in this conversation' 
          }, { status: 400 });
        }
      }

      // Insert the message into group_messages table
      const { data: newMessageData, error: messageError } = await supabase
        .from('group_messages')
        .insert({
          conversation_id: groupId,
          sender_id: profile.id,
          content,
          message_type: type,
          attachment_id: null, // TODO: Handle file attachments
          reply_to_id: reply_to_id || null,
        })
        .select(`
          id,
          content,
          sender_id,
          message_type,
          created_at,
          is_edited,
          attachment_id,
          reply_to_id,
          sender:profiles!group_messages_sender_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (messageError || !newMessageData) {
        console.error('Error creating group message:', messageError);
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
        isDeleted: false,
        attachmentId: newMessageData.attachment_id,
        replyToId: newMessageData.reply_to_id,
        replyTo: undefined, // Will be populated by frontend if needed
      };

      return NextResponse.json({ message: newMessage }, { status: 201 });
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

    // Validate reply_to_id if provided
    if (reply_to_id) {
      const { data: replyToMessage, error: replyError } = await supabase
        .from('direct_messages')
        .select('id, conversation_id')
        .eq('id', reply_to_id)
        .eq('conversation_id', actualConversationId)
        .single();

      if (replyError || !replyToMessage) {
        return NextResponse.json({ 
          error: 'Reply to message not found or not in this conversation' 
        }, { status: 400 });
      }
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
        reply_to_id: reply_to_id || null,
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
        reply_to_id,
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
      isDeleted: false,
      attachmentId: newMessageData.attachment_id,
      replyToId: newMessageData.reply_to_id,
      replyTo: undefined, // Will be populated by frontend if needed
    };

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
