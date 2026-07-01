"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Send,
  Loader2,
  Brain,
  Clock,
  BookOpen,
  ExternalLink,
  Lightbulb,
  MessageCircle,
  Zap,
  Settings,
  Search,
  Sparkles,
  Play,
  CircleHelp,
  Circle,
  type LucideIcon,
  History,
  ListVideo,
  Maximize2,
  Minimize2,
  MessageSquarePlus,
  GripHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useStreamingVideoAI } from "@/hooks/course/use-video-ai";
import { getGlobalVideoPlayer } from "@/hooks/video/use-video-player";
import { useEmbeddingPreloadSimple } from "@/hooks/video/use-embedding-preload";
import { useQueryClient } from "@tanstack/react-query";
import { AIMarkdownMessage } from "@/components/video/ai-markdown-message";
import { VideoQAHistoryDialog } from "@/components/video/video-qa-history-dialog";
import { VideoTranscriptList } from "@/components/video/video-transcript-list";
import { VideoLearningArtifacts } from "@/components/video/video-learning-artifacts";
import {
  useVideoQAHistory,
  type VideoHistoryItem,
} from "@/hooks/video/use-video-learning-data";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  thinking?: string; // New: thinking process
  sources?: AISource[];
  confidence?: number;
  suggestedActions?: string[];
  relatedConcepts?: string[];
  // 渐进式加载状态
  isPartial?: boolean;
  loadingStage?: "analyzing" | "searching" | "synthesizing" | "complete";
}

interface AISource {
  type:
    | "course_content"
    | "lesson"
    | "note"
    | "web"
    | "metadata"
    | "video_segment";
  title: string;
  timestamp?: number;
  url?: string;
  contentPreview?: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
}

interface VideoAIAssistantProps {
  courseSlug: string;
  currentLessonId: string | null;
  currentTimestamp: number;
  selectedText?: string | null;
  onSeekTo?: (time: number, duration?: number) => void;
}

export default function VideoAIAssistant({
  courseSlug,
  currentLessonId,
  currentTimestamp,
  selectedText,
  onSeekTo,
}: VideoAIAssistantProps) {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<AIMessage[]>([]);
  const [contextInfo, setContextInfo] = useState<string>("");
  const [aiMode, setAIMode] = useState<'fast' | 'normal' | 'thinking'>('fast'); // AI mode state: fast, normal, thinking
  const [historyOpen, setHistoryOpen] = useState(false);
  const [view, setView] = useState<"chat" | "transcript">("chat");
  const [queuedQuestions, setQueuedQuestions] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelHeight, setPanelHeight] = useState(620);
  const [mounted, setMounted] = useState(false);
  const wasLoadingRef = useRef(false);
  const { toast } = useToast();
  const t = useTranslations("VideoAIAssistant");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: historyData, isLoading: historyLoading } = useVideoQAHistory(
    currentLessonId || undefined,
    isExpanded
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  const videoContext = {
    courseSlug,
    currentLessonId: currentLessonId || undefined,
    currentTimestamp,
    selectedText: selectedText || undefined,
  };

  const { askStreaming, isLoading, error } = useStreamingVideoAI(videoContext);

  const aiModeOptions = [
    {
      value: "fast" as const,
      label: "Fast",
      title: "Fast Mode - Quick responses",
      icon: Zap,
      activeClass: "bg-blue-500 text-white shadow-sm",
    },
    {
      value: "normal" as const,
      label: "Normal",
      title: "Normal Mode - Balanced quality",
      icon: Settings,
      activeClass: "bg-green-500 text-white shadow-sm",
    },
    {
      value: "thinking" as const,
      label: "Thinking",
      title: "Thinking Mode - Shows reasoning process",
      icon: Brain,
      activeClass: "bg-purple-500 text-white shadow-sm",
    },
  ];

  // Preload embedding model in background when component mounts
  useEmbeddingPreloadSimple(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Update context info when video state changes
  useEffect(() => {
    let context = "";
    const parts: string[] = [];

    if (currentTimestamp > 0) {
      parts.push(
        t("input.context_info", {
          timestamp: formatTimestamp(currentTimestamp),
        })
      );
    }
    if (selectedText) {
      parts.push(t("input.selected_text", { text: selectedText }));
    }

    context = parts.join(" | ");
    setContextInfo(context);
  }, [currentTimestamp, selectedText, t]);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getLoadingStageDisplay = (
    stage: AIMessage["loadingStage"]
  ): { label: string; Icon: LucideIcon } => {
    switch (stage) {
      case "searching":
        return { label: "Searching content...", Icon: BookOpen };
      case "synthesizing":
        return { label: "Generating answer...", Icon: Sparkles };
      case "analyzing":
      default:
        return { label: "Analyzing question...", Icon: Search };
    }
  };

  const handleAskQuestion = async (prompt?: string) => {
    const promptText = (prompt ?? question).trim();
    if (!promptText) return;
    if (isLoading) {
      setQueuedQuestions((items) => [...items, promptText]);
      setQuestion("");
      return;
    }

    const userMessage: AIMessage = {
      role: "user",
      content: promptText,
      timestamp: Date.now(),
    };

    setConversation((prev) => [...prev, userMessage]);
    setQuestion("");

    // Create initial assistant message for streaming
    const initialMessage: AIMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isPartial: true,
      loadingStage: "analyzing",
      sources: [],
    };

    setConversation((prev) => [...prev, initialMessage]);

    try {
      let accumulatedContent = "";
      let accumulatedThinking = ""; // New: accumulate thinking content

      await askStreaming(
        promptText,
        conversation.slice(-4),
        // onToken callback - update message as tokens arrive
        (token: string) => {
          accumulatedContent += token;
          setConversation((prev) => {
            const newConv = [...prev];
            const lastIdx = newConv.length - 1;
            newConv[lastIdx] = {
              ...newConv[lastIdx],
              content: accumulatedContent,
              isPartial: true,
              loadingStage: "synthesizing",
            };
            return newConv;
          });
        },
        // onComplete callback - finalize with metadata
        (data) => {
          setConversation((prev) => {
            const newConv = [...prev];
            const lastIdx = newConv.length - 1;
            newConv[lastIdx] = {
              ...newConv[lastIdx],
              content: accumulatedContent,
              thinking: data.thinking || accumulatedThinking || undefined, // Include thinking
              sources: data.sources || [],
              confidence: data.confidence || 0.85,
              suggestedActions: [
                "Review related course materials",
                "Take notes on key points",
                "Try related practice questions",
              ],
              relatedConcepts:
                data.sources?.slice(0, 3).map((s: any) => s.title) || [],
              isPartial: false,
              loadingStage: "complete",
            };
            return newConv;
          });

          // Show toast for low confidence answers
          if (data.confidence < 0.6) {
            toast({
              title: t("notifications.low_confidence.title"),
              description: t("notifications.low_confidence.description"),
              duration: 3000,
            });
          }
          if (currentLessonId) {
            queryClient.invalidateQueries({ queryKey: ["video-qa-history", currentLessonId] });
          }
        },
        // onStatus callback - update loading stage based on status
        (status: string) => {
          setConversation((prev) => {
            const newConv = [...prev];
            const lastIdx = newConv.length - 1;

            // Determine loading stage from status message
            let loadingStage:
              | "analyzing"
              | "searching"
              | "synthesizing"
              | "complete" = "analyzing";
            if (status.toLowerCase().includes("search")) {
              loadingStage = "searching";
            } else if (
              status.toLowerCase().includes("answer") ||
              status.toLowerCase().includes("generat")
            ) {
              loadingStage = "synthesizing";
            }

            newConv[lastIdx] = {
              ...newConv[lastIdx],
              loadingStage,
            };
            return newConv;
          });
        },
        // onThinking callback - handle thinking tokens (new)
        (thinkingToken: string) => {
          accumulatedThinking += thinkingToken;
          setConversation((prev) => {
            const newConv = [...prev];
            const lastIdx = newConv.length - 1;
            newConv[lastIdx] = {
              ...newConv[lastIdx],
              thinking: accumulatedThinking,
              isPartial: true,
            };
            return newConv;
          });
        },
        aiMode // Pass AI mode to hook
      );
    } catch (error) {
      const errorMessage: AIMessage = {
        role: "assistant",
        content: t("error_message"),
        timestamp: Date.now(),
        confidence: 0,
        sources: [],
        isPartial: false,
        loadingStage: "complete",
      };

      setConversation((prev) => {
        const newConv = [...prev];
        const lastIdx = newConv.length - 1;
        newConv[lastIdx] = errorMessage;
        return newConv;
      });

      toast({
        title: t("notifications.error.title"),
        description: t("notifications.error.description"),
        variant: "destructive",
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return t("confidence.high");
    if (confidence >= 0.6) return t("confidence.medium");
    return t("confidence.low");
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case "video_segment":
        return "bg-purple-500";
      case "course_content":
        return "bg-blue-500";
      case "lesson":
        return "bg-green-500";
      case "note":
        return "bg-yellow-500";
      case "web":
        return "bg-orange-500";
      case "metadata":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const handleJumpToTimestamp = async (timestamp: number) => {
    // Try parent component's onSeekTo first (preferred method)
    if (onSeekTo) {
      try {
        onSeekTo(timestamp);
        toast({
          title: t("notifications.jump_timestamp.title"),
          description: t("notifications.jump_timestamp.jumped_to", {
            timestamp: formatTimestamp(timestamp),
          }),
          duration: 2000,
        });
        return;
      } catch (error) {
        console.error("Failed to seek via onSeekTo:", error);
      }
    }

    // Fallback to global video player
    const videoPlayer = getGlobalVideoPlayer();
    if (videoPlayer) {
      try {
        await videoPlayer.seekTo(timestamp);
        toast({
          title: t("notifications.jump_timestamp.title"),
          description: t("notifications.jump_timestamp.jumped_to", {
            timestamp: formatTimestamp(timestamp),
          }),
          duration: 2000,
        });
      } catch (error) {
        toast({
          title: t("notifications.error.title"),
          description: t("notifications.jump_timestamp.failed_to_jump", {
            timestamp: formatTimestamp(timestamp),
          }),
          variant: "destructive",
          duration: 2000,
        });
      }
    } else {
      // Last fallback when video player not available
      toast({
        title: t("notifications.jump_timestamp.title"),
        description: t("notifications.jump_timestamp.description", {
          timestamp: formatTimestamp(timestamp),
        }),
        duration: 2000,
      });
    }
  };

  // Quick preset questions based on context
  const getPresetQuestions = () => {
    const baseQuestions = [
      t("welcome.preset_questions.lesson_focus"),
      t("welcome.preset_questions.core_concepts"),
      t("welcome.preset_questions.practice_questions"),
      t("welcome.preset_questions.practical_applications"),
    ];

    if (currentTimestamp > 0) {
      baseQuestions.unshift(t("welcome.preset_questions.explain_current"));
    }

    if (selectedText) {
      baseQuestions.unshift(t("welcome.preset_questions.explain_selected"));
    }

    return baseQuestions.slice(0, 4); // 最多显示4个
  };

  const handlePresetQuestion = (presetQuestion: string) => {
    setQuestion(presetQuestion);
    // 自动发送
    setTimeout(() => handleAskQuestion(presetQuestion), 100);
  };

  const openHistoryItem = (item: VideoHistoryItem) => {
    const sources = !Array.isArray(item.context_segments)
      ? (item.context_segments?.sources as AISource[] | undefined)
      : undefined;
    const timestamp = new Date(item.created_at).getTime();
    setView("chat");
    setConversation([
      { role: "user", content: item.question, timestamp },
      {
        role: "assistant",
        content: item.answer,
        timestamp: timestamp + 1,
        sources,
        confidence: 0.85,
      },
    ]);
  };

  const startNewConversation = () => {
    setConversation([]);
    setQuestion("");
    setView("chat");
  };

  const startResizing = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panelHeight;
    const onMove = (moveEvent: PointerEvent) => {
      const viewportLimit = Math.max(520, window.innerHeight - 80);
      setPanelHeight(
        Math.min(viewportLimit, Math.max(520, startHeight + moveEvent.clientY - startY))
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && queuedQuestions.length > 0) {
      const [next, ...rest] = queuedQuestions;
      setQueuedQuestions(rest);
      void handleAskQuestion(next);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, queuedQuestions]);

  const panel = (
    <div
      className={
        isExpanded
          ? "fixed inset-3 z-[100] flex overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:inset-6"
          : "relative flex w-full overflow-hidden rounded-xl border border-border bg-background"
      }
      style={isExpanded ? undefined : { height: panelHeight }}
    >
      {isExpanded && (
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-muted/30 md:flex">
          <div className="border-b border-border p-4">
            <Button className="w-full justify-start gap-2" onClick={startNewConversation}>
              <MessageSquarePlus className="h-4 w-4" />
              New chat
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Previous chats
            </p>
            {historyLoading ? (
              <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-1.5">
                {(historyData?.history ?? []).map((item) => (
                  <button
                    key={item.public_id}
                    onClick={() => openHistoryItem(item)}
                    className="w-full rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-background"
                  >
                    <p className="line-clamp-1 text-sm font-medium">{item.question}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {item.answer}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </button>
                ))}
                {!historyData?.history?.length && (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No saved conversations yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Brain size={20} className="text-purple-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            {t("title")}
          </h3>
          {isLoading && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-500">{t("thinking")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setView((value) => value === "chat" ? "transcript" : "chat")} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Toggle transcript"><ListVideo size={16} /></button>
          <button onClick={() => setHistoryOpen(true)} disabled={!currentLessonId} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800" aria-label="Open chat history"><History size={16} /></button>
          <button
            onClick={() => setIsExpanded((value) => !value)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={isExpanded ? "Exit expanded view" : "Expand AI assistant"}
            title={isExpanded ? "Exit expanded view" : "Expand AI assistant"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {/* AI Mode Selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {aiModeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setAIMode(option.value)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                    aiMode === option.value
                      ? option.activeClass
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  title={option.title}
                  aria-label={option.title}
                >
                  <Icon size={13} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {currentLessonId && (
        <VideoLearningArtifacts lessonId={currentLessonId} timestampSec={currentTimestamp} />
      )}

      {/* Conversation Display */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {view === "transcript" && currentLessonId ? (
          <VideoTranscriptList lessonId={currentLessonId} currentTime={currentTimestamp} onSeekTo={(time) => handleJumpToTimestamp(time)} />
        ) : conversation.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("welcome.title")}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("welcome.description")}
            </p>

            {/* Quick Preset Questions */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">
                {t("welcome.quick_start")}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {getPresetQuestions().map((presetQ, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetQuestion(presetQ)}
                    disabled={isLoading}
                    className="p-2 text-xs text-left bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-200 group"
                  >
                    <div className="flex items-start space-x-2">
                      <CircleHelp
                        size={14}
                        className="text-blue-500 group-hover:text-blue-600 flex-shrink-0 mt-0.5"
                      />
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                        {presetQ}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          conversation.map((msg) => (
            <motion.div
              key={`${msg.role}-${msg.timestamp}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : `bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${
                        msg.isPartial
                          ? "border-l-4 border-blue-500 animate-pulse"
                          : ""
                      }`
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="text-sm leading-relaxed flex-1">
                    {msg.role === "assistant" && msg.content ? (
                      <AIMarkdownMessage content={msg.content} onAsk={(prompt) => handleAskQuestion(prompt)} />
                    ) : msg.content}
                  </div>

                  {/* Progressive Loading Indicator */}
                  {msg.isPartial && (
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loading Stage Indicator */}
                {msg.isPartial && msg.loadingStage && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1.5">
                    {(() => {
                      const { label, Icon } = getLoadingStageDisplay(
                        msg.loadingStage
                      );
                      return (
                        <>
                          <Icon size={12} className="animate-pulse" />
                          <span>{label}</span>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* AI Response Enhancements */}
                {msg.role === "assistant" && !msg.isPartial && (
                  <div className="mt-3 space-y-2">
                    {/* Thinking Process Display (New) */}
                    {msg.thinking && (
                      <details className="mb-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg overflow-hidden">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center gap-2">
                          <Brain size={14} />
                          <span>Thinking Process</span>
                          <span className="text-xs opacity-60">(Click to expand)</span>
                        </summary>
                        <div className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-t border-purple-200 dark:border-purple-700">
                          <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                            {msg.thinking}
                          </pre>
                        </div>
                      </details>
                    )}

                    {/* Confidence Indicator */}
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`flex items-center space-x-1 ${getConfidenceColor(
                          msg.confidence || 0
                        )}`}
                      >
                        <Circle size={7} fill="currentColor" />
                        <span>{getConfidenceText(msg.confidence || 0)}</span>
                      </span>
                      <span className="text-gray-400">
                        {Math.round((msg.confidence || 0) * 100)}%
                      </span>
                    </div>

                    {/* Enhanced Sources Display with Video Segments */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="text-xs border-t border-gray-200 dark:border-gray-600 pt-2">
                        <div className="font-medium mb-2 flex items-center space-x-1">
                          <BookOpen size={12} />
                          <span>
                            {t("sources.title")} (
                            {t("sources.count", { count: msg.sources.length })}
                            ):
                          </span>
                        </div>
                        <div className="space-y-2">
                          {msg.sources.map((source, sourceIdx) => (
                            <div key={`${source.url || source.title}-${sourceIdx}`} className="group">
                              <div className="flex items-start justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 border border-transparent hover:border-blue-500/30">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                    {/* Source Type Icon */}
                                    <div
                                      className={`w-2 h-2 rounded-full flex-shrink-0 ${getSourceTypeColor(
                                        source.type
                                      )}`}
                                    />
                                    <span className="font-medium truncate flex-1 min-w-0">
                                      {source.title}
                                    </span>
                                    {source.type === "video_segment" && (
                                      <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs font-medium flex-shrink-0">
                                        {t("sources.types.video_segment")}
                                      </span>
                                    )}
                                  </div>

                                  {source.contentPreview && (
                                    <div className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-2">
                                      "{source.contentPreview.substring(0, 100)}
                                      {source.contentPreview.length > 100 ? "..." : ""}"
                                    </div>
                                  )}

                                  <div className="flex items-center flex-wrap gap-2">
                                    {/* Video Timestamp Jump Button - Enhanced */}
                                    {source.type === "video_segment" &&
                                      (source.startTime !== undefined ||
                                        source.timestamp !== undefined) && (
                                        <button
                                          onClick={() =>
                                            handleJumpToTimestamp(
                                              source.startTime ||
                                                source.timestamp ||
                                                0
                                            )
                                          }
                                          className="flex items-center space-x-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 group-hover:scale-105 shadow-sm"
                                        >
                                          <Clock size={10} />
                                          <span className="font-mono font-medium">
                                            {formatTimestamp(
                                              source.startTime ||
                                                source.timestamp ||
                                                0
                                            )}
                                            {source.endTime &&
                                              source.endTime !== (source.startTime || source.timestamp) &&
                                              ` - ${formatTimestamp(
                                                source.endTime
                                              )}`}
                                          </span>
                                          <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={10} fill="currentColor" />
                                          </span>
                                        </button>
                                      )}

                                    {/* Regular Timestamp (non-video sources) */}
                                    {source.type !== "video_segment" &&
                                      source.timestamp && (
                                        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                                          <Clock size={10} />
                                          <span className="font-mono text-xs">
                                            {formatTimestamp(source.timestamp)}
                                          </span>
                                        </div>
                                      )}

                                    {/* External Link */}
                                    {source.url && (
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                                      >
                                        <ExternalLink size={10} />
                                        <span>{t("sources.view")}</span>
                                      </a>
                                    )}

                                    {/* Source Confidence */}
                                    {source.confidence !== undefined && (
                                      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                                        <div
                                          className={`w-1.5 h-1.5 rounded-full ${getConfidenceColor(
                                            source.confidence
                                          )}`}
                                        />
                                        <span className="text-gray-400 text-xs">
                                          {(source.confidence * 100).toFixed(0)}
                                          %
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Hint for video segments */}
                        {msg.sources.some(s => s.type === "video_segment") && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-2 flex items-center space-x-1">
                            <Lightbulb size={12} />
                            <span>{t("sources.click_timestamp_hint")}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggested Actions */}
                    {msg.suggestedActions &&
                      msg.suggestedActions.length > 0 && (
                        <div className="text-xs border-t border-gray-200 dark:border-gray-600 pt-2">
                          <div className="font-medium mb-1 flex items-center space-x-1">
                            <Lightbulb size={12} />
                            <span>{t("suggested_actions.title_colon")}</span>
                          </div>
                          <div className="space-y-1">
                            {msg.suggestedActions.map((action, actionIdx) => (
                              <div
                                key={action}
                                className="flex items-start space-x-2 text-gray-600 dark:text-gray-300"
                              >
                                <Circle size={6} fill="currentColor" className="mt-1.5 flex-shrink-0" />
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      {currentLessonId && (
        <VideoQAHistoryDialog
          lessonId={currentLessonId}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          onSelect={(item) => {
            openHistoryItem(item);
          }}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("input.placeholder")}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleAskQuestion()
            }
          />
          <Button
            onClick={() => handleAskQuestion()}
            disabled={!question.trim()}
            size="sm"
            className="px-3"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
        {queuedQuestions.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {queuedQuestions.length} message{queuedQuestions.length > 1 ? "s" : ""} queued
          </div>
        )}

        {/* Context Info */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
          {t("input.context_prefix")} {contextInfo}
          {selectedText &&
            ` | ${t("input.selected_prefix")} "${selectedText.substring(
              0,
              30
            )}..."`}
        </div>
      </div>
      </div>
      {!isExpanded && (
        <button
          type="button"
          onPointerDown={startResizing}
          className="absolute inset-x-0 bottom-0 z-10 flex h-3 cursor-ns-resize items-center justify-center text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
          aria-label="Resize AI assistant"
          title="Drag to resize"
        >
          <GripHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return isExpanded && mounted ? createPortal(panel, document.body) : panel;
}
