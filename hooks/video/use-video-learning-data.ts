"use client";

import { useQuery } from "@tanstack/react-query";

export interface VideoHistoryItem {
  public_id: string;
  question: string;
  answer: string;
  video_time: number;
  context_segments?: { segments?: unknown[]; sources?: VideoSource[] } | unknown[];
  created_at: string;
}

export interface VideoSource {
  type?: string;
  title?: string;
  url?: string;
  contentPreview?: string;
  startTime?: number;
  endTime?: number;
  timestamp?: number;
}

export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load video data");
  return response.json();
}

export function useVideoQAHistory(lessonId?: string, enabled = true) {
  return useQuery({
    queryKey: ["video-qa-history", lessonId],
    queryFn: () => getJson<{ history: VideoHistoryItem[] }>(`/api/video/qa-history?lessonId=${lessonId}`),
    enabled: Boolean(lessonId) && enabled,
  });
}

export function useVideoTranscript(lessonId?: string) {
  return useQuery({
    queryKey: ["video-transcript", lessonId],
    queryFn: () => getJson<{ segments: TranscriptSegment[] }>(`/api/video/transcript?lessonId=${lessonId}`),
    enabled: Boolean(lessonId),
    staleTime: 10 * 60 * 1000,
  });
}
