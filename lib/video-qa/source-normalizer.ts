export interface NormalizedVideoSource {
  type: string;
  title: string;
  url?: string;
  contentPreview?: string;
  startTime?: number;
  endTime?: number;
  timestamp?: number;
  confidence?: number;
}

export function normalizeVideoSources(sources: unknown): NormalizedVideoSource[] {
  if (!Array.isArray(sources)) return [];

  return sources.map((source: any, index) => {
    const type = source.type === "web" || source.url ? "web" : source.type || source.content_type || "course_content";
    const startTime = source.startTime ?? source.segment_start_time ?? source.timestamp;
    const endTime = source.endTime ?? source.segment_end_time;
    const preview = source.contentPreview ?? source.content_text ?? source.content ?? source.snippet;

    return {
      type,
      title: source.title ?? source.section_title ?? (type === "web" ? `Web source ${index + 1}` : `Lesson source ${index + 1}`),
      ...(source.url ? { url: source.url } : {}),
      ...(preview ? { contentPreview: String(preview).slice(0, 500) } : {}),
      ...(typeof startTime === "number" ? { startTime, timestamp: startTime } : {}),
      ...(typeof endTime === "number" ? { endTime } : {}),
      ...(typeof source.score === "number" ? { confidence: source.score } : {}),
    };
  });
}
