import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(): Promise<NextResponse> {
  try {
    // 1. 权限验证（假设只允许登录用户访问）
    const authResult = await authorize("student");
    if (authResult instanceof NextResponse) {
      return authResult; // 如果未授权，直接返回错误响应
    }

    // 2. 创建 Supabase Server Client
    const supabase = await createServerClient();

    // 3. 查询数据库
    const { data, error } = await supabase
      .from("community_achievement")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching achievements:", error);
      return NextResponse.json(
        { error: "Failed to fetch achievements" },
        { status: 500 }
      );
    }

    // 4. 返回结果
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
