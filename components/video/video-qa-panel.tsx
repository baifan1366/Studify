'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  X, 
  Clock, 
  BookOpen, 
  Lightbulb,
  Loader2,
  Volume2,
  ChevronRight
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVideoQA, type VideoQAResponse } from '@/hooks/video/use-video-qa';
import { cn } from '@/lib/utils';

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const videoQA = useVideoQA();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!question.trim() || videoQA.isPending) return;

    try {
      const result = await videoQA.mutateAsync({
        lessonId,
        question: question.trim(),
        currentTime,
        timeWindow: 30
      });
      setAnswer(result);
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
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ duration: 0.3 }}
        className="fixed right-4 top-20 w-80 max-h-[500px] bg-slate-800 rounded-2xl border border-slate-600 shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h3 className="font-medium text-white">
              {t('ask_ai_about_video')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {/* Current Time Context */}
        <div className="px-4 py-2 bg-slate-700 border-b border-slate-600">
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <Clock className="w-4 h-4" />
            <span>{t('current_time')}: {formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!answer ? (
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
                  disabled={!question.trim() || videoQA.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200"
                >
                  {videoQA.isPending ? (
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
                </div>
                <div className="text-sm text-white whitespace-pre-wrap">
                  {answer.answer}
                </div>
              </div>

              {/* Related Segments */}
              {answer.segments && answer.segments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-200">
                    {t('related_video_segments')}:
                  </div>
                  {answer.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="bg-slate-700 p-3 rounded-xl border border-slate-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span className="text-xs text-gray-300">
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSeekToSegment(segment.startTime)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
                        >
                          <Volume2 className="w-3 h-3" />
                          {t('jump_to')}
                        </button>
                      </div>
                      <div className="text-xs text-gray-300">
                        {segment.relevantText}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Course Context */}
              {answer.courseInfo && (
                <div className="bg-slate-700 p-3 rounded-xl border border-slate-600">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-gray-200">
                      {t('course_context')}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-300">
                    {answer.courseInfo.courseName && (
                      <div>{answer.courseInfo.courseName}</div>
                    )}
                    {answer.courseInfo.moduleName && (
                      <div className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        {answer.courseInfo.moduleName}
                      </div>
                    )}
                    {answer.courseInfo.lessonName && (
                      <div className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        {answer.courseInfo.lessonName}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
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
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
