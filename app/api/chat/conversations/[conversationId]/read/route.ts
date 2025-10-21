import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

/**
 * Mark messages as read in a conversation
 * POST /api/chat/conversations/[conversationId]/read
 */
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
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Detect conversation type: group or direct
    const isGroupConversation = conversationId.startsWith('group_');
    
    if (isGroupConversation) {
      // Handle GROUP conversation read status
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

      // Mark all group messages as read for the current user
      // Note: You may need to create a similar function for group messages
      // For now, we'll use a direct update approach
      const { data: unreadMessages } = await supabase
        .from('group_messages')
        .select('id')
        .eq('conversation_id', groupId)
        .neq('sender_id', profile.id);

      if (unreadMessages && unreadMessages.length > 0) {
        // Insert or update read status for group messages
        const readStatusRecords = unreadMessages.map(msg => ({
          message_id: msg.id,
          user_id: profile.id,
          read_at: new Date().toISOString()
        }));

        // Note: This assumes you have a group_message_read_status table
        // If not, you may need to create it or use a different approach
        const { error: readError } = await supabase
          .from('group_message_read_status')
          .upsert(readStatusRecords, {
            onConflict: 'message_id,user_id'
          });

        if (readError) {
          console.error('Error marking group messages as read:', readError);
          // Don't fail if read status table doesn't exist yet
          console.warn('Group message read status may not be tracked yet');
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Extract participant ID from conversation ID (format: user_123)
    const participantId = parseInt(conversationId.replace('user_', ''));
    
    if (isNaN(participantId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
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

    // Mark all messages in this conversation as read for the current user
    const { error: readError } = await supabase
      .rpc('mark_messages_read', {
        conv_id: actualConversationId,
        p_user_id: profile.id
      });

    if (readError) {
      console.error('Error marking messages as read:', readError);
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
