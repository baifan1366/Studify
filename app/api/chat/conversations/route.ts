import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Chat Conversations API
 * GET /api/chat/conversations - Get all conversations for current user
 * POST /api/chat/conversations - Create new conversation
 */

export async function GET(request: NextRequest) {
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

    // Fetch direct conversations
    const { data: directConversations, error: directError } = await supabase
      .from('direct_conversations')
      .select(`
        id,
        public_id,
        participant1_id,
        participant2_id,
        created_at,
        updated_at,
        participant1:profiles!direct_conversations_participant1_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        participant2:profiles!direct_conversations_participant2_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        last_message:direct_messages (
          id,
          content,
          sender_id,
          created_at,
          message_type
        )
      `)
      .eq('is_deleted', false)
      .or(`participant1_id.eq.${profile.id},participant2_id.eq.${profile.id}`)
      .order('updated_at', { ascending: false });

    // Fetch group conversations (handle case where tables don't exist yet)
    let groupConversations: any[] = [];
    let groupError = null;

    try {
      const { data, error } = await supabase
        .from('group_conversations')
        .select(`
          id,
          name,
          description,
          avatar_url,
          created_at,
          updated_at,
          created_by,
          group_members!group_members_conversation_id_fkey (
            user_id,
            role,
            left_at,
            profiles!group_members_user_id_fkey (
              id,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('is_deleted', false);

      groupConversations = data || [];
      groupError = error;

      // Log if group tables don't exist
      if (error && error.message.includes('does not exist')) {
        console.log('Group conversations tables not found - only showing direct conversations');
      }
    } catch (e) {
      console.log('Group conversations not available:', e);
      groupConversations = [];
    }

    if (directError) {
      console.error('Error fetching direct conversations:', directError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Filter group conversations where user is a member
    const userGroupConversations = groupConversations?.filter(group => 
      Array.isArray(group.group_members) && 
      group.group_members.some((member: any) => 
        member.user_id === profile.id && !member.left_at
      )
    ) || [];

    console.log(`Found ${directConversations?.length || 0} direct and ${userGroupConversations.length} group conversations`);

    // Transform direct conversations
    const directConversationsList = directConversations?.map(conv => {
      // Determine who the other participant is
      const isParticipant1 = conv.participant1_id === profile.id;
      const otherParticipant = isParticipant1 ? conv.participant2 : conv.participant1;
      const otherParticipantId = isParticipant1 ? conv.participant2_id : conv.participant1_id;
      
      // Get the latest message
      const lastMessage = Array.isArray(conv.last_message) && conv.last_message.length > 0 
        ? conv.last_message.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;

      return {
        id: `user_${otherParticipantId}`,
        type: 'direct' as const,
        participant: {
          id: otherParticipantId.toString(),
          name: Array.isArray(otherParticipant) 
            ? (otherParticipant[0] as any)?.display_name || 'Unknown User'
            : (otherParticipant as any)?.display_name || 'Unknown User',
          avatar: Array.isArray(otherParticipant) 
            ? (otherParticipant[0] as any)?.avatar_url
            : (otherParticipant as any)?.avatar_url,
          isOnline: Math.random() > 0.5, // Mock online status - replace with real presence
        },
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.created_at,
          isFromMe: lastMessage.sender_id === profile.id,
        } : null,
        unreadCount: 0, // TODO: Implement unread count logic
      };
    }) || [];

    // Transform group conversations
    const groupConversationsList = userGroupConversations.map((group: any) => {
      const memberCount = Array.isArray(group.group_members) 
        ? group.group_members.filter((member: any) => !member.left_at).length 
        : 0;

      return {
        id: `group_${group.id}`,
        type: 'group' as const,
        participant: {
          id: group.id.toString(),
          name: group.name,
          avatar: group.avatar_url,
          isOnline: true, // Groups are always "online"
          lastSeen: undefined,
        },
        lastMessage: null, // TODO: Implement group last message
        unreadCount: 0, // TODO: Implement unread count logic
        memberCount: memberCount,
        description: group.description,
      };
    });

    // Combine both types of conversations
    const allConversations = [...directConversationsList, ...groupConversationsList]
      .sort((a, b) => {
        // Sort by last message timestamp or creation time
        const aTime = a.lastMessage?.timestamp || a.type === 'group' ? new Date().toISOString() : '';
        const bTime = b.lastMessage?.timestamp || b.type === 'group' ? new Date().toISOString() : '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

    console.log(`Returning ${allConversations.length} total conversations (${directConversationsList.length} direct, ${groupConversationsList.length} group)`);

    return NextResponse.json({
      conversations: allConversations,
      pagination: {
        total: allConversations.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });

  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { participant_id, message } = await request.json();

    if (!participant_id) {
      return NextResponse.json({ 
        error: 'participant_id is required' 
      }, { status: 400 });
    }

    // Get participant details from profiles table
    const { data: participant, error: participantError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', participant_id)
      .single();

    if (participantError || !participant) {
      console.error('Participant not found:', participantError);
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Check if participant is not the same as current user
    if (participant.id === profile.id) {
      return NextResponse.json({ error: 'Cannot create conversation with yourself' }, { status: 400 });
    }

    // Use the database function to create or get existing conversation
    const { data: conversationIdResult, error: createError } = await supabase
      .rpc('create_or_get_conversation', {
        user1_id: profile.id,
        user2_id: participant_id
      });

    if (createError) {
      console.error('Error creating conversation:', createError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    const conversationId = conversationIdResult;

    // If there's an initial message, create it
    if (message) {
      const { error: messageError } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content: message,
          message_type: 'text'
        });

      if (messageError) {
        console.error('Error creating initial message:', messageError);
        // Continue anyway, conversation was created successfully
      }
    }
    
    // Return conversation object that matches the expected format
    const conversation = {
      id: `user_${participant_id}`,
      type: 'direct',
      participant: {
        id: participant.id.toString(),
        name: participant.display_name || 'Unknown User',
        avatar: participant.avatar_url,
        isOnline: Math.random() > 0.5, // Mock online status - replace with real presence
      },
      lastMessage: message ? {
        content: message,
        timestamp: new Date().toISOString(),
        isFromMe: true,
      } : {
        content: 'Conversation started',
        timestamp: new Date().toISOString(),
        isFromMe: false,
      },
      unreadCount: 0,
    };

    console.log('Created conversation with ID:', conversationId);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
