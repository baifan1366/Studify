"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useStreamingVideoAI } from "@/hooks/course/use-video-ai";
import { getGlobalVideoPlayer } from "@/hooks/video/use-video-player";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
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
  const { toast } = useToast();
  const t = useTranslations("VideoAIAssistant");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const videoContext = {
    courseSlug,
    currentLessonId: currentLessonId || undefined,
    currentTimestamp,
    selectedText: selectedText || undefined,
  };

  const { askStreaming, isLoading, error } = useStreamingVideoAI(videoContext);

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

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    const userMessage: AIMessage = {
      role: "user",
      content: question,
      timestamp: Date.now(),
    };

    setConversation((prev) => [...prev, userMessage]);
    const currentQuestion = question;
    setQuestion("");

    // Create initial assistant message for streaming
    const assistantMessageIndex = conversation.length + 1;
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

      await askStreaming(
        currentQuestion,
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
        }
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
    setTimeout(() => handleAskQuestion(), 100);
  };

  return (
    <div className="flex flex-col h-full max-h-96">
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
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("features")}
          </div>
        </div>
      </div>

      {/* Conversation Display */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {conversation.length === 0 ? (
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
                      <span className="text-blue-500 group-hover:text-blue-600 flex-shrink-0 mt-0.5">
                        ❓
                      </span>
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
          conversation.map((msg, idx) => (
            <motion.div
              key={idx}
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
                    {msg.content}
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
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <span>
                      {msg.loadingStage === "analyzing" &&
                        "🔍 Analyzing question..."}
                      {msg.loadingStage === "searching" &&
                        "📚 Searching content..."}
                      {msg.loadingStage === "synthesizing" &&
                        "✨ Generating answer..."}
                    </span>
                  </div>
                )}

                {/* AI Response Enhancements */}
                {msg.role === "assistant" && !msg.isPartial && (
                  <div className="mt-3 space-y-2">
                    {/* Confidence Indicator */}
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`flex items-center space-x-1 ${getConfidenceColor(
                          msg.confidence || 0
                        )}`}
                      >
                        <span>•</span>
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
                            <div key={sourceIdx} className="group">
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
                                            ▶
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
                            <span>💡</span>
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
                                key={actionIdx}
                                className="flex items-start space-x-2 text-gray-600 dark:text-gray-300"
                              >
                                <span className="mt-0.5">•</span>
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

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("input.placeholder")}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) =>
              e.key === "Enter" && !e.shiftKey && handleAskQuestion()
            }
            disabled={isLoading}
          />
          <Button
            onClick={handleAskQuestion}
            disabled={isLoading || !question.trim()}
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
  );
}
