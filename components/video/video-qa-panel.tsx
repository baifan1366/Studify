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
  Activity
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVideoQA, useVideoQAStreaming, type VideoQAResponse } from '@/hooks/video/use-video-qa';
import { useCreateNote } from '@/hooks/course/use-course-notes';
import { useToast } from '@/hooks/use-toast';
import { useEmbeddingPreloadSimple } from '@/hooks/video/use-embedding-preload';
import AIContentRecommendations from '@/components/ai/ai-content-recommendations';

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
  const [answer, setAnswer] = useState<VideoQAResponse | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [aiMode, setAIMode] = useState<'fast' | 'normal' | 'thinking'>('fast'); // AI mode state: fast, normal, thinking
  const [useStreaming, setUseStreaming] = useState(true); // Enable streaming by default
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const videoQA = useVideoQA();
  const streamingQA = useVideoQAStreaming();
  const createNote = useCreateNote();
  const { toast } = useToast();

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

  const handleSubmit = async () => {
    if (!question.trim() || isProcessing) return;

    try {
      // Clear previous answer before fetching new one
      setAnswer(null);
      setNoteSaved(false);
      streamingQA.reset();
      
      if (useStreaming) {
        // Use streaming mode
        await streamingQA.askQuestion({
          lessonId,
          question: question.trim(),
          currentTime,
          timeWindow: 30,
          aiMode,
          stream: true
        });
      } else {
        // Use regular mode
        const result = await videoQA.mutateAsync({
          lessonId,
          question: question.trim(),
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
    setAnswer(null);
    setNoteSaved(false);
    streamingQA.reset();
  };

  const handleSaveAsNote = async () => {
    if (!effectiveAnswer || !lessonId) return;

    setIsSavingNote(true);
    try {
      await createNote.mutateAsync({
        lessonId: parseInt(lessonId),
        timestampSec: currentTime,
        content: `**Q:** ${question}\n\n**A:** ${effectiveAnswer.answer}`,
        aiSummary: effectiveAnswer.answer,
        tags: ['ai-qa', 'video-note'],
        title: question.length > 50 ? question.substring(0, 50) + '...' : question,
        noteType: 'ai_generated',
      });

      setNoteSaved(true);
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
    <div className="h-full flex flex-col bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <h3 className="font-medium text-white">
            {t('ask_ai_about_video')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setAIMode('fast')}
              disabled={videoQA.isPending}
              className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                aiMode === 'fast'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Fast Mode - Quick responses using client-side embedding"
            >
              ⚡
            </button>
            <button
              onClick={() => setAIMode('normal')}
              disabled={videoQA.isPending}
              className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                aiMode === 'normal'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Normal Mode - Balanced quality with dual embedding"
            >
              ⚙️
            </button>
            <button
              onClick={() => setAIMode('thinking')}
              disabled={videoQA.isPending}
              className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${
                aiMode === 'thinking'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Thinking Mode - Shows AI reasoning process"
            >
              🧠
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Close AI panel"
          >
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Current Time Context */}
      <div className="px-4 py-2 bg-slate-700 border-b border-slate-600 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-blue-300">
          <Clock className="w-4 h-4" />
          <span>{t('current_time')}: {formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isProcessing ? (
          /* Loading State with Streaming Updates */
          <div className="p-4 space-y-4">
            <div className="bg-slate-700 p-3 rounded-xl border border-slate-600 animate-pulse">
              <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-600 rounded w-full"></div>
            </div>
            
            {/* Streaming Status Display */}
            <div className="bg-green-800 p-3 rounded-xl border border-green-600">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                <div className="text-sm font-medium text-green-300">
                  {streamingQA.currentStatus || (aiMode === 'thinking' ? 'AI is thinking deeply...' : aiMode === 'normal' ? 'AI is analyzing...' : 'AI is processing...')}
                </div>
              </div>
              
              {/* Progress Bar */}
              {streamingQA.progress > 0 && (
                <div className="mb-3">
                  <div className="w-full bg-green-900 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-green-400 transition-all duration-300 ease-out"
                      style={{ width: `${streamingQA.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-green-300 mt-1 text-right">
                    {streamingQA.progress}%
                  </div>
                </div>
              )}
              
              {/* Streaming Updates Log */}
              {streamingQA.streamUpdates.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {streamingQA.streamUpdates
                    .filter(update => update.type === 'status')
                    .slice(-5) // Show last 5 updates
                    .map((update, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-2 text-xs text-green-200 bg-green-900/30 p-2 rounded"
                      >
                        <Activity className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium">{update.message}</div>
                          {update.data && (
                            <div className="text-green-300/70 mt-0.5">
                              {JSON.stringify(update.data).substring(0, 100)}
                              {JSON.stringify(update.data).length > 100 && '...'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {/* Fallback animation if no streaming updates */}
              {streamingQA.streamUpdates.length === 0 && (
                <div className="space-y-2">
                  <div className="h-3 bg-green-700 rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-green-700 rounded w-5/6 animate-pulse"></div>
                  <div className="h-3 bg-green-700 rounded w-4/6 animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        ) : !effectiveAnswer ? (
          /* Question Input */
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                {t('ask_question_about_current_content')}
              </label>
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('qa_placeholder')}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-white placeholder-gray-400"
                rows={3}
                disabled={videoQA.isPending}
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-400">
                {t('qa_time_window_hint')}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200"
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
              <div className="text-sm font-medium text-gray-200">
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
                    className="w-full text-left p-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200"
                  >
                    {quickQ}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Answer Display */
          <div className="p-4 space-y-4">
            {/* Question */}
            <div className="bg-slate-700 p-3 rounded-xl border border-slate-600">
              <div className="text-sm font-medium text-blue-300 mb-1">
                {t('your_question')}:
              </div>
              <div className="text-sm text-white">
                {question}
              </div>
            </div>

            {/* Answer */}
            <div className="bg-green-800 p-3 rounded-xl border border-green-600">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-green-400" />
                <div className="text-sm font-medium text-green-300">
                  AI {t('answer')}:
                </div>
                {effectiveAnswer.metadata?.aiMode && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-700 text-green-200">
                    {effectiveAnswer.metadata.aiMode === 'thinking' ? '🧠 Thinking' : effectiveAnswer.metadata.aiMode === 'normal' ? '⚙️ Normal' : '⚡ Fast'}
                  </span>
                )}
              </div>
              
              {/* Thinking Process (New) */}
              {effectiveAnswer.thinking && (
                <details className="mb-3 bg-purple-900/30 border border-purple-600/50 rounded-lg overflow-hidden">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-purple-300 hover:bg-purple-900/50 transition-colors flex items-center gap-2">
                    <Brain className="w-3 h-3" />
                    <span>🧠 Thinking Process</span>
                  </summary>
                  <div className="px-3 py-2 text-xs text-gray-300 bg-slate-900/50 border-t border-purple-600/50">
                    <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                      {effectiveAnswer.thinking}
                    </pre>
                  </div>
                </details>
              )}
              
              <div className="text-sm text-white whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {effectiveAnswer.answer}
              </div>
            </div>

            {/* Related Segments */}
            {effectiveAnswer.segments && effectiveAnswer.segments.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-200">
                    {t('related_video_segments')} ({effectiveAnswer.segments.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {effectiveAnswer.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="bg-slate-700 p-3 rounded-xl border border-slate-600 hover:border-blue-500 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-blue-400">
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
                          <div className="text-xs text-gray-300 leading-relaxed break-words">
                            {segment.relevantText || segment.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-400 italic mt-2">
                  💡 {t('click_timestamp_to_jump')}
                </div>
              </div>
            ) : effectiveAnswer.segments && effectiveAnswer.segments.length === 0 ? (
              <div className="bg-yellow-800/30 border border-yellow-600/50 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-200">
                    <p className="font-medium mb-1">{t('no_video_segments_title')}</p>
                    <p className="opacity-90">
                      {t('no_video_segments_message')}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Course Context */}
            {effectiveAnswer.courseInfo && (
              <div className="bg-slate-700 p-3 rounded-xl border border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-200">
                    {t('course_context')}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-300">
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
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-gray-200 hover:text-white text-sm rounded-xl transition-all duration-200"
                >
                  {t('close')}
                </button>
              </div>
            </div>

            {/* AI Content Recommendations */}
            {effectiveAnswer.answer && effectiveAnswer.answer.length > 50 && (
              <div className="mt-4 pt-4 border-t border-slate-600">
                <AIContentRecommendations
                  aiResponse={effectiveAnswer.answer}
                  questionContext={question}
                  className="bg-slate-700/50 rounded-xl p-3"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
