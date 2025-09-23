import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Chat Messages Attachment API
 * POST /api/chat/messages/attachment - Create a message with MEGA attachment
 */

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
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

    const body = await request.json();
    const { 
      conversationId, 
      attachmentUrl, 
      fileName, 
      fileSize, 
      fileType, 
      customMessage 
    } = body;

    // Validate required fields
    if (!conversationId || !attachmentUrl || !fileName) {
      return NextResponse.json({ 
        error: 'conversationId, attachmentUrl, and fileName are required' 
      }, { status: 400 });
    }

    console.log('Creating message with attachment:', {
      conversationId,
      fileName,
      fileSize,
      fileType
    });

    // Determine conversation type from ID format
    const isGroupConversation = conversationId.startsWith('group_');
    const actualConversationId = conversationId.replace(/^(user_|group_)/, '');

    let messageData;

    if (isGroupConversation) {
      // Create group message with attachment
      const { data: message, error: messageError } = await supabase
        .from('group_messages')
        .insert({
          conversation_id: parseInt(actualConversationId),
          sender_id: profile.id,
          content: customMessage || `Shared a file: ${fileName}`,
          message_type: 'attachment',
          attachment_url: attachmentUrl,
          attachment_name: fileName,
          attachment_size: fileSize || 0,
          attachment_type: fileType || 'unknown'
        })
        .select(`
          id,
          content,
          sender_id,
          created_at,
          message_type,
          attachment_url,
          attachment_name,
          attachment_size,
          attachment_type,
          profiles!group_messages_sender_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (messageError) {
        console.error('Failed to create group message:', messageError);
        return NextResponse.json({ 
          error: `Failed to create message: ${messageError.message}` 
        }, { status: 500 });
      }

      messageData = message;

      // Update group conversation's updated_at timestamp
      await supabase
        .from('group_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', parseInt(actualConversationId));

    } else {
      // Create direct message with attachment
      const { data: message, error: messageError } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: parseInt(actualConversationId),
          sender_id: profile.id,
          content: customMessage || `Shared a file: ${fileName}`,
          message_type: 'attachment',
          attachment_url: attachmentUrl,
          attachment_name: fileName,
          attachment_size: fileSize || 0,
          attachment_type: fileType || 'unknown'
        })
        .select(`
          id,
          content,
          sender_id,
          created_at,
          message_type,
          attachment_url,
          attachment_name,
          attachment_size,
          attachment_type,
          profiles!direct_messages_sender_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (messageError) {
        console.error('Failed to create direct message:', messageError);
        return NextResponse.json({ 
          error: `Failed to create message: ${messageError.message}` 
        }, { status: 500 });
      }

      messageData = message;

      // Update direct conversation's updated_at timestamp
      await supabase
        .from('direct_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', parseInt(actualConversationId));
    }

    // Transform the message to match expected format
    const transformedMessage = {
      id: messageData.id.toString(),
      content: messageData.content,
      senderId: messageData.sender_id.toString(),
      senderName: Array.isArray(messageData.profiles) 
        ? (messageData.profiles[0] as any)?.display_name || 'Unknown User'
        : (messageData.profiles as any)?.display_name || 'Unknown User',
      senderAvatar: Array.isArray(messageData.profiles)
        ? (messageData.profiles[0] as any)?.avatar_url
        : (messageData.profiles as any)?.avatar_url,
      timestamp: messageData.created_at,
      type: messageData.message_type,
      isFromMe: messageData.sender_id === profile.id,
      status: 'sent' as const,
      // Attachment specific fields
      attachmentUrl: messageData.attachment_url,
      fileName: messageData.attachment_name,
      fileSize: messageData.attachment_size,
      fileType: messageData.attachment_type
    };

    console.log('Message with attachment created successfully:', {
      id: transformedMessage.id,
      fileName: transformedMessage.fileName,
      type: isGroupConversation ? 'group' : 'direct'
    });

    return NextResponse.json({
      success: true,
      message: transformedMessage
    });

  } catch (error) {
    console.error('Error in chat messages attachment API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
