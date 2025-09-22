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
