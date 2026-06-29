import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createAdminClient } from "@/utils/supabase/server";
import { resolveVideoAttachmentId } from "@/lib/video-processing/attachment-resolver";

export async function GET(request: NextRequest) {
  const auth = await authorize("student");
  if (auth instanceof NextResponse) return auth;
  const lessonId = request.nextUrl.searchParams.get("lessonId");
  if (!lessonId) return NextResponse.json({ error: "lessonId is required" }, { status: 400 });

  const supabase = await createAdminClient();
  const { data: lesson } = await supabase
    .from("course_lesson")
    .select("id, attachments")
    .eq("public_id", lessonId)
    .single();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const attachmentId = await resolveVideoAttachmentId(supabase, lesson.attachments);
  if (attachmentId) {
    const { data } = await supabase
      .from("video_embeddings")
      .select("id, segment_index, segment_start_time, segment_end_time, content_text")
      .eq("attachment_id", attachmentId)
      .eq("is_deleted", false)
      .eq("status", "completed")
      .not("segment_index", "is", null)
      .order("segment_index", { ascending: true });
    if (data?.length) {
      const unique = new Map<string, (typeof data)[number]>();
      for (const row of data) {
        const key = `${Number(row.segment_start_time ?? 0).toFixed(3)}:${String(row.content_text).trim()}`;
        unique.set(key, row);
      }
      return NextResponse.json({
        segments: [...unique.values()].map((row) => ({
          id: String(row.id),
          startTime: Number(row.segment_start_time ?? 0),
          endTime: Number(row.segment_end_time ?? row.segment_start_time ?? 0),
          text: row.content_text,
        })),
      });
    }
  }

  const { data } = await supabase
    .from("video_segments")
    .select("id, start_time, end_time, text")
    .eq("lesson_id", lesson.id)
    .order("start_time", { ascending: true });
  return NextResponse.json({
    segments: (data ?? []).map((row) => ({
      id: String(row.id),
      startTime: Number(row.start_time ?? 0),
      endTime: Number(row.end_time ?? row.start_time ?? 0),
      text: row.text,
    })),
  });
}
