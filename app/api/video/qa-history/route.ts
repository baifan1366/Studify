import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createAdminClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await authorize("student");
  if (auth instanceof NextResponse) return auth;

  const userId = auth.user.profile?.id;
  const lessonId = request.nextUrl.searchParams.get("lessonId");
  if (!userId || !lessonId) {
    return NextResponse.json({ error: "Missing lesson or profile" }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data: lesson } = await supabase
    .from("course_lesson")
    .select("id")
    .eq("public_id", lessonId)
    .single();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("video_qa_history")
    .select("public_id, question, answer, video_time, context_segments, created_at")
    .eq("user_id", userId)
    .eq("lesson_id", lesson.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data ?? [] });
}
