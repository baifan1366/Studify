import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';

/**
 * Chat Messages Attachment API
 * POST /api/chat/messages/attachment - Create a message with MEGA attachment
 */

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    
    // Apply rate limiting for attachments
    const checkLimit = createRateLimitCheck('chatAttachment');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId);
    
    if (!allowed) {
      const response = rateLimitResponse(resetTime, limit);
      return NextResponse.json(
        { 
          error: response.error,
          message: 'Please wait before uploading another file.',
          retryAfter: response.retryAfter 
        },
        { 
          status: 429,
          headers: response.headers
        }
      );
    }
    
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    const customMessage = formData.get('customMessage') as string | null;

    // Validate required fields
    if (!conversationId || !file) {
      return NextResponse.json({
        error: 'conversationId and file are required'
      }, { status: 400 });
    }

    console.log('Uploading chat attachment:', {
      conversationId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Determine conversation type from ID format
    const isGroupConversation = conversationId.startsWith('group_');
    let actualConversationId: number;

    if (isGroupConversation) {
      // For group conversations, extract the ID directly
      actualConversationId = parseInt(conversationId.replace('group_', ''));

      if (isNaN(actualConversationId)) {
        return NextResponse.json({ error: 'Invalid group conversation ID' }, { status: 400 });
      }

      // Verify user is a member of this group
      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('id')
        .eq('conversation_id', actualConversationId)
        .eq('user_id', profile.id)
        .is('left_at', null)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }
    } else {
      // For direct messages, get or create the conversation
      const participantId = parseInt(conversationId.replace('user_', ''));

      if (isNaN(participantId)) {
        return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
      }

      // Verify participant exists
      const { data: participant, error: participantError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', participantId)
        .single();

      if (participantError || !participant) {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
      }

      // Get or create the conversation using the RPC function
      const { data: conversationIdResult, error: convError } = await supabase
        .rpc('create_or_get_conversation', {
          user1_id: profile.id,
          user2_id: participantId
        });

      if (convError || !conversationIdResult) {
        console.error('Error getting conversation:', convError);
        return NextResponse.json({ error: 'Failed to get or create conversation' }, { status: 500 });
      }

      actualConversationId = conversationIdResult;
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `chat/${profile.id}/${actualConversationId}/${fileName}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Failed to upload file to storage:', uploadError);
      return NextResponse.json({
        error: `Failed to upload file: ${uploadError.message}`
      }, { status: 500 });
    }

    // Get public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    console.log('File uploaded to storage:', { filePath, publicUrl });

    // Create chat_attachments record
    const { data: attachmentRecord, error: attachmentError } = await supabase
      .from('chat_attachments')
      .insert({
        uploader_id: profile.id,
        file_name: fileName,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        file_url: publicUrl,
        storage_path: filePath,
        custom_message: customMessage
      })
      .select()
      .single();

    if (attachmentError) {
      console.error('Failed to create attachment record:', attachmentError);
      // Clean up uploaded file
      await supabase.storage.from('chat-attachments').remove([filePath]);
      return NextResponse.json({
        error: `Failed to create attachment record: ${attachmentError.message}`
      }, { status: 500 });
    }

    console.log('Attachment record created:', attachmentRecord);

    // Create message with attachment
    let messageData;

    if (isGroupConversation) {
      // Create group message with attachment
      const { data: message, error: messageError } = await supabase
        .from('group_messages')
        .insert({
          conversation_id: actualConversationId,
          sender_id: profile.id,
          content: customMessage || `Shared a file: ${file.name}`,
          message_type: 'file',
          attachment_id: attachmentRecord.id
        })
        .select(`
          id,
          content,
          sender_id,
          created_at,
          message_type,
          attachment_id,
          profiles!group_messages_sender_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (messageError) {
        console.error('Failed to create group message:', messageError);
        // Clean up
        await supabase.from('chat_attachments').delete().eq('id', attachmentRecord.id);
        await supabase.storage.from('chat-attachments').remove([filePath]);
        return NextResponse.json({
          error: `Failed to create message: ${messageError.message}`
        }, { status: 500 });
      }

      messageData = message;

      // Update group conversation's updated_at timestamp
      await supabase
        .from('group_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', actualConversationId);

    } else {
      // Create direct message with attachment
      const { data: message, error: messageError } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: actualConversationId,
          sender_id: profile.id,
          content: customMessage || `Shared a file: ${file.name}`,
          message_type: 'file',
          attachment_id: attachmentRecord.id
        })
        .select(`
          id,
          content,
          sender_id,
          created_at,
          message_type,
          attachment_id,
          profiles!direct_messages_sender_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (messageError) {
        console.error('Failed to create direct message:', messageError);
        // Clean up
        await supabase.from('chat_attachments').delete().eq('id', attachmentRecord.id);
        await supabase.storage.from('chat-attachments').remove([filePath]);
        return NextResponse.json({
          error: `Failed to create message: ${messageError.message}`
        }, { status: 500 });
      }

      messageData = message;

      // Update direct conversation's updated_at timestamp
      await supabase
        .from('direct_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', actualConversationId);
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
      attachmentId: attachmentRecord.id,
      attachment: {
        id: attachmentRecord.id,
        file_name: attachmentRecord.file_name,
        original_name: attachmentRecord.original_name,
        mime_type: attachmentRecord.mime_type,
        size_bytes: attachmentRecord.size_bytes,
        file_url: attachmentRecord.file_url,
        custom_message: attachmentRecord.custom_message
      }
    };

    console.log('Message with attachment created successfully:', {
      id: transformedMessage.id,
      fileName: file.name,
      type: isGroupConversation ? 'group' : 'direct'
    });

    return NextResponse.json({
      success: true,
      message: transformedMessage,
      attachment: transformedMessage.attachment
    });

  } catch (error) {
    console.error('Error in chat messages attachment API:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
