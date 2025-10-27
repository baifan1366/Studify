import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";
import redis from "@/utils/redis/redis";

/**
 * Chat Conversations API
 * GET /api/chat/conversations - Get all conversations for current user
 * POST /api/chat/conversations - Create new conversation
 */

// Helper function to get online status for multiple users
async function getUsersOnlineStatus(userIds: string[]) {
  if (userIds.length === 0) return {};

  try {
    const pipeline = userIds
      .map((userId) => [
        redis.get(`user:online:${userId}`),
        redis.get(`user:lastseen:${userId}`),
      ])
      .flat();

    const results = await Promise.all(pipeline);
    const statusMap: Record<
      string,
      { isOnline: boolean; lastSeen: number | null }
    > = {};

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const onlineStatus = results[i * 2];
      const lastSeenTimestamp = results[i * 2 + 1];

      statusMap[userId] = {
        isOnline: onlineStatus === "true" || onlineStatus === true,
        lastSeen: lastSeenTimestamp
          ? parseInt(lastSeenTimestamp as string)
          : null,
      };
    }

    return statusMap;
  } catch (error) {
    console.error("Failed to get users online status:", error);
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize(["student", "tutor"]);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Fetch direct conversations
    const { data: directConversations, error: directError } = await supabase
      .from("direct_conversations")
      .select(
        `
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
          message_type,
          is_deleted
        )
      `
      )
      .eq("is_deleted", false)
      .or(`participant1_id.eq.${profile.id},participant2_id.eq.${profile.id}`)
      .order("updated_at", { ascending: false });

    // Fetch group conversations (handle case where tables don't exist yet)
    let groupConversations: any[] = [];
    let groupError = null;

    try {
      const { data, error } = await supabase
        .from("group_conversations")
        .select(
          `
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
          ),
          last_message:group_messages (
            id,
            content,
            sender_id,
            created_at,
            message_type,
            is_deleted
          )
        `
        )
        .eq("is_deleted", false);

      groupConversations = data || [];
      groupError = error;

      // Log if group tables don't exist
      if (error && error.message.includes("does not exist")) {
        console.log(
          "Group conversations tables not found - only showing direct conversations"
        );
      }
    } catch (e) {
      console.log("Group conversations not available:", e);
      groupConversations = [];
    }

    if (directError) {
      console.error("Error fetching direct conversations:", directError);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Filter group conversations where user is a member
    const userGroupConversations =
      groupConversations?.filter(
        (group) =>
          Array.isArray(group.group_members) &&
          group.group_members.some(
            (member: any) => member.user_id === profile.id && !member.left_at
          )
      ) || [];

    console.log(
      `Found ${directConversations?.length || 0} direct and ${
        userGroupConversations.length
      } group conversations`
    );

    // Get all participant user IDs for online status lookup
    // Note: We need to get the actual user_id from profiles, not the profile id
    const participantProfileIds =
      directConversations
        ?.map((conv) => {
          const isParticipant1 = conv.participant1_id === profile.id;
          return isParticipant1 ? conv.participant2_id : conv.participant1_id;
        })
        .filter(Boolean) || [];

    // Get user_ids from profile_ids for online status lookup and create mapping
    let participantUserIds: string[] = [];
    const profileToUserMap: Record<string, string> = {};

    if (participantProfileIds.length > 0) {
      const { data: participantProfiles } = await supabase
        .from("profiles")
        .select("id, user_id")
        .in("id", participantProfileIds);

      participantProfiles?.forEach((p) => {
        profileToUserMap[p.id.toString()] = p.user_id;
      });

      participantUserIds = participantProfiles?.map((p) => p.user_id) || [];
    }

    // Get online status for all participants
    const onlineStatusMap = await getUsersOnlineStatus(participantUserIds);

    // Transform direct conversations
    const directConversationsList =
      directConversations?.map((conv) => {
        // Determine who the other participant is
        const isParticipant1 = conv.participant1_id === profile.id;
        const otherParticipant = isParticipant1
          ? conv.participant2
          : conv.participant1;
        const otherParticipantId = isParticipant1
          ? conv.participant2_id
          : conv.participant1_id;

        // Get the latest message
        const lastMessage =
          Array.isArray(conv.last_message) && conv.last_message.length > 0
            ? conv.last_message.sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )[0]
            : null;

        // Get real online status from Redis using user_id
        const participantUserId =
          profileToUserMap[otherParticipantId.toString()];
        const onlineStatus = participantUserId
          ? onlineStatusMap[participantUserId]
          : null;
        const finalOnlineStatus = onlineStatus || {
          isOnline: false,
          lastSeen: null,
        };

        return {
          id: `user_${otherParticipantId}`,
          type: "direct" as const,
          participant: {
            id: otherParticipantId.toString(),
            name: Array.isArray(otherParticipant)
              ? (otherParticipant[0] as any)?.display_name || "Unknown User"
              : (otherParticipant as any)?.display_name || "Unknown User",
            avatar: Array.isArray(otherParticipant)
              ? (otherParticipant[0] as any)?.avatar_url
              : (otherParticipant as any)?.avatar_url,
            isOnline: finalOnlineStatus.isOnline,
            lastSeen: finalOnlineStatus.lastSeen
              ? new Date(finalOnlineStatus.lastSeen).toISOString()
              : undefined,
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                timestamp: lastMessage.created_at,
                isFromMe: lastMessage.sender_id === profile.id,
                isDeleted: lastMessage.is_deleted || false,
              }
            : null,
          unreadCount: 0, // TODO: Implement unread count logic
        };
      }) || [];

    // Transform group conversations
    const groupConversationsList = userGroupConversations.map((group: any) => {
      const memberCount = Array.isArray(group.group_members)
        ? group.group_members.filter((member: any) => !member.left_at).length
        : 0;

      // Get the latest message
      const lastMessage =
        Array.isArray(group.last_message) && group.last_message.length > 0
          ? group.last_message.sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0]
          : null;

      return {
        id: `group_${group.id}`,
        type: "group" as const,
        participant: {
          id: group.id.toString(),
          name: group.name,
          avatar: group.avatar_url,
          isOnline: true, // Groups are always "online"
          lastSeen: undefined,
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              timestamp: lastMessage.created_at,
              isFromMe: lastMessage.sender_id === profile.id,
              isDeleted: lastMessage.is_deleted || false,
            }
          : null,
        unreadCount: 0, // TODO: Implement unread count logic
        memberCount: memberCount,
        description: group.description,
      };
    });

    // Combine both types of conversations
    const allConversations = [
      ...directConversationsList,
      ...groupConversationsList,
    ].sort((a, b) => {
      // Sort by last message timestamp or creation time
      const aTime =
        a.lastMessage?.timestamp || a.type === "group"
          ? new Date().toISOString()
          : "";
      const bTime =
        b.lastMessage?.timestamp || b.type === "group"
          ? new Date().toISOString()
          : "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    console.log(
      `Returning ${allConversations.length} total conversations (${directConversationsList.length} direct, ${groupConversationsList.length} group)`
    );

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
    console.error("Error in conversations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize(["student", "tutor"]);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const { participant_id, message } = await request.json();

    if (!participant_id) {
      return NextResponse.json(
        {
          error: "participant_id is required",
        },
        { status: 400 }
      );
    }

    // Get participant details from profiles table
    const { data: participant, error: participantError } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url")
      .eq("id", participant_id)
      .single();

    if (participantError || !participant) {
      console.error("Participant not found:", participantError);
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Check if participant is not the same as current user
    if (participant.id === profile.id) {
      return NextResponse.json(
        { error: "Cannot create conversation with yourself" },
        { status: 400 }
      );
    }

    // Use the database function to create or get existing conversation
    const { data: conversationIdResult, error: createError } =
      await supabase.rpc("create_or_get_conversation", {
        user1_id: profile.id,
        user2_id: participant_id,
      });

    if (createError) {
      console.error("Error creating conversation:", createError);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    const conversationId = conversationIdResult;

    // If there's an initial message, create it
    if (message) {
      const { error: messageError } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content: message,
          message_type: "text",
        });

      if (messageError) {
        console.error("Error creating initial message:", messageError);
        // Continue anyway, conversation was created successfully
      }
    }

    // Get real online status for the participant using their user_id
    const participantOnlineStatus = await getUsersOnlineStatus([
      participant.user_id,
    ]);
    const onlineStatus = participantOnlineStatus[participant.user_id] || {
      isOnline: false,
      lastSeen: null,
    };

    // Return conversation object that matches the expected format
    const conversation = {
      id: `user_${participant_id}`,
      type: "direct",
      participant: {
        id: participant.id.toString(),
        name: participant.display_name || "Unknown User",
        avatar: participant.avatar_url,
        isOnline: onlineStatus.isOnline,
        lastSeen: onlineStatus.lastSeen
          ? new Date(onlineStatus.lastSeen).toISOString()
          : undefined,
      },
      lastMessage: message
        ? {
            content: message,
            timestamp: new Date().toISOString(),
            isFromMe: true,
          }
        : {
            content: "Conversation started",
            timestamp: new Date().toISOString(),
            isFromMe: false,
          },
      unreadCount: 0,
    };

    console.log("Created conversation with ID:", conversationId);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize(["student", "tutor"]);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const { conversationId, type } = await request.json();

    if (!conversationId || !type) {
      return NextResponse.json(
        { error: "conversationId and type are required" },
        { status: 400 }
      );
    }

    if (type === "direct") {
      // Normalize conversationId: can be numeric internal id or 'user_{participantId}'
      let directConversationId: number | null = null;
      let otherParticipantId: number | null = null;

      if (
        typeof conversationId === "string" &&
        conversationId.startsWith("user_")
      ) {
        // Extract other participant profile id
        const pid = parseInt(conversationId.replace("user_", ""));
        if (Number.isNaN(pid)) {
          return NextResponse.json(
            { error: "Invalid direct conversation id" },
            { status: 400 }
          );
        }
        otherParticipantId = pid;
        // Use RPC to get or create the conversation internal id
        const { data: convIdFromRpc, error: rpcError } = await supabase.rpc(
          "create_or_get_conversation",
          {
            user1_id: profile.id,
            user2_id: otherParticipantId,
          }
        );
        if (rpcError || !convIdFromRpc) {
          console.error(
            "Error resolving direct conversation via RPC:",
            rpcError
          );
          return NextResponse.json(
            { error: "Conversation not found" },
            { status: 404 }
          );
        }
        directConversationId = convIdFromRpc as number;
      } else if (typeof conversationId === "number") {
        directConversationId = conversationId;
      } else if (
        typeof conversationId === "string" &&
        /^\d+$/.test(conversationId)
      ) {
        directConversationId = parseInt(conversationId, 10);
      }

      if (!directConversationId) {
        return NextResponse.json(
          { error: "Invalid conversation id" },
          { status: 400 }
        );
      }

      // Check ownership (must be participant)
      const { data: conv, error: convError } = await supabase
        .from("direct_conversations")
        .select("id, participant1_id, participant2_id, is_deleted")
        .eq("id", directConversationId)
        .single();

      if (convError || !conv) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      if (
        conv.participant1_id !== profile.id &&
        conv.participant2_id !== profile.id
      ) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      // Soft delete
      const { error: updateError } = await supabase
        .from("direct_conversations")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", directConversationId);

      if (updateError) {
        console.error("Error deleting direct conversation:", updateError);
        return NextResponse.json(
          { error: "Failed to delete conversation" },
          { status: 500 }
        );
      }
    } else if (type === "group") {
      // Normalize group id: can be numeric internal id or 'group_{id}'
      let groupId: number | null = null;
      if (
        typeof conversationId === "string" &&
        conversationId.startsWith("group_")
      ) {
        const gid = parseInt(conversationId.replace("group_", ""));
        if (!Number.isNaN(gid)) groupId = gid;
      } else if (typeof conversationId === "number") {
        groupId = conversationId;
      } else if (
        typeof conversationId === "string" &&
        /^\d+$/.test(conversationId)
      ) {
        groupId = parseInt(conversationId, 10);
      }

      if (!groupId) {
        return NextResponse.json(
          { error: "Invalid group conversation id" },
          { status: 400 }
        );
      }

      // Check membership
      const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("id")
        .eq("conversation_id", groupId)
        .eq("user_id", profile.id)
        .is("left_at", null)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: "Not a member of this group" },
          { status: 403 }
        );
      }

      // Soft delete
      const { error: updateError } = await supabase
        .from("group_conversations")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", groupId);

      if (updateError) {
        console.error("Error deleting group conversation:", updateError);
        return NextResponse.json(
          { error: "Failed to delete conversation" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
