import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/server";
import { getLLM } from "@/lib/langChain/client";
import { loadVideoTranscriptSegments } from "@/lib/video-processing/transcript-source";

type ArtifactType = "note" | "mind_map" | "quiz";

const artifactInstructions: Record<ArtifactType, string> = {
  note: `Create concise but complete study notes in Markdown. Use headings, bullets, key terms, and a short recap.
Return JSON only: {"title":"...","markdown":"..."}`,
  mind_map: `Create a NotebookLM-style branching mind map grounded only in the transcript. Start with one central root concept, create 3-6 distinct main-topic branches, and add concise child concepts beneath each branch. Return 10-24 nodes across 2-4 hierarchy levels. Prefer a clear parent-child tree; add a cross-topic edge only when it reveals an important connection. Use stable alphanumeric ids, short labels, useful one-sentence descriptions, and set each node's numeric level. Do not return Mermaid.
Return JSON only: {"title":"...","graph":{"nodes":[{"id":"root","label":"Main idea","description":"...","level":0}],"edges":[{"source":"root","target":"concept_1","label":"leads to"}]}}`,
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

  let artifactQuery = context.supabase
    .from("video_learning_artifacts")
    .select("public_id, artifact_type, title, content, source_timestamp_sec, generation_status, created_at, updated_at, lesson:course_lesson(title, public_id)")
    .eq("user_id", context.profile.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  let noteQuery = context.supabase
    .from("course_notes")
    .select("public_id, title, content, timestamp_sec, created_at, updated_at, lesson:course_lesson(title, public_id)")
    .eq("user_id", context.profile.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (lessonInternalId) {
    artifactQuery = artifactQuery.eq("lesson_id", lessonInternalId);
    noteQuery = noteQuery.eq("lesson_id", lessonInternalId);
  }

  const [{ data: artifactRows, error: artifactError }, { data: noteRows, error: noteError }] =
    await Promise.all([artifactQuery, noteQuery]);
  if (artifactError || noteError) {
    return NextResponse.json({ error: artifactError?.message || noteError?.message }, { status: 500 });
  }

  const notes = (noteRows || []).map((note) => ({
    public_id: note.public_id,
    artifact_type: "note" as const,
    source_kind: "course_note" as const,
    title: note.title || "Study note",
    content: { markdown: note.content },
    source_timestamp_sec: note.timestamp_sec,
    created_at: note.created_at,
    updated_at: note.updated_at,
    lesson: note.lesson,
  }));
  const artifacts = (artifactRows || []).map((artifact) => ({
    ...artifact,
    source_kind: "video_artifact" as const,
  }));
  return NextResponse.json({
    artifacts: [...notes, ...artifacts].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ),
  });
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
  let response;
  try {
    response = await model.invoke(`${artifactInstructions[type]}

Lesson: ${lesson.title}
The learner is currently at ${Math.floor(Number(body.timestampSec || 0))} seconds.
${body.instruction ? `Learner request: ${String(body.instruction).slice(0, 500)}` : ""}

TRANSCRIPT:
${transcript}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    const modelUnavailable = /MODEL_NOT_FOUND|model is unavailable|404/i.test(message);
    console.error("Video artifact generation failed:", message);
    return NextResponse.json(
      { error: modelUnavailable ? "The AI model is temporarily unavailable. Please try again shortly." : "Could not generate this study item." },
      { status: modelUnavailable ? 503 : 502 }
    );
  }
  const raw = typeof response.content === "string"
    ? response.content
    : response.content.map((part: any) => part.text || "").join("");
  const generated = parseJson(raw);

  if (type === "note") {
    const { data: note, error: noteError } = await context.supabase
      .from("course_notes")
      .insert({
        user_id: context.profile.id,
        lesson_id: lesson.id,
        course_id: lesson.course_id ?? module?.course_id ?? null,
        timestamp_sec: Math.max(0, Math.floor(Number(body.timestampSec || 0))),
        title: generated.title || `${lesson.title} notes`,
        content: generated.markdown || "",
        tags: ["ai-generated", "video-note"],
        note_type: "ai_generated",
      })
      .select("public_id, title, content, timestamp_sec, created_at, updated_at")
      .single();
    if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 });
    return NextResponse.json({
      artifact: {
        public_id: note.public_id,
        artifact_type: "note",
        source_kind: "course_note",
        title: note.title,
        content: { markdown: note.content },
        source_timestamp_sec: note.timestamp_sec,
        created_at: note.created_at,
        updated_at: note.updated_at,
        lesson: { title: lesson.title, public_id: lessonId },
      },
    }, { status: 201 });
  }

  const artifactPayload = {
      user_id: context.profile.id,
      lesson_id: lesson.id,
      course_id: lesson.course_id ?? module?.course_id ?? null,
      artifact_type: type,
      title: generated.title || `${lesson.title} ${type.replace("_", " ")}`,
      content: generated,
      source_timestamp_sec: Math.max(0, Math.floor(Number(body.timestampSec || 0))),
      generation_status: "completed",
      updated_at: new Date().toISOString(),
  };
  const replaceArtifactId = String(body.replaceArtifactId || "");
  const artifactMutation = replaceArtifactId
    ? context.supabase
        .from("video_learning_artifacts")
        .update(artifactPayload)
        .eq("public_id", replaceArtifactId)
        .eq("user_id", context.profile.id)
        .eq("artifact_type", type)
        .is("deleted_at", null)
    : context.supabase
        .from("video_learning_artifacts")
        .insert(artifactPayload);
  const { data: artifact, error } = await artifactMutation
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
  if (body.sourceKind === "course_note") {
    const { data: note, error: noteError } = await context.supabase
      .from("course_notes")
      .update({
        title: String(body.title).slice(0, 200),
        content: String(body.content.markdown || ""),
        ai_summary: null,
        updated_at: new Date().toISOString(),
      })
      .eq("public_id", body.id)
      .eq("user_id", context.profile.id)
      .eq("is_deleted", false)
      .select("public_id, title, content, timestamp_sec, created_at, updated_at")
      .single();
    if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 });
    return NextResponse.json({
      artifact: {
        public_id: note.public_id,
        artifact_type: "note",
        source_kind: "course_note",
        title: note.title,
        content: { markdown: note.content },
        source_timestamp_sec: note.timestamp_sec,
        created_at: note.created_at,
        updated_at: note.updated_at,
      },
    });
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

export async function DELETE(request: NextRequest) {
  const context = await getContext(request);
  if ("error" in context) return context.error;
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "Artifact id is required" }, { status: 400 });
  }

  if (body.sourceKind === "course_note") {
    const { error } = await context.supabase
      .from("course_notes")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("public_id", body.id)
      .eq("user_id", context.profile.id)
      .eq("is_deleted", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await context.supabase
      .from("video_learning_artifacts")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("public_id", body.id)
      .eq("user_id", context.profile.id)
      .is("deleted_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
