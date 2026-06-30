"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Check, Copy, ExternalLink, MessageCircle, Minus, Plus } from "lucide-react";
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

  const normalizedContent = content
    .replace(/\|\|\s*(?=\|?\s*:?-{3,})/g, "|\n|")
    .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2")
    .replace(/【(https?:\/\/[^】\s]+)】/g, (_match, url: string) => {
      try {
        return `[${new URL(url).hostname.replace(/^www\./, "")}](${url})`;
      } catch {
        return `[Source](${url})`;
      }
    })
    .replace(/【Video\s+(\d{1,2}:\d{2})】/gi, "`Video · $1`")
    .replace(/【([^】]+)】/g, "**$1**");

  return (
    <div ref={rootRef} className={cn("relative", className)} onMouseUp={captureSelection}>
      <div className="mb-2 flex items-center justify-end gap-1">
        <button onClick={() => setScale((v) => Math.max(.85, v - .1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Decrease text size"><Minus className="h-3.5 w-3.5" /></button>
        <button onClick={() => setScale((v) => Math.min(1.4, v + .1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Increase text size"><Plus className="h-3.5 w-3.5" /></button>
        <button onClick={copy} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Copy answer">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="max-w-none origin-top-left text-foreground" style={{ fontSize: `${scale}rem` }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm as any, remarkMath as any]}
          rehypePlugins={[rehypeKatex as any]}
          components={{
            h1: ({ children }) => <h1 className="mb-4 mt-7 text-xl font-semibold tracking-tight first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-3 mt-7 border-b border-border/60 pb-2 text-lg font-semibold tracking-tight first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-2 mt-6 text-base font-semibold tracking-tight first:mt-0">{children}</h3>,
            p: ({ children }) => <p className="my-3 leading-7 text-foreground/90 first:mt-0 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="my-4 space-y-2 pl-5 marker:text-muted-foreground">{children}</ul>,
            ol: ({ children }) => <ol className="my-4 list-decimal space-y-3 pl-6 marker:font-medium marker:text-muted-foreground">{children}</ol>,
            li: ({ children }) => <li className="pl-1 leading-7 text-foreground/90">{children}</li>,
            blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-blue-500/60 pl-4 text-muted-foreground">{children}</blockquote>,
            hr: () => <hr className="my-7 border-border/70" />,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            code: ({ children, className: codeClass }) => codeClass ? (
              <code className={cn("font-mono text-sm", codeClass)}>{children}</code>
            ) : (
              <code className="rounded-md border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[.86em] text-foreground">{children}</code>
            ),
            pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 text-sm leading-6">{children}</pre>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 align-baseline text-[.88em] font-medium text-blue-600 no-underline hover:bg-blue-500/15 dark:text-blue-300">
                <span className="truncate">{children}</span><ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ),
          }}
        >
          {normalizedContent}
        </ReactMarkdown>
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
