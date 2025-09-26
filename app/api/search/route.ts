import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = parseInt(authResult.payload.sub);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();
    const results = [];

    // 如果是聊天搜索，查找用户和群组
    if (type === "chat") {
      // 搜索用户 (排除自己)
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .neq("id", userId)
        .ilike("display_name", `%${query}%`)
        .limit(10);

      if (!usersError && users) {
        results.push(
          ...users.map((userProfile: any) => ({
            id: userProfile.id,
            type: "direct" as const,
            name: userProfile.display_name,
            avatar_url: userProfile.avatar_url,
          }))
        );
      }

      // 搜索群组 (只搜索用户参与的群组)
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

      if (!groupsError && groups) {
        results.push(
          ...groups.map((group: any) => ({
            id: group.id,
            type: "group" as const,
            name: group.name,
            avatar_url: group.avatar_url,
            member_count: group._count || 0,
          }))
        );
      }
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
