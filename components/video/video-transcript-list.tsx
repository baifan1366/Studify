"use client";

import { Search, Play, Loader2 } from "lucide-react";
import { useState } from "react";
import { useVideoTranscript } from "@/hooks/video/use-video-learning-data";

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export function VideoTranscriptList({ lessonId, currentTime, onSeekTo }: { lessonId: string; currentTime: number; onSeekTo?: (time: number) => void }) {
  const { data, isLoading } = useVideoTranscript(lessonId);
  const [query, setQuery] = useState("");
  const segments = (data?.segments ?? []).filter((item) => item.text.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-3 p-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transcript" className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
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
      ) : <p className="p-8 text-center text-sm text-muted-foreground">No transcript segments found.</p>}
    </div>
  );
}
