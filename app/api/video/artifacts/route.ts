import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/server";
import { getLLM } from "@/lib/langChain/client";
import { loadVideoTranscriptSegments } from "@/lib/video-processing/transcript-source";

type ArtifactType = "note" | "mind_map" | "quiz";

const artifactInstructions: Record<ArtifactType, string> = {
  note: `Create concise but complete study notes in Markdown. Use headings, bullets, key terms, and a short recap.
Return JSON only: {"title":"...","markdown":"..."}`,
  mind_map: `Create a useful concept map grounded only in the transcript. The mermaid must use flowchart TD syntax, short node labels, and valid node ids.
Return JSON only: {"title":"...","mermaid":"flowchart TD\\n  A[Main idea] --> B[Concept]"}`,
  quiz: `Create 5 mixed-difficulty multiple-choice questions grounded only in the transcript. Each question must have exactly 4 options and a zero-based correctIndex.
Return JSON only: {"title":"...","questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}`,
};

function parseJson(text: string) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return a JSON object");
  return JSON.parse(match[0]);
}

async function getContext(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  return { supabase, profile };
}

export async function GET(request: NextRequest) {
  const context = await getContext(request);
  if ("error" in context) return context.error;
  const lessonId = request.nextUrl.searchParams.get("lessonId");
  let lessonInternalId: number | null = null;
  if (lessonId) {
    const lessonColumn = /^\d+$/.test(lessonId) ? "id" : "public_id";
    const { data: lesson } = await context.supabase
      .from("course_lesson").select("id").eq(lessonColumn, lessonId).single();
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    lessonInternalId = lesson.id;
  }

  let query = context.supabase
    .from("video_learning_artifacts")
    .select("public_id, artifact_type, title, content, source_timestamp_sec, generation_status, created_at, updated_at, lesson:course_lesson(title, public_id)")
    .eq("user_id", context.profile.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (lessonInternalId) query = query.eq("lesson_id", lessonInternalId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artifacts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await getContext(request);
  if ("error" in context) return context.error;
  const body = await request.json();
  const type = body.type as ArtifactType;
  const lessonId = String(body.lessonId || "");
  if (!artifactInstructions[type] || !lessonId) {
    return NextResponse.json({ error: "Valid type and lessonId are required" }, { status: 400 });
  }

  const lessonColumn = /^\d+$/.test(lessonId) ? "id" : "public_id";
  const { data: lesson } = await context.supabase
    .from("course_lesson")
    .select("id, title, module_id, course_id, attachments, transcript")
    .eq(lessonColumn, lessonId)
    .single();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { data: module } = await context.supabase
    .from("course_module").select("course_id").eq("id", lesson.module_id).maybeSingle();
  const transcriptClient = await createAdminClient();
  const segments = await loadVideoTranscriptSegments(transcriptClient, lesson);
  const transcript = segments
    .map((item) => `[${Math.floor(item.startTime)}s] ${item.text}`)
    .join("\n")
    .slice(0, 50000);
  if (!transcript) return NextResponse.json({ error: "Transcript is not ready yet" }, { status: 409 });

  const model = await getLLM({ streaming: false, temperature: 0.2, maxTokens: 5000 });
  const response = await model.invoke(`${artifactInstructions[type]}

Lesson: ${lesson.title}
The learner is currently at ${Math.floor(Number(body.timestampSec || 0))} seconds.
${body.instruction ? `Learner request: ${String(body.instruction).slice(0, 500)}` : ""}

TRANSCRIPT:
${transcript}`);
  const raw = typeof response.content === "string"
    ? response.content
    : response.content.map((part: any) => part.text || "").join("");
  const generated = parseJson(raw);

  const { data: artifact, error } = await context.supabase
    .from("video_learning_artifacts")
    .insert({
      user_id: context.profile.id,
      lesson_id: lesson.id,
      course_id: lesson.course_id ?? module?.course_id ?? null,
      artifact_type: type,
      title: generated.title || `${lesson.title} ${type.replace("_", " ")}`,
      content: generated,
      source_timestamp_sec: Math.max(0, Math.floor(Number(body.timestampSec || 0))),
      generation_status: "completed",
    })
    .select("public_id, artifact_type, title, content, source_timestamp_sec, generation_status, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artifact }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getContext(request);
  if ("error" in context) return context.error;
  const body = await request.json();
  if (!body.id || !body.title || !body.content) {
    return NextResponse.json({ error: "id, title and content are required" }, { status: 400 });
  }
  const { data, error } = await context.supabase
    .from("video_learning_artifacts")
    .update({ title: String(body.title).slice(0, 200), content: body.content, updated_at: new Date().toISOString() })
    .eq("public_id", body.id)
    .eq("user_id", context.profile.id)
    .is("deleted_at", null)
    .select("public_id, artifact_type, title, content, source_timestamp_sec, generation_status, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artifact: data });
}
