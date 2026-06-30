import { resolveVideoAttachmentId } from "@/lib/video-processing/attachment-resolver";

export type VideoTranscriptSegment = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
};

type LessonTranscriptSource = {
  id: number;
  attachments?: unknown;
  transcript?: string | null;
};

export async function loadVideoTranscriptSegments(
  supabase: any,
  lesson: LessonTranscriptSource
): Promise<VideoTranscriptSegment[]> {
  const attachmentId = await resolveVideoAttachmentId(supabase, lesson.attachments);

  if (attachmentId) {
    const { data, error } = await supabase
      .from("video_embeddings")
      .select("id, segment_index, segment_start_time, segment_end_time, content_text")
      .eq("attachment_id", attachmentId)
      .eq("is_deleted", false)
      .eq("status", "completed")
      .not("segment_index", "is", null)
      .order("segment_index", { ascending: true });

    if (error) console.warn("[TranscriptSource] video_embeddings query failed:", error.message);
    if (data?.length) {
      const unique = new Map<string, VideoTranscriptSegment>();
      for (const row of data) {
        const text = String(row.content_text || "").trim();
        if (!text) continue;
        const startTime = Number(row.segment_start_time ?? 0);
        const segment = {
          id: String(row.id),
          startTime,
          endTime: Number(row.segment_end_time ?? startTime),
          text,
        };
        unique.set(`${startTime.toFixed(3)}:${text}`, segment);
      }
      if (unique.size > 0) return [...unique.values()];
    }
  }

  const { data: legacySegments, error: legacyError } = await supabase
    .from("video_segments")
    .select("id, start_time, end_time, text")
    .eq("lesson_id", lesson.id)
    .order("start_time", { ascending: true });

  if (legacyError) console.warn("[TranscriptSource] video_segments query failed:", legacyError.message);
  if (legacySegments?.length) {
    return legacySegments
      .filter((row: any) => String(row.text || "").trim())
      .map((row: any) => ({
        id: String(row.id),
        startTime: Number(row.start_time ?? 0),
        endTime: Number(row.end_time ?? row.start_time ?? 0),
        text: String(row.text).trim(),
      }));
  }

  const lessonTranscript = String(lesson.transcript || "").trim();
  return lessonTranscript
    ? [{ id: `lesson-${lesson.id}`, startTime: 0, endTime: 0, text: lessonTranscript }]
    : [];
}
