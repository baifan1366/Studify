"use client";

import { History, Loader2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVideoQAHistory, type VideoHistoryItem } from "@/hooks/video/use-video-learning-data";

export function VideoQAHistoryDialog({ lessonId, open, onOpenChange, onSelect }: { lessonId: string; open: boolean; onOpenChange: (open: boolean) => void; onSelect: (item: VideoHistoryItem) => void }) {
  const { data, isLoading } = useVideoQAHistory(lessonId, open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4 text-blue-500" />Video chat history</DialogTitle>
          <DialogDescription>Open a previous answer from this lesson.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[55vh]">
          {isLoading ? <Loader2 className="mx-auto my-12 h-5 w-5 animate-spin" /> : (
            <div className="space-y-2 p-3">
              {(data?.history ?? []).map((item) => (
                <button key={item.public_id} onClick={() => { onSelect(item); onOpenChange(false); }} className="w-full rounded-xl border p-3 text-left hover:border-blue-500/40 hover:bg-blue-500/5">
                  <p className="line-clamp-1 text-sm font-medium">{item.question}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.answer}</p>
                  <span className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{new Date(item.created_at).toLocaleString()}</span>
                </button>
              ))}
              {!data?.history?.length && <p className="py-12 text-center text-sm text-muted-foreground">No saved conversations yet.</p>}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
