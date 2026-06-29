"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Check, Copy, MessageCircle, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  onAsk?: (text: string) => void;
  className?: string;
}

export function AIMarkdownMessage({ content, onAsk, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

  const captureSelection = () => {
    const selected = window.getSelection();
    const text = selected?.toString().trim();
    if (!selected || !text || !rootRef.current?.contains(selected.anchorNode)) {
      setSelection(null);
      return;
    }
    const rect = selected.getRangeAt(0).getBoundingClientRect();
    setSelection({ text: text.slice(0, 500), x: rect.left + rect.width / 2, y: rect.top - 10 });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const askTerm = (term: string) => onAsk?.(`What does "${term}" mean in this video?`);
  const normalizedContent = content
    .replace(/\|\|\s*(?=\|?\s*:?-{3,})/g, "|\n|")
    .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");

  return (
    <div ref={rootRef} className={cn("relative", className)} onMouseUp={captureSelection}>
      <div className="mb-2 flex items-center justify-end gap-1">
        <button onClick={() => setScale((v) => Math.max(.85, v - .1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Decrease text size"><Minus className="h-3.5 w-3.5" /></button>
        <button onClick={() => setScale((v) => Math.min(1.4, v + .1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Increase text size"><Plus className="h-3.5 w-3.5" /></button>
        <button onClick={copy} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Copy answer">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="max-w-none origin-top-left" style={{ fontSize: `${scale}rem` }}>
        <div className="prose max-w-none text-[1em] dark:prose-invert prose-p:text-[1em] prose-li:text-[1em] prose-td:text-[.92em] prose-th:text-[.92em] prose-pre:overflow-x-auto prose-a:text-blue-500">
        <ReactMarkdown
          remarkPlugins={[remarkGfm as any, remarkMath as any]}
          rehypePlugins={[rehypeKatex as any]}
          components={{
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
            strong: ({ children }) => {
              const term = String(children);
              return onAsk ? (
                <button type="button" onClick={() => askTerm(term)} className="font-semibold underline decoration-dotted underline-offset-4 hover:text-blue-500" title="Ask AI about this term">{children}</button>
              ) : <strong>{children}</strong>;
            },
          }}
        >
          {normalizedContent}
        </ReactMarkdown>
        </div>
      </div>
      {selection && onAsk && (
        <button
          type="button"
          className="fixed z-[70] flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-xl"
          style={{ left: selection.x, top: selection.y }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { onAsk(`Explain this selection in context: "${selection.text}"`); setSelection(null); }}
        >
          <MessageCircle className="h-3.5 w-3.5 text-blue-500" /> Ask AI
        </button>
      )}
    </div>
  );
}
