import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createAdminClient } from "@/utils/supabase/server";
import { loadVideoTranscriptSegments } from "@/lib/video-processing/transcript-source";

export async function GET(request: NextRequest) {
  const auth = await authorize("student");
  if (auth instanceof NextResponse) return auth;
  const lessonId = request.nextUrl.searchParams.get("lessonId");
  if (!lessonId) return NextResponse.json({ error: "lessonId is required" }, { status: 400 });

  const supabase = await createAdminClient();
  const { data: lesson } = await supabase
    .from("course_lesson")
    .select("id, attachments, transcript")
    .eq("public_id", lessonId)
    .single();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  return NextResponse.json({ segments: await loadVideoTranscriptSegments(supabase, lesson) });
}
