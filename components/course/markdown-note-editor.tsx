"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Bold, Code2, Eye, Heading2, Italic, Link2, List, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIEditNote } from "@/hooks/course/use-course-notes";

interface Props {
  noteId?: string;
  initialTitle?: string;
  initialContent: string;
  saving?: boolean;
  onSave: (value: { title: string; content: string }) => Promise<void> | void;
}

export function MarkdownNoteEditor({ noteId, initialTitle = "", initialContent, saving, onSave }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [instruction, setInstruction] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiEdit = useAIEditNote();

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialTitle, initialContent, noteId]);

  const wrap = (before: string, after = before, placeholder = "text") => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    setContent(content.slice(0, start) + before + selected + after + content.slice(end));
    requestAnimationFrame(() => element.focus());
  };

  const askAI = async () => {
    if (!instruction.trim() || !content.trim()) return;
    const result = await aiEdit.mutateAsync({ noteId, content, instruction: instruction.trim() });
    setContent(result.content);
    setInstruction("");
  };

  return (
    <div className="space-y-4">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" className="text-base font-semibold" />
      <Tabs defaultValue="edit">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview"><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => wrap("## ", "", "Heading")} aria-label="Heading"><Heading2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => wrap("**")} aria-label="Bold"><Bold className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => wrap("_")} aria-label="Italic"><Italic className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => wrap("- ", "", "List item")} aria-label="List"><List className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => wrap("[", "](https://)", "link")} aria-label="Link"><Link2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => wrap("`")} aria-label="Inline code"><Code2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <TabsContent value="edit">
          <Textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[300px] resize-y font-mono text-sm leading-6" placeholder="Write your note in Markdown..." />
        </TabsContent>
        <TabsContent value="preview">
          <div className="prose prose-sm min-h-[300px] max-w-none rounded-xl border bg-card p-5 dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkMath as any]} rehypePlugins={[rehypeKatex as any]} components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{content}</ReactMarkdown>
          </div>
        </TabsContent>
      </Tabs>
      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-violet-500" />Ask AI to revise this note</div>
        <div className="flex gap-2">
          <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askAI()} placeholder="e.g. Make it concise, add a summary and flashcards…" />
          <Button type="button" variant="secondary" onClick={askAI} disabled={!instruction.trim() || aiEdit.isPending}>
            {aiEdit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <Button onClick={() => onSave({ title: title.trim(), content })} disabled={!content.trim() || saving} className="w-full">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes
      </Button>
    </div>
  );
}
