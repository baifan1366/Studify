'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  X,
  Clock,
  BookOpen,
  Lightbulb,
  Loader2,
  ChevronRight,
  Save,
  Check,
  Brain,
  Activity,
  Zap,
  Settings,
  Search,
  Sparkles,
  CircleHelp,
  CheckCircle2,
  AlertTriangle,
  Video,
  Database,
  Cpu,
  Layers3,
  Timer,
  Bot
  ,History
  ,ListVideo
  ,ExternalLink
  ,Globe2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVideoQA, useVideoQAStreaming, type VideoQAResponse } from '@/hooks/video/use-video-qa';
import { useCreateNote } from '@/hooks/course/use-course-notes';
import { useToast } from '@/hooks/use-toast';
import { useEmbeddingPreloadSimple } from '@/hooks/video/use-embedding-preload';
import AIContentRecommendations from '@/components/ai/ai-content-recommendations';
import { AIMarkdownMessage } from '@/components/video/ai-markdown-message';
import { VideoTranscriptList } from '@/components/video/video-transcript-list';
import { VideoQAHistoryDialog } from '@/components/video/video-qa-history-dialog';
import { MarkdownNoteEditor } from '@/components/course/markdown-note-editor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateNote, type CourseNote } from '@/hooks/course/use-course-notes';
import { VideoLearningArtifacts } from '@/components/video/video-learning-artifacts';

interface VideoQAPanelProps {
  lessonId: string;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSeekTo?: (time: number) => void;
}

export function VideoQAPanel({
  lessonId,
  currentTime,
  isOpen,
  onClose,
  onSeekTo
}: VideoQAPanelProps) {
  const t = useTranslations('VideoPlayer');
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [answer, setAnswer] = useState<VideoQAResponse | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [aiMode, setAIMode] = useState<'fast' | 'normal' | 'thinking'>('fast'); // AI mode state: fast, normal, thinking
  const [useStreaming, setUseStreaming] = useState(true); // Enable streaming by default
  const [historyOpen, setHistoryOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'transcript'>('chat');
  const [savedNote, setSavedNote] = useState<CourseNote | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [queuedQuestions, setQueuedQuestions] = useState<string[]>([]);
  const wasProcessingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const videoQA = useVideoQA();
  const streamingQA = useVideoQAStreaming();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { toast } = useToast();

  const aiModeOptions = [
    {
      value: 'fast' as const,
      title: 'Fast Mode - Quick responses using client-side embedding',
      icon: Zap,
      activeClass: 'bg-blue-500 text-white shadow-sm',
    },
    {
      value: 'normal' as const,
      title: 'Normal Mode - Balanced quality with dual embedding',
      icon: Settings,
      activeClass: 'bg-green-500 text-white shadow-sm',
    },
    {
      value: 'thinking' as const,
      title: 'Thinking Mode - Shows AI reasoning process',
      icon: Brain,
      activeClass: 'bg-purple-500 text-white shadow-sm',
    },
  ];

  const modeLabels = {
    fast: 'Fast',
    normal: 'Normal',
    thinking: 'Thinking',
  };

  const getStatusIcon = (step?: string, message?: string) => {
    if (message?.toLowerCase().includes('not found')) return AlertTriangle;
    if (step?.includes('loaded')) return CheckCircle2;
    if (step === 'fetch_attachment' || step === 'external_video') return Video;
    if (step === 'searching') return Database;
    if (step === 'processing_results') return Layers3;
    if (step === 'ai_processing') return Brain;
    return Activity;
  };

  const cleanStatusMessage = (message?: string) =>
    (message || '').replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s]+/u, '');

  // Preload embedding model in background when component mounts
  useEmbeddingPreloadSimple(true);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Use streaming answer if available, otherwise use regular answer
  const effectiveAnswer = streamingQA.finalAnswer || answer;
  const isProcessing = useStreaming ? streamingQA.isStreaming : videoQA.isPending;

  const runQuestion = async (currentQuestion: string) => {
    try {
      setSubmittedQuestion(currentQuestion);
      setQuestion('');
      // Clear previous answer before fetching new one
      setAnswer(null);
      setNoteSaved(false);
      streamingQA.reset();
      
      if (useStreaming) {
        // Use streaming mode
        await streamingQA.askQuestion({
          lessonId,
          question: currentQuestion,
          currentTime,
          timeWindow: 30,
          aiMode,
          stream: true
        });
      } else {
        // Use regular mode
        const result = await videoQA.mutateAsync({
          lessonId,
          question: currentQuestion,
          currentTime,
          timeWindow: 30,
          aiMode
        });
        setAnswer(result);
      }
    } catch (error) {
      console.error('QA submission failed:', error);
    }
  };

  const handleSubmit = async () => {
    const currentQuestion = question.trim();
    if (!currentQuestion) return;
    if (isProcessing) {
      setQueuedQuestions((items) => [...items, currentQuestion]);
      setQuestion('');
      return;
    }
    await runQuestion(currentQuestion);
  };

  useEffect(() => {
    if (wasProcessingRef.current && !isProcessing && queuedQuestions.length > 0) {
      const [next, ...rest] = queuedQuestions;
      setQueuedQuestions(rest);
      void runQuestion(next);
    }
    wasProcessingRef.current = isProcessing;
  }, [isProcessing, queuedQuestions]);

  const askFromAnswer = (prompt: string) => {
    setView('chat');
    setQuestion(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekToSegment = (time: number) => {
    if (onSeekTo) {
      onSeekTo(time);
    }
  };

  const startNewQuestion = () => {
    setQuestion('');
    setSubmittedQuestion('');
    setAnswer(null);
    setNoteSaved(false);
    streamingQA.reset();
  };

  const handleSaveAsNote = async () => {
    if (!effectiveAnswer || !lessonId) return;

    setIsSavingNote(true);
    try {
      const noteQuestion = submittedQuestion || question;
      const sourceMarkdown = (effectiveAnswer.sources || [])
        .map((source, index) => `${index + 1}. [${source.title || 'Source'}](${source.url || '#'})${source.contentPreview ? ` — ${source.contentPreview}` : ''}`)
        .join('\n');
      const segmentMarkdown = (effectiveAnswer.segments || [])
        .map((segment) => `- **[${formatTime(segment.startTime)}]** ${segment.relevantText || segment.text}`)
        .join('\n');
      const completeContent = [
        `# ${noteQuestion}`,
        `> Video timestamp: **${formatTime(currentTime)}**`,
        '',
        effectiveAnswer.answer,
        segmentMarkdown ? `\n## Relevant transcript\n${segmentMarkdown}` : '',
        sourceMarkdown ? `\n## Sources\n${sourceMarkdown}` : '',
      ].filter(Boolean).join('\n\n');
      const result = await createNote.mutateAsync({
        lessonId,
        timestampSec: currentTime,
        content: completeContent,
        aiSummary: effectiveAnswer.answer,
        tags: ['ai-qa', 'video-note'],
        title: noteQuestion.length > 50 ? noteQuestion.substring(0, 50) + '...' : noteQuestion,
        noteType: 'ai_generated',
      });

      setNoteSaved(true);
      setSavedNote(result.note);
      setNoteEditorOpen(true);
      toast({
        title: t('note_saved'),
        description: t('note_saved_description'),
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to save note:', error);
      toast({
        title: t('note_save_failed'),
        description: t('note_save_failed_description'),
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/95 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-background/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <MessageCircle className="w-[18px] h-[18px] text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {t('ask_ai_about_video')}
            </h3>
            <p className="text-[11px] text-muted-foreground">Context-aware video assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip><TooltipTrigger asChild><button onClick={() => setView(view === 'chat' ? 'transcript' : 'chat')} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Toggle transcript"><ListVideo className="h-4 w-4" /></button></TooltipTrigger><TooltipContent side="bottom">Video transcript · search, translate and jump to a segment</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button onClick={() => setHistoryOpen(true)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open chat history"><History className="h-4 w-4" /></button></TooltipTrigger><TooltipContent side="bottom">Chat history · reopen an earlier answer</TooltipContent></Tooltip>
          {/* AI Mode Selector */}
          <div className="flex items-center gap-0.5 bg-muted/70 rounded-xl p-1 ring-1 ring-border/60">
            {aiModeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setAIMode(option.value)}
                  disabled={isProcessing}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ${
                    aiMode === option.value
                      ? option.activeClass
                      : 'text-muted-foreground hover:bg-background hover:text-foreground'
                  }`}
                  title={option.title}
                  aria-label={option.title}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close AI panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <VideoLearningArtifacts lessonId={lessonId} timestampSec={currentTime} />

      {/* Current Time Context */}
      <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Timer className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('current_time')}</span>
          </div>
          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-blue-600 dark:text-blue-300">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {view === 'transcript' ? (
          <VideoTranscriptList lessonId={lessonId} currentTime={currentTime} onSeekTo={onSeekTo} />
        ) : isProcessing ? (
          /* Loading State with Streaming Updates */
          <div className="p-4 space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.10] to-violet-500/[0.04] p-4">
              <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-500" />
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300 mb-1.5">
                {t('your_question')}:
              </div>
              <div className="text-sm leading-relaxed text-foreground">
                {submittedQuestion || question}
              </div>
            </div>
            
            {/* Streaming Status Display */}
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10">
                    <Bot className="w-4 h-4 text-emerald-500" />
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-card" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {cleanStatusMessage(streamingQA.currentStatus) || (aiMode === 'thinking' ? 'Thinking deeply...' : aiMode === 'normal' ? 'Analyzing context...' : 'Processing question...')}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Retrieving evidence from this lesson</div>
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold text-emerald-500">{streamingQA.progress}%</span>
              </div>
              
              {/* Progress Bar */}
              {streamingQA.progress > 0 && (
                <div className="px-4 pt-3">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 ease-out"
                      style={{ width: `${streamingQA.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Streaming Updates Log */}
              {streamingQA.streamUpdates.length > 0 && (
                <div className="mx-2 mb-2 mt-3 max-h-44 space-y-1 overflow-y-auto rounded-xl bg-muted/30 p-1.5">
                  {streamingQA.streamUpdates
                    .filter(update => update.type === 'status')
                    .slice(-5) // Show last 5 updates
                    .map((update, index) => {
                      const StatusIcon = getStatusIcon(update.step, update.message);
                      const isWarning = update.message?.toLowerCase().includes('not found');
                      return (
                      <div
                        key={`${update.step || 'status'}-${index}`}
                        className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-background/70"
                      >
                        <StatusIcon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${isWarning ? 'text-amber-500' : 'text-emerald-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground/90">{cleanStatusMessage(update.message)}</div>
                          {update.data && (
                            <div className="mt-1 truncate text-[11px] text-muted-foreground">
                              {Object.values(update.data).filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )})}
                </div>
              )}
              
              {/* Fallback animation if no streaming updates */}
              {streamingQA.streamUpdates.length === 0 && (
                <div className="space-y-2.5 p-4">
                  <div className="h-2.5 bg-muted rounded w-full animate-pulse" />
                  <div className="h-2.5 bg-muted rounded w-5/6 animate-pulse" />
                  <div className="h-2.5 bg-muted rounded w-4/6 animate-pulse" />
                </div>
              )}
            </div>
            <div className="rounded-2xl border bg-card p-3">
              <div className="flex gap-2">
                <textarea ref={inputRef} value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={handleKeyPress} rows={2} placeholder="Send now to queue another question…" className="min-w-0 flex-1 resize-none rounded-xl border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
                <button onClick={handleSubmit} disabled={!question.trim()} className="self-end rounded-xl bg-blue-600 p-2.5 text-white disabled:opacity-40" aria-label="Queue question"><Send className="h-4 w-4" /></button>
                <button onClick={streamingQA.cancel} className="self-end rounded-xl border border-red-500/30 p-2.5 text-red-500 hover:bg-red-500/10" aria-label="Stop response"><X className="h-4 w-4" /></button>
              </div>
              {queuedQuestions.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{queuedQuestions.length} message{queuedQuestions.length > 1 ? 's' : ''} queued</p>}
            </div>
          </div>
        ) : !effectiveAnswer ? (
          /* Question Input */
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t('ask_question_about_current_content')}
              </label>
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('qa_placeholder')}
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                rows={3}
                disabled={videoQA.isPending}
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('qa_time_window_hint')}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {t('ask')}
              </button>
            </div>

            {/* Quick Questions */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('quick_questions')}:
              </div>
              <div className="space-y-1">
                {[
                  t('explain_this_concept'),
                  t('what_is_key_point'),
                  t('give_example'),
                  t('related_practice')
                ].map((quickQ, index) => (
                  <button
                    key={index}
                    onClick={() => setQuestion(quickQ)}
                    className="w-full flex items-start gap-2 text-left p-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200"
                  >
                    <CircleHelp className="w-3.5 h-3.5 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span>{quickQ}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Answer Display */
          <div className="p-4 space-y-4">
            {/* Question */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-1">
                {t('your_question')}:
              </div>
              <div className="text-sm text-gray-900 dark:text-white">
                {submittedQuestion || question}
              </div>
            </div>

            {/* Answer */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                <Lightbulb className="h-4 w-4 text-emerald-500" />
                <div className="text-sm font-semibold text-foreground">
                  AI {t('answer')}:
                </div>
                {effectiveAnswer.metadata?.aiMode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                    {(() => {
                      const mode =
                        effectiveAnswer.metadata?.aiMode === 'thinking' ||
                        effectiveAnswer.metadata?.aiMode === 'normal' ||
                        effectiveAnswer.metadata?.aiMode === 'fast'
                          ? effectiveAnswer.metadata.aiMode
                          : 'fast';
                      const option = aiModeOptions.find((item) => item.value === mode);
                      const Icon = option?.icon ?? Zap;
                      return (
                        <>
                          <Icon className="w-3 h-3" />
                          <span>{modeLabels[mode]}</span>
                        </>
                      );
                    })()}
                  </span>
                )}
              </div>
              
              {/* Thinking Process - Only show if available */}
              {effectiveAnswer.thinking && effectiveAnswer.thinking.trim() && (
                <details className="mb-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-600/50 rounded-lg overflow-hidden">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2">
                    <Brain className="w-3 h-3" />
                    <span>Thinking Process</span>
                  </summary>
                  <div className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/50 border-t border-purple-200 dark:border-purple-600/50">
                    <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                      {effectiveAnswer.thinking}
                    </pre>
                  </div>
                </details>
              )}
              
              <AIMarkdownMessage content={effectiveAnswer.answer} onAsk={askFromAnswer} className="break-words text-[15px] [overflow-wrap:anywhere]" />
            </div>

            {/* Related Segments */}
            {effectiveAnswer.segments && effectiveAnswer.segments.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('related_video_segments')} ({effectiveAnswer.segments.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {effectiveAnswer.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              #{index + 1}
                            </span>
                            <button
                              onClick={() => handleSeekToSegment(segment.startTime)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 group-hover:scale-105"
                            >
                              <Clock className="w-3 h-3" />
                              <span className="font-mono font-medium">
                                {formatTime(segment.startTime)}
                              </span>
                              {segment.endTime && segment.endTime !== segment.startTime && (
                                <>
                                  <span className="opacity-60">-</span>
                                  <span className="font-mono font-medium">
                                    {formatTime(segment.endTime)}
                                  </span>
                                </>
                              )}
                              <ChevronRight className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed break-words">
                            {segment.relevantText || segment.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{t('click_timestamp_to_jump')}</span>
                </div>
              </div>
            ) : effectiveAnswer.segments && effectiveAnswer.segments.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-600/50 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-700 dark:text-yellow-200">
                    <p className="font-medium mb-1">{t('no_video_segments_title')}</p>
                    <p className="opacity-90">
                      {t('no_video_segments_message')}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {effectiveAnswer.sources && effectiveAnswer.sources.length > 0 && (
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Search className="h-4 w-4 text-blue-500" />Sources</div>
                <div className="space-y-2">
                  {effectiveAnswer.sources.map((source, index) => (
                    source.type === 'video_segment' ? (
                      <button key={`${source.title}-${index}`} onClick={() => handleSeekToSegment(source.startTime ?? source.timestamp ?? 0)} className="flex w-full items-start gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5 text-left hover:bg-violet-500/10">
                        <Video className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        <div className="min-w-0"><p className="truncate text-xs font-medium">{source.title || 'Video segment'} · {formatTime(source.startTime ?? source.timestamp ?? 0)}</p>{source.contentPreview && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{source.contentPreview}</p>}</div>
                      </button>
                    ) : (
                      <a key={`${source.url || source.title}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 hover:bg-blue-500/10">
                        <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{source.title || 'Web source'}</p>{source.contentPreview && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{source.contentPreview}</p>}</div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Course Context */}
            {effectiveAnswer.courseInfo && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('course_context')}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  {effectiveAnswer.courseInfo.courseName && (
                    <div>{effectiveAnswer.courseInfo.courseName}</div>
                  )}
                  {effectiveAnswer.courseInfo.moduleName && (
                    <div className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      {effectiveAnswer.courseInfo.moduleName}
                    </div>
                  )}
                  {effectiveAnswer.courseInfo.lessonName && (
                    <div className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      {effectiveAnswer.courseInfo.lessonName}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {/* Save as Note Button */}
              <button
                onClick={handleSaveAsNote}
                disabled={isSavingNote || noteSaved}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-xl transition-all duration-200 ${noteSaved
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
              >
                {isSavingNote ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('saving_note')}
                  </>
                ) : noteSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('note_saved')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('save_as_note')}
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={startNewQuestion}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl transition-all duration-200"
                >
                  {t('ask_another_question')}
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white text-sm rounded-xl transition-all duration-200"
                >
                  {t('close')}
                </button>
              </div>
            </div>

            {/* AI Content Recommendations */}
            {effectiveAnswer.answer && effectiveAnswer.answer.length > 50 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <AIContentRecommendations
                  aiResponse={effectiveAnswer.answer}
                  questionContext={question}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3"
                />
              </div>
            )}
          </div>
        )}
      </div>
      <VideoQAHistoryDialog
        lessonId={lessonId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelect={(item) => {
          setView('chat');
          setSubmittedQuestion(item.question);
          setAnswer({
            success: true,
            answer: item.answer,
            segments: [],
            sources: !Array.isArray(item.context_segments) ? item.context_segments?.sources : [],
            timeContext: { currentTime: item.video_time, startTime: 0, endTime: 0, windowSize: 0 },
          });
          streamingQA.reset();
        }}
      />
      <Dialog open={noteEditorOpen} onOpenChange={setNoteEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit saved note</DialogTitle>
            <DialogDescription>Your complete answer, transcript evidence and sources are saved as Markdown.</DialogDescription>
          </DialogHeader>
          {savedNote && (
            <MarkdownNoteEditor
              noteId={savedNote.id}
              initialTitle={savedNote.title}
              initialContent={savedNote.content}
              saving={updateNote.isPending}
              onSave={async (value) => {
                const result = await updateNote.mutateAsync({ noteId: savedNote.id, ...value });
                setSavedNote(result.note);
                toast({ title: 'Note updated', description: 'Your Markdown note is synced everywhere.' });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
