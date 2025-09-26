import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Message Management API
 * PATCH /api/chat/conversations/[conversationId]/messages/[messageId] - Edit message
 * DELETE /api/chat/conversations/[conversationId]/messages/[messageId] - Delete message
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const { conversationId, messageId } = await params;
    console.log('=== PATCH MESSAGE START ===');
    console.log('ConversationId:', conversationId);
    console.log('MessageId:', messageId);
    
    // Authorize user
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      console.log('Authorization failed');
      return authResult;
    }
    
    const userId = authResult.sub;
    console.log('Authorized userId:', userId);
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    console.log('Profile lookup result:', { profile, profileError });

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Parse request body
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ 
        error: 'Message content is required' 
      }, { status: 400 });
    }

    // Detect conversation type from conversationId
    const isGroupConversation = typeof conversationId === 'string' && conversationId.startsWith('group_');

    if (isGroupConversation) {
      // Handle GROUP message edit
      const groupId = parseInt(conversationId.replace('group_', ''));
      if (Number.isNaN(groupId)) {
        return NextResponse.json({ error: 'Invalid group conversation id' }, { status: 400 });
      }

      // Verify membership
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

      // Verify the message exists and belongs to the current user within this group
      const { data: existingMessage, error: messageError } = await supabase
        .from('group_messages')
        .select('id, sender_id, conversation_id, is_deleted')
        .eq('id', messageId)
        .eq('conversation_id', groupId)
        .eq('is_deleted', false)
        .single();

      if (messageError || !existingMessage) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      if (existingMessage.sender_id !== profile.id) {
        return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
      }

      // Update the message
      const { data: updateResult, error: updateError } = await supabase
        .from('group_messages')
        .update({ content: content.trim(), is_edited: true })
        .eq('id', messageId)
        .select('id, content, is_edited');

      if (updateError || !updateResult || updateResult.length === 0) {
        return NextResponse.json({ error: 'Failed to update message', details: updateError?.message }, { status: 500 });
      }

      // Fetch full message
      const { data: completeMessage } = await supabase
        .from('group_messages')
        .select('id, content, sender_id, message_type, created_at, attachment_id, is_edited')
        .eq('id', messageId)
        .single();

      const { data: senderInfo } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', completeMessage?.sender_id)
        .single();

      const transformedMessage = {
        id: completeMessage!.id.toString(),
        content: completeMessage!.content,
        senderId: completeMessage!.sender_id.toString(),
        senderName: senderInfo?.display_name || 'You',
        senderAvatar: senderInfo?.avatar_url,
        timestamp: completeMessage!.created_at,
        type: (completeMessage as any).message_type || 'text',
        isFromMe: true,
        status: 'sent' as const,
        isEdited: !!completeMessage!.is_edited,
        attachmentId: (completeMessage as any).attachment_id,
      };

      return NextResponse.json({ message: transformedMessage });
    } else {
      // Handle DIRECT message edit (existing behavior)
      // Verify the message exists and belongs to the current user
      console.log('Looking for message with ID:', messageId);
      const { data: existingMessage, error: messageError } = await supabase
        .from('direct_messages')
        .select('id, sender_id, content, is_deleted')
        .eq('id', messageId)
        .eq('is_deleted', false)
        .single();

      if (messageError) {
        console.error('Error finding message:', messageError);
        return NextResponse.json({ error: 'Message not found', details: messageError.message }, { status: 404 });
      }

      if (!existingMessage) {
        console.error('Message not found with ID:', messageId);
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      console.log('Found existing message:', existingMessage);

      // Check if the user owns this message
      console.log('Ownership check:');
      console.log('- Message sender_id:', existingMessage.sender_id);
      console.log('- Current user profile.id:', profile.id);
      console.log('- Match:', existingMessage.sender_id === profile.id);
      
      if (existingMessage.sender_id !== profile.id) {
        console.log('Permission denied: User does not own this message');
        return NextResponse.json({ 
          error: 'You can only edit your own messages' 
        }, { status: 403 });
      }
      
      console.log('Permission granted: User owns this message');

      // Update the message (don't manually set updated_at as it's handled by trigger)
      console.log('Updating message with ID:', messageId, 'New content:', content.trim());
      
      // First, do the update without select to ensure it works
      const { data: updateResult, error: updateError, count } = await supabase
        .from('direct_messages')
        .update({
          content: content.trim(),
          is_edited: true
        })
        .eq('id', messageId)
        .select('id, content, is_edited');

      console.log('Update operation result:', { updateResult, updateError, count });

      if (updateError) {
        console.error('Error updating message:', updateError);
        console.error('Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        return NextResponse.json({ 
          error: 'Failed to update message',
          details: updateError.message 
        }, { status: 500 });
      }

      // Check if the update actually affected any rows
      if (!updateResult || updateResult.length === 0) {
        console.error('Update operation did not affect any rows');
        return NextResponse.json({ 
          error: 'Message update failed - no rows affected',
          details: 'The message may not exist or you may not have permission to update it'
        }, { status: 404 });
      }

      console.log('Update successful, affected rows:', updateResult.length);
      console.log('Updated data from UPDATE query:', updateResult[0]);

      // Use the data directly from the UPDATE query
      const basicUpdatedMessage = updateResult[0];
      
      // Get the complete message data including timestamps
      const { data: completeMessage, error: selectError } = await supabase
        .from('direct_messages')
        .select(`
          id,
          content,
          sender_id,
          message_type,
          created_at,
          delivered_at,
          is_edited,
          attachment_id,
          updated_at
        `)
        .eq('id', messageId)
        .single();

      console.log('Complete message fetch result:', { completeMessage, selectError });

      // Get sender info
      const { data: senderInfo } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', (completeMessage as any)?.sender_id ?? (basicUpdatedMessage as any).sender_id)
        .single();

      console.log('Sender info:', senderInfo);

      // Use the updated content from the UPDATE result, but other fields from complete fetch
      const finalMessage = {
        ...completeMessage,
        content: basicUpdatedMessage.content, // Use the updated content
        is_edited: basicUpdatedMessage.is_edited // Use the updated is_edited flag
      } as any;

      console.log('Final message to transform:', finalMessage);

      // Transform the updated message to match expected format
      const transformedMessage = {
        id: finalMessage.id.toString(),
        content: finalMessage.content,
        senderId: finalMessage.sender_id.toString(),
        senderName: senderInfo?.display_name || 'You',
        senderAvatar: senderInfo?.avatar_url,
        timestamp: finalMessage.created_at,
        deliveredAt: finalMessage.delivered_at,
        type: finalMessage.message_type || 'text',
        isFromMe: true,
        status: 'sent' as const,
        isEdited: finalMessage.is_edited || false,
        attachmentId: finalMessage.attachment_id,
      };

      console.log('=== PATCH MESSAGE SUCCESS ===');
      console.log('Transformed message:', transformedMessage);
      return NextResponse.json({ message: transformedMessage });
    }
  } catch (error) {
    console.error('=== PATCH MESSAGE ERROR ===');
    console.error('Error editing message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const { conversationId, messageId } = await params;
    
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

    // Detect conversation type
    const isGroupConversation = typeof conversationId === 'string' && conversationId.startsWith('group_');

    if (isGroupConversation) {
      // GROUP message delete
      const groupId = parseInt(conversationId.replace('group_', ''));
      if (Number.isNaN(groupId)) {
        return NextResponse.json({ error: 'Invalid group conversation id' }, { status: 400 });
      }

      // Verify membership
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

      // Verify the message exists and belongs to the current user
      const { data: existingMessage, error: messageError } = await supabase
        .from('group_messages')
        .select('id, sender_id, conversation_id, is_deleted')
        .eq('id', messageId)
        .eq('conversation_id', groupId)
        .eq('is_deleted', false)
        .single();

      if (messageError || !existingMessage) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      if (existingMessage.sender_id !== profile.id) {
        return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
      }

      // Soft delete the message
      const { error: deleteError } = await supabase
        .from('group_messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (deleteError) {
        console.error('Error deleting group message:', deleteError);
        return NextResponse.json({ error: 'Failed to delete message', details: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } else {
      // DIRECT message delete (existing behavior)
      // Verify the message exists and belongs to the current user
      const { data: existingMessage, error: messageError } = await supabase
        .from('direct_messages')
        .select('id, sender_id, is_deleted')
        .eq('id', messageId)
        .eq('is_deleted', false)
        .single();

      if (messageError || !existingMessage) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      // Check if the user owns this message
      if (existingMessage.sender_id !== profile.id) {
        return NextResponse.json({ 
          error: 'You can only delete your own messages' 
        }, { status: 403 });
      }

      // Soft delete the message
      const { error: deleteError } = await supabase
        .from('direct_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (deleteError) {
        console.error('Error deleting message:', deleteError);
        console.error('Delete error details:', {
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          code: deleteError.code
        });
        return NextResponse.json({ 
          error: 'Failed to delete message',
          details: deleteError.message 
        }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
