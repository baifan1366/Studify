import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

interface Params {
  params: { userId: string };
}

export async function GET(
  _req: Request,
  { params }: Params
): Promise<NextResponse> {
  try {
    // 1. 权限验证（比如：学生用户才能看自己的成就）
    const authResult = await authorize("student");
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = params;

    // 2. 创建 Supabase server client
    const supabase = await createServerClient();

    // 3. 拿到所有成就
    const { data: achievements, error: achError } = await supabase
      .from("community_achievement")
      .select("id, public_id, code, name, description, rule , created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (achError) {
      console.error("Error fetching achievements:", achError);
      return NextResponse.json(
        { error: "Failed to fetch achievements" },
        { status: 500 }
      );
    }

    // 4. 先查 profile id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId) // 这里 userId 是 uuid
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profileId = profile.id;

    // 5. 用 profileId (bigint) 查用户成就
    const { data: userAchievements, error: userError } = await supabase
      .from("community_user_achievement")
      .select("achievement_id, unlocked_at, current_value, unlocked")
      .eq("user_id", profileId)
      .eq("is_deleted", false);

    // 6. 合并结果：标记哪些成就是已解锁
    const unlockedMap = new Map(
      userAchievements?.map((ua) => [
        ua.achievement_id,
        {
          unlocked: ua.unlocked,
          unlocked_at: ua.unlocked_at,
          current_value: ua.current_value,
        },
      ]) ?? []
    );

    const result = (achievements ?? []).map((a) => ({
      ...a,
      unlocked: unlockedMap.get(a.id)?.unlocked ?? false,
      unlocked_at: unlockedMap.get(a.id)?.unlocked_at ?? null,
      current_value: unlockedMap.get(a.id)?.current_value ?? 0,
    }));

    // 6. 返回结果
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
