import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const supabase = await createServerClient();

  // 插入签到表（community_checkin）
  await supabase.from("community_checkin").insert({
    user_id: userId,
  });

  return NextResponse.json({ success: true });
}
