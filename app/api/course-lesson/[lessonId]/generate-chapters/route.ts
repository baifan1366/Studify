import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createClient } from "@/utils/supabase/server";
import { getLLM } from "@/lib/langChain/client";

type GeneratedChapter = {
  title: string;
  description?: string;
  start_time_sec: number;
  end_time_sec: number;
};

function parseGeneratedChapters(text: string): GeneratedChapter[] {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The model did not return valid chapter JSON");
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
    throw new Error("The model did not return any chapters");
  }
  return parsed.chapters
    .map((chapter: any) => ({
      title: String(chapter.title || "").trim(),
      description: String(chapter.description || "").trim(),
      start_time_sec: Math.max(0, Math.floor(Number(chapter.start_time_sec))),
      end_time_sec: Math.max(0, Math.floor(Number(chapter.end_time_sec))),
    }))
    .filter(
      (chapter: GeneratedChapter) =>
        chapter.title &&
        Number.isFinite(chapter.start_time_sec) &&
        Number.isFinite(chapter.end_time_sec) &&
        chapter.end_time_sec > chapter.start_time_sec
    )
    .sort((a: GeneratedChapter, b: GeneratedChapter) => a.start_time_sec - b.start_time_sec);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const authResult = await authorize("tutor");
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { lessonId } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();
    const ownerId = authResult.user.profile?.id;
    const lessonColumn = /^\d+$/.test(lessonId) ? "id" : "public_id";
    const { data: lesson, error: lessonError } = await supabase
      .from("course_lesson")
      .select("id, title, duration_sec, transcript, course:course_id(owner_id, status)")
      .eq(lessonColumn, lessonId)
      .eq("is_deleted", false)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
    if (!ownerId || course?.owner_id !== ownerId) {
      return NextResponse.json({ error: "You can only generate chapters for your own course" }, { status: 403 });
    }
    if (course?.status !== "inactive") {
      return NextResponse.json({ error: "Chapters can only be generated while the course is inactive" }, { status: 409 });
    }

    const { data: segments } = await supabase
      .from("video_segments")
      .select("start_time, end_time, text")
      .eq("lesson_id", lesson.id)
      .order("start_time", { ascending: true })
      .limit(500);
    if (!segments?.length) {
      return NextResponse.json(
        { error: "Timed transcript is not ready. Finish video processing before generating chapters." },
        { status: 409 }
      );
    }

    const transcript = segments
      .map((segment) => `[${Math.floor(segment.start_time || 0)}-${Math.ceil(segment.end_time || 0)}s] ${segment.text}`)
      .join("\n")
      .slice(0, 42000);
    const model = await getLLM({ streaming: false, temperature: 0.15, maxTokens: 3500 });
    const response = await model.invoke(`You are an expert instructional video editor.
Split this lesson into 3-12 meaningful, non-overlapping chapters based on topic changes.
Use only timestamps present in the transcript. Cover the video in chronological order.
Titles must be specific and concise; descriptions must state what the learner will understand.
The first chapter should begin near the first transcript timestamp and adjacent chapters should not overlap.

Return JSON only:
{"chapters":[{"title":"Specific topic","description":"What is covered","start_time_sec":0,"end_time_sec":120}]}

Lesson: ${lesson.title}
Known duration: ${lesson.duration_sec || "unknown"} seconds

TIMED TRANSCRIPT:
${transcript}`);
    const raw = typeof response.content === "string"
      ? response.content
      : response.content.map((part: any) => part.text || "").join("");
    const generated = parseGeneratedChapters(raw);
    if (generated.length < 2) {
      throw new Error("The model returned too few useful chapters");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("course_chapter")
      .insert(
        generated.map((chapter, index) => ({
          lesson_id: lesson.id,
          ...chapter,
          order_index: index + 1,
        }))
      )
      .select("*");
    if (insertError) throw insertError;

    if (body.replaceExisting !== false) {
      const insertedIds = (inserted || []).map((chapter) => chapter.id);
      const { data: existing } = await supabase
        .from("course_chapter")
        .select("id")
        .eq("lesson_id", lesson.id)
        .eq("is_deleted", false);
      const oldIds = (existing || [])
        .map((chapter) => chapter.id)
        .filter((id) => !insertedIds.includes(id));
      if (oldIds.length) {
        await supabase
          .from("course_chapter")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .in("id", oldIds);
      }
    }

    return NextResponse.json({ chapters: inserted || [], aiGenerated: true });
  } catch (error) {
    console.error("AI chapter generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate chapters" },
      { status: 502 }
    );
  }
}
