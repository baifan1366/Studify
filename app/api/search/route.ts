import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(request: NextRequest) {
  console.log('🔍 [Search API] Request received:', request.url);
  
  try {
    // 验证用户权限
    console.log('🔐 [Search API] Authorizing user...');
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      console.log('❌ [Search API] Authorization failed');
      return authResult;
    }
    
    // Get user profile ID  
    const userId = authResult.user.profile?.id;
    console.log('👤 [Search API] User ID:', userId);
    console.log('👤 [Search API] User profile:', JSON.stringify(authResult.user.profile, null, 2));
    
    if (!userId) {
      console.log('❌ [Search API] Profile not found');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type");
    
    console.log('📝 [Search API] Search params:', { query, type });

    if (!query || query.trim().length < 2) {
      console.log('⚠️ [Search API] Query too short or empty, returning empty results');
      return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();
    const results = [];
    
    console.log('🔎 [Search API] Starting search with query:', query, 'type:', type);

    // 如果是聊天搜索，查找用户和群组
    if (type === "chat") {
      console.log('💬 [Search API] Chat search mode activated');
      
      // 搜索用户 (排除自己)
      console.log('👥 [Search API] Searching users with query:', `%${query}%`, 'excluding userId:', userId);
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .neq("id", userId)
        .ilike("display_name", `%${query}%`)
        .limit(10);

      console.log('👥 [Search API] Users search result:', {
        found: users?.length || 0,
        error: usersError ? usersError.message : null,
        data: users
      });

      if (usersError) {
        console.error('❌ [Search API] Users search error:', usersError);
      }

      if (!usersError && users) {
        const mappedUsers = users.map((userProfile: any) => ({
          id: userProfile.id,
          type: "direct" as const,
          name: userProfile.display_name,
          avatar_url: userProfile.avatar_url,
        }));
        console.log('✅ [Search API] Mapped users:', mappedUsers);
        results.push(...mappedUsers);
      }

      // 搜索群组 (只搜索用户参与的群组)
      console.log('👥 [Search API] Searching groups with query:', `%${query}%`, 'for userId:', userId);
      const { data: groups, error: groupsError } = await supabase
        .from("group_conversations")
        .select(`
          id,
          name,
          avatar_url,
          group_conversation_members!inner(user_id),
          _count:group_conversation_members(count)
        `)
        .eq("group_conversation_members.user_id", userId)
        .ilike("name", `%${query}%`)
        .limit(10);

      console.log('👥 [Search API] Groups search result:', {
        found: groups?.length || 0,
        error: groupsError ? groupsError.message : null,
        data: groups
      });

      if (groupsError) {
        console.error('❌ [Search API] Groups search error:', groupsError);
      }

      if (!groupsError && groups) {
        const mappedGroups = groups.map((group: any) => ({
          id: group.id,
          type: "group" as const,
          name: group.name,
          avatar_url: group.avatar_url,
          member_count: group._count || 0,
        }));
        console.log('✅ [Search API] Mapped groups:', mappedGroups);
        results.push(...mappedGroups);
      }
    } else {
      console.log('⚠️ [Search API] Search type is not "chat", type received:', type);
    }

    console.log('✅ [Search API] Final results:', {
      count: results.length,
      results: results
    });

    return NextResponse.json({ results });

  } catch (error) {
    console.error("❌ [Search API] Unexpected error:", error);
    console.error("❌ [Search API] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
