"use client";

import { Search, Play, Loader2, Languages } from "lucide-react";
import { useState } from "react";
import { useTranslateTranscript, useVideoTranscript } from "@/hooks/video/use-video-learning-data";

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export function VideoTranscriptList({ lessonId, currentTime, onSeekTo }: { lessonId: string; currentTime: number; onSeekTo?: (time: number) => void }) {
  const { data, isLoading } = useVideoTranscript(lessonId);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const translate = useTranslateTranscript();
  const sourceSegments = translate.data?.segments ?? data?.segments ?? [];
  const segments = sourceSegments.filter((item) => item.text.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-3 p-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transcript" className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>
      <div className="flex gap-2">
        <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Translate to any language…" className="h-9 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
        <button onClick={() => data?.segments?.length && translate.mutate({ segments: data.segments, targetLanguage: language })} disabled={!language.trim() || !data?.segments?.length || translate.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-medium text-white disabled:opacity-50">
          {translate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}Translate
        </button>
      </div>
      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : segments.length ? (
        <div className="space-y-1">
          {segments.map((segment) => {
            const active = currentTime >= segment.startTime && currentTime < segment.endTime;
            return (
              <button key={segment.id} onClick={() => onSeekTo?.(segment.startTime)} className={`group flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors ${active ? "bg-blue-500/10 ring-1 ring-blue-500/20" : "hover:bg-muted"}`}>
                <span className={`mt-0.5 inline-flex min-w-14 items-center gap-1 font-mono text-xs font-semibold ${active ? "text-blue-500" : "text-muted-foreground"}`}><Play className="h-3 w-3" />{time(segment.startTime)}</span>
                <span className="text-sm leading-6 text-foreground/90">{segment.text}</span>
              </button>
            );
          })}
        </div>
      ) : <p className="p-8 text-center text-sm text-muted-foreground">Sorry, there is no video transcript available.</p>}
    </div>
  );
}
