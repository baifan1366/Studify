"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, BrainCircuit, Check, FileQuestion, Loader2, Pencil, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReactFlowMindMap } from "@/components/ai/react-flow-mind-map";
import { AIMarkdownMessage } from "@/components/video/ai-markdown-message";
import { useToast } from "@/hooks/use-toast";

export type ArtifactType = "note" | "mind_map" | "quiz";
export type Artifact = {
  public_id: string;
  artifact_type: ArtifactType;
  title: string;
  content: any;
  updated_at: string;
  source_kind?: "course_note" | "video_artifact";
  lesson?: { title?: string; public_id?: string } | null;
};

const actions = [
  { type: "note" as const, label: "Generate AI note", icon: BookOpenText },
  { type: "mind_map" as const, label: "Generate mind map", icon: BrainCircuit },
  { type: "quiz" as const, label: "Generate practice quiz", icon: FileQuestion },
];

function PracticeQuizViewer({ artifact }: { artifact: Artifact }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const questions = artifact.content.questions || [];
  const answeredCount = Object.keys(answers).length;
  const score = questions.reduce(
    (total: number, question: any, index: number) =>
      total + (answers[index] === question.correctIndex ? 1 : 0),
    0
  );

  return (
    <div className="space-y-4">
      {answeredCount > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm">
          Progress: {answeredCount}/{questions.length}
          {answeredCount === questions.length && ` · Score: ${score}/${questions.length}`}
        </div>
      )}
      {questions.map((question: any, index: number) => {
        const selected = answers[index];
        const answered = selected !== undefined;
        return (
          <div key={index} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{index + 1}. {question.question}</p>
            <div className="mt-3 grid gap-2">
              {(question.options || []).map((option: string, optionIndex: number) => {
                const isCorrect = optionIndex === question.correctIndex;
                const isSelected = optionIndex === selected;
                return (
                  <button
                    key={optionIndex}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      answered && isCorrect
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : answered && isSelected
                          ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                          : "border-border bg-muted/40 hover:border-orange-500/40 hover:bg-orange-500/5"
                    }`}
                  >
                    {answered && isCorrect && <Check className="mr-2 inline h-3.5 w-3.5" />}
                    {option}
                  </button>
                );
              })}
            </div>
            {answered && question.explanation && (
              <p className="mt-3 text-xs text-muted-foreground">{question.explanation}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ArtifactViewer({ artifact }: { artifact: Artifact }) {
  if (artifact.artifact_type === "note") {
    return <AIMarkdownMessage content={artifact.content.markdown || ""} />;
  }
  if (artifact.artifact_type === "mind_map") {
    return (
      <ReactFlowMindMap
        graph={artifact.content.graph || { nodes: [], edges: [] }}
        layout="radial"
        className="h-[620px]"
      />
    );
  }
  return <PracticeQuizViewer key={artifact.public_id} artifact={artifact} />;
}

export function VideoLearningArtifacts({
  lessonId,
  timestampSec = 0,
  library = false,
  types,
  embedded = false,
  showActions = true,
}: {
  lessonId?: string;
  timestampSec?: number;
  library?: boolean;
  types?: ArtifactType[];
  embedded?: boolean;
  showActions?: boolean;
}) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [active, setActive] = useState<Artifact | null>(null);
  const [generating, setGenerating] = useState<ArtifactType | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const { toast } = useToast();
  const typeKey = types?.join(",") || "all";

  useEffect(() => {
    const controller = new AbortController();
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : "";
    void fetch(`/api/video/artifacts${query}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const loaded = data.artifacts || [];
        setArtifacts(loaded);
        if (embedded) {
          const firstMatch = loaded.find(
            (artifact: Artifact) => !types?.length || types.includes(artifact.artifact_type)
          );
          setActive(firstMatch || null);
        }
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          toast({ title: "Could not load your study library", variant: "destructive" });
        }
      });
    return () => controller.abort();
  }, [embedded, lessonId, toast, typeKey]);

  const filteredArtifacts = useMemo(
    () => artifacts.filter((artifact) => !types?.length || types.includes(artifact.artifact_type)),
    [artifacts, typeKey]
  );

  const open = (artifact: Artifact) => {
    setActive(artifact);
    setTitle(artifact.title);
    setDraft(artifact.artifact_type === "note"
      ? artifact.content.markdown || ""
      : artifact.artifact_type === "mind_map"
        ? JSON.stringify(artifact.content.graph || { nodes: [], edges: [] }, null, 2)
        : JSON.stringify(artifact.content.questions || [], null, 2));
    setEditing(false);
  };

  const generate = async (type: ArtifactType) => {
    setGenerating(type);
    try {
      const response = await fetch("/api/video/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, lessonId, timestampSec }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setArtifacts((items) => [data.artifact, ...items]);
      open(data.artifact);
      window.dispatchEvent(
        new CustomEvent("video-learning-artifact-generated", {
          detail: { type, lessonId, artifact: data.artifact },
        })
      );
    } catch (error) {
      toast({ title: "Could not generate artifact", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const content = active.artifact_type === "note"
        ? { ...active.content, markdown: draft }
        : active.artifact_type === "mind_map"
          ? { ...active.content, graph: JSON.parse(draft) }
          : { ...active.content, questions: JSON.parse(draft) };
      const response = await fetch("/api/video/artifacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: active.public_id, title, content, sourceKind: active.source_kind }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      setArtifacts((items) => items.map((item) => item.public_id === data.artifact.public_id ? data.artifact : item));
      open(data.artifact);
      toast({ title: "Saved to your study library" });
    } catch (error) {
      toast({ title: "Could not save changes", description: error instanceof Error ? error.message : "Check the content and try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={library || embedded ? "space-y-4" : "space-y-2 border-b bg-muted/20 p-3"}>
      {showActions && !library && lessonId && <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {actions.filter((action) => !types?.length || types.includes(action.type)).map(({ type, label, icon: Icon }) => (
          <Button key={type} variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => generate(type)} disabled={!!generating}>
            {generating === type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
            {label}
          </Button>
        ))}
      </div>}
      {filteredArtifacts.length > 0 ? (
        <div className={library ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "flex gap-1.5 overflow-x-auto"}>
          {filteredArtifacts.slice(0, library ? 12 : 6).map((artifact) => {
            const Icon = artifact.artifact_type === "note" ? BookOpenText : artifact.artifact_type === "mind_map" ? BrainCircuit : FileQuestion;
            return (
            <button key={artifact.public_id} onClick={() => open(artifact)} className={library ? "rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50" : "flex shrink-0 items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-border hover:text-foreground"}>
              <div className={library ? "flex items-start gap-3" : "flex items-center gap-1"}>
                {library ? <Icon className="mt-0.5 h-5 w-5 text-violet-500" /> : <Sparkles className="h-3 w-3" />}
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{artifact.title}</div>
                  {library && <div className="mt-1 text-xs text-muted-foreground">{artifact.lesson?.title || "Video study"} · {artifact.artifact_type.replace("_", " ")}</div>}
                </div>
              </div>
            </button>
          )})}
        </div>
      ) : (library || embedded) ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No generated {types?.[0]?.replace("_", " ") || "study artifacts"} yet. Generate one from the AI Assistant tab.
        </div>
      ) : null}

      {embedded && active && (
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-foreground">{active.title}</h3>
            <p className="text-xs text-muted-foreground">
              Select another generated item above to switch views.
            </p>
          </div>
          <ArtifactViewer artifact={active} />
        </div>
      )}

      <Dialog open={!embedded && !!active} onOpenChange={(value) => !value && setActive(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit learning artifact" : active?.title}</DialogTitle>
            <DialogDescription>Generated from this video and saved automatically. You can refine it at any time.</DialogDescription>
          </DialogHeader>
          {active && editing ? (
            <div className="space-y-3">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Artifact title" />
              <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-[420px] font-mono text-sm" />
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
              </Button>
            </div>
          ) : active ? (
            <div className="space-y-4">
              <ArtifactViewer artifact={active} />
              <Button variant="outline" onClick={() => setEditing(true)} className="gap-2"><Pencil className="h-4 w-4" /> Edit</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
