'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Maximize, 
  BookOpen, 
  PenTool, 
  Brain, 
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useCourseBySlug } from '@/hooks/course/use-courses';
import { useModuleByCourseId } from '@/hooks/course/use-course-module';
import { useLessonByCourseModuleId, useAllLessonsByCourseId } from '@/hooks/course/use-course-lesson';
import { useCourseProgress, useUpdateProgress } from '@/hooks/course/use-course-progress';
import { useUser } from '@/hooks/profile/use-user';
import { useKnowledgeGraph } from '@/hooks/course/use-knowledge-graph';
import { useQuiz } from '@/hooks/course/use-quiz';
import CourseQuizInterface from './course-quiz-interface';
import CourseKnowledgeGraph from './course-knowledge-graph';
import CourseNoteContent from './course-note-content';
import CourseChapterContent from './course-chapter-content';
import BilibiliVideoPlayer from '@/components/video/bilibili-video-player';
import { useDanmaku } from '@/hooks/video/use-danmaku';
import { useVideoComments } from '@/hooks/video/use-video-comments';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useAttachment } from '@/hooks/course/use-attachments';
import VideoPlayer from '@/components/ui/video-player';
import MegaDocumentPreview from '@/components/attachment/mega-document-preview';

interface CourseLearningContentProps {
  courseSlug: string;
  initialLessonId?: string;
}

// Component for handling module lessons with dedicated hook
interface ModuleLessonsProps {
  courseId: number;
  module: any;
  isExpanded: boolean;
  onToggle: () => void;
  currentLessonId: string | null;
  onLessonClick: (lessonId: string) => void;
  progress: any;
  t: (key: string) => string;
}

function ModuleLessons({ courseId, module, isExpanded, onToggle, currentLessonId, onLessonClick, progress, t }: ModuleLessonsProps) {
  // Fetch lessons for this specific module using dedicated hook
  const { data: moduleLessons, isLoading: lessonsLoading } = useLessonByCourseModuleId(
    courseId,
    module.id
  );

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg">
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg"
        aria-label={isExpanded ? t('CourseContent.collapse_module') : t('CourseContent.expand_module')}
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">{module.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {moduleLessons?.length || 0} {t('CourseContent.module_lessons_count')}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2" />
        )}
      </button>
      
      {/* Module Lessons */}
      {isExpanded && (
        <div className="px-3 pb-2 space-y-1">
          {lessonsLoading ? (
            <div className="py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {t('CourseContent.loading_modules')}...
            </div>
          ) : moduleLessons?.length ? (
            moduleLessons.map((lesson: any, index: number) => {
              const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
              const isCompleted = progressArray.some(
                (p: any) => p.lessonId === lesson.id && p.state === 'completed'
              );
              const isActive = currentLessonId === lesson.public_id;
              
              return (
                <button
                  key={lesson.id}
                  onClick={() => onLessonClick(lesson.public_id)}
                  data-lesson-id={lesson.public_id}
                  className={`w-full text-left p-2 rounded-md text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm border border-transparent'
              }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <CheckCircle 
                      size={14} 
                      className={`flex-shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'text-green-500 dark:text-green-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0 mt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium flex-1 leading-tight">{lesson.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs ml-6">
                    <span className="text-gray-500 dark:text-gray-400">
                      {lesson.duration_sec ? Math.ceil(lesson.duration_sec / 60) : 0} {t('CourseContent.lesson_duration')}
                    </span>
                    {isCompleted && (
                      <span className="text-green-600 dark:text-green-400 font-medium">✓</span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {t('CourseContent.no_lessons')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function CourseLearningContent({ courseSlug, initialLessonId }: CourseLearningContentProps) {
  // Use centralized user authentication
  const { data: userData, isLoading: userLoading } = useUser();
  const user = userData || null;
  const t = useTranslations();
  
  // Learning state
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(initialLessonId || null);
  const [activeTab, setActiveTab] = useState<'chapters' | 'notes' | 'quiz' | 'ai'>('chapters');
  const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const { data: course, isLoading: courseLoading } = useCourseBySlug(courseSlug);
  const { data: courseModules, isLoading: modulesLoading } = useModuleByCourseId(course?.id || 0);
  const { data: progress } = useCourseProgress(courseSlug);
  
  // Use dedicated hook to fetch all lessons from all modules
  const { data: allLessons = [] } = useAllLessonsByCourseId(course?.id || 0, courseModules || []);

  // Get current lesson - define this before hooks that depend on it
  const currentLesson = React.useMemo(() => {
    if (!allLessons || !currentLessonId) return null;
    return allLessons.find(lesson => lesson.public_id === currentLessonId) || null;
  }, [allLessons, currentLessonId]);

  // Now we can safely use currentLesson in other hooks
  const updateProgress = useUpdateProgress();
  const { toast } = useToast();

  // Knowledge Graph and Quiz hooks
  const knowledgeGraph = useKnowledgeGraph({ courseSlug });
  const quiz = useQuiz({ lessonId: currentLesson?.public_id || '' });

  // Video player hooks
  const { addMessage: addDanmaku, messages: danmakuMessages } = useDanmaku({
    maxVisible: 100,
    colors: ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  });

  const { comments, addComment } = useVideoComments({
    videoId: currentLessonId || 'default',
    userId: user?.id
  });

  // Get attachment ID from current lesson attachments (for all types with attachments)
  const attachmentId = React.useMemo(() => {
    if (!currentLesson || !currentLesson.attachments?.length) {
      return null;
    }
    // Use the first attachment ID
    return currentLesson.attachments[0];
  }, [currentLesson]);

  // Fetch attachment data if we have an attachment ID
  const { data: attachment, isLoading: attachmentLoading } = useAttachment(attachmentId);

  // Helper function to toggle module expansion
  const toggleModuleExpansion = (moduleId: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Auto-expand module containing current lesson and set appropriate default tab
  React.useEffect(() => {
    if (currentLessonId && allLessons.length > 0) {
      const currentLesson = allLessons.find(lesson => lesson.public_id === currentLessonId);
      if (currentLesson && currentLesson.moduleId) {
        setExpandedModules(prev => {
          const newSet = new Set(prev);
          newSet.add(currentLesson.moduleId);
          return newSet;
        });
        
        // Set default tab based on lesson type
        setActiveTab(currentLesson.kind === 'video' ? 'chapters' : 'notes');
        
        // Scroll to the selected lesson after a brief delay
        setTimeout(() => {
          const lessonElement = document.querySelector(`[data-lesson-id="${currentLessonId}"]`);
          if (lessonElement) {
            lessonElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
    }
  }, [currentLessonId, allLessons]);

  // Initialize first few modules as expanded
  React.useEffect(() => {
    if (courseModules && courseModules.length > 0 && expandedModules.size === 0) {
      // Expand first 2 modules by default
      const initialExpanded = new Set<number>();
      courseModules.slice(0, 2).forEach(module => {
        initialExpanded.add(module.id);
      });
      setExpandedModules(initialExpanded);
    }
  }, [courseModules]);

  // Set initial lesson if not provided
  useEffect(() => {
    if (!currentLessonId && allLessons.length > 0) {
      setCurrentLessonId(allLessons[0].public_id);
    }
  }, [allLessons, currentLessonId]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          // Toggle play/pause (would need to be implemented in video player)
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePreviousLesson();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextLesson();
          break;
        case 'f':
          e.preventDefault();
          setIsFullscreen(!isFullscreen);
          break;
        case 'c':
          e.preventDefault();
          if (currentLesson?.kind === 'video') {
            setActiveTab('chapters');
          }
          break;
        case 'n':
          e.preventDefault();
          setActiveTab('notes');
          break;
        case 'q':
          e.preventDefault();
          setActiveTab('quiz');
          break;
        case 'a':
          e.preventDefault();
          setActiveTab('ai');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentLessonId, isFullscreen]);

  const handleTimeUpdate = (time: number) => {
    setCurrentVideoTimestamp(time);
    
    // Update progress every 10 seconds
    if (currentLessonId && time % 10 === 0) {
      updateProgress.mutate({
        lessonId: currentLessonId,
        progressPct: Math.min((time / 100) * 100, 100), // Assuming time is in percentage
        timeSpentSec: time
      });
    }
  };

  const handleLessonComplete = () => {
    if (currentLessonId) {
      updateProgress.mutate({
        lessonId: currentLessonId,
        progressPct: 100,
        timeSpentSec: 100 // Full completion
      });
      
      // Check if this completes the entire course
      const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
      const completedCount = progressArray.filter((p: any) => p.state === 'completed').length;
      const isLastLesson = allLessons.findIndex((l: any) => l.public_id === currentLessonId) === allLessons.length - 1;
      
      if (isLastLesson && completedCount === allLessons.length - 1) {
        // Course completed!
        toast({
          title: t('LessonNavigation.course_completed'),
          description: t('LessonNavigation.course_completed_desc'),
        });
      } else {
        toast({
          title: t('LessonNavigation.lesson_completed'),
          description: t('LessonNavigation.lesson_completed_desc'),
        });
      }
    }
  };


  const handlePreviousLesson = () => {
    if (!currentLessonId) return;
    
    const currentIndex = allLessons.findIndex((l: any) => l.public_id === currentLessonId);
    if (currentIndex > 0) {
      const previousLesson = allLessons[currentIndex - 1];
      setCurrentLessonId(previousLesson.public_id);
      
      // Show toast with lesson info
      toast({
        title: t('LessonNavigation.previous_lesson'),
        description: `${previousLesson.moduleTitle} • ${previousLesson.title}`,
        duration: 2000,
      });
    }
  };

  const handleNextLesson = () => {
    if (!currentLessonId) return;
    
    const currentIndex = allLessons.findIndex((l: any) => l.public_id === currentLessonId);
    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      setCurrentLessonId(nextLesson.public_id);
      
      // Show toast with lesson info
      toast({
        title: t('LessonNavigation.next_lesson'),
        description: `${nextLesson.moduleTitle} • ${nextLesson.title}`,
        duration: 2000,
      });
    }
  };

  const handleDanmakuSend = (message: string) => {
    if (currentLessonId) {
      addDanmaku(message, 0.5, {
        color: '#FFFFFF',
        size: 'medium',
        userId: user?.id || 'anonymous',
        username: user?.email?.split('@')[0] || '匿名用户'
      });
    }
  };

  const handleCommentSend = (content: string) => {
    addComment(content);
  };

  if (courseLoading) {
    return (
      <div className="w-full h-full">
        <Skeleton className="w-full h-96" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Course Not Found</h1>
        <p className="text-lg text-gray-600">The course you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Content Display */}
      <div className="mb-6">
        {/* 1. Document/Assignment with MEGA attachment - use MegaDocumentPreview */}
        {(currentLesson?.kind === 'document' || currentLesson?.kind === 'assignment') && attachment?.url ? (
          <MegaDocumentPreview
            attachmentId={attachment.id}
            className="w-full min-h-[400px]"
            showControls={true}
          />
        ) : 
        /* 2. Video with MEGA attachment - use VideoPlayer for streaming */
        currentLesson?.kind === 'video' && attachment?.url ? (
          <>
            <VideoPlayer
              src={`/api/attachments/${attachment.id}/stream`}
              className="aspect-video mb-4"
            />
            {/* Always show BilibiliVideoPlayer as fallback for video lessons */}
            <BilibiliVideoPlayer
              src={currentLesson.content_url}
              title={currentLesson.title || 'Course Lesson'}
              poster={course?.thumbnail_url || undefined}
              danmakuMessages={danmakuMessages}
              comments={comments}
              onDanmakuSend={handleDanmakuSend}
              onCommentSend={handleCommentSend}
            />
          </>
        ) : 
        /* 3. Video with YouTube/external link - use BilibiliVideoPlayer */
        currentLesson?.kind === 'video' && currentLesson?.content_url ? (
          <>
            <BilibiliVideoPlayer
              src={currentLesson.content_url}
              title={currentLesson.title || 'Course Lesson'}
              poster={course?.thumbnail_url || undefined}
              danmakuMessages={danmakuMessages}
              comments={comments}
              onDanmakuSend={handleDanmakuSend}
              onCommentSend={handleCommentSend}
            />
          </>
        ) : 
        /* Loading states */
        attachmentLoading ? (
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg">
            <div className="text-center text-white/60">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl">Loading {currentLesson?.kind}...</p>
              <p className="text-sm mt-2">{currentLesson?.title}</p>
            </div>
          </div>
        ) : 
        /* Error/fallback states */
        currentLesson?.kind === 'video' && attachmentId && !attachment ? (
          <>
            <div className="aspect-video bg-gradient-to-br from-red-900 to-black flex items-center justify-center rounded-lg mb-4">
              <div className="text-center text-white/60">
                <Play size={64} className="mx-auto mb-4" />
                <p className="text-xl">Video attachment not found</p>
                <p className="text-sm mt-2">Attachment ID: {attachmentId}</p>
                <p className="text-xs mt-1 opacity-80">Falling back to external video</p>
              </div>
            </div>
            {/* Always show BilibiliVideoPlayer as fallback for video lessons */}
            <BilibiliVideoPlayer
              src={currentLesson.content_url}
              title={currentLesson.title || 'Course Lesson'}
              poster={course?.thumbnail_url || undefined}
              danmakuMessages={danmakuMessages}
              comments={comments}
              onDanmakuSend={handleDanmakuSend}
              onCommentSend={handleCommentSend}
            />
          </>
        ) : currentLesson?.kind === 'video' ? (
          <>
            <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg mb-4">
              <div className="text-center text-white/60">
                <Play size={64} className="mx-auto mb-4" />
                <p className="text-xl">No video content available</p>
                <p className="text-sm mt-2">{currentLesson?.title}</p>
                <p className="text-xs mt-1 opacity-80">Please check if video attachment or external link is provided</p>
              </div>
            </div>
            {/* Always show BilibiliVideoPlayer as fallback for video lessons */}
            <BilibiliVideoPlayer
              src={currentLesson?.content_url}
              title={currentLesson.title || 'Course Lesson'}
              poster={course?.thumbnail_url || undefined}
              danmakuMessages={danmakuMessages}
              comments={comments}
              onDanmakuSend={handleDanmakuSend}
              onCommentSend={handleCommentSend}
            />
          </>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg">
            <div className="text-center text-white/60">
              <FileText size={64} className="mx-auto mb-4" />
              <p className="text-xl">Content coming soon</p>
              <p className="text-sm mt-2">{currentLesson?.title}</p>
              <p className="text-xs mt-1 opacity-80">
                {currentLesson?.kind ? `${currentLesson.kind} lesson` : 'No content type specified'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lesson Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 lg:p-4 gap-3 sm:gap-4">
        <Button
          onClick={handlePreviousLesson}
          disabled={!currentLessonId || allLessons.findIndex((l: any) => l.public_id === currentLessonId) === 0}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">{t('LessonNavigation.previous_lesson')}</span>
          <span className="sm:hidden">Prev</span>
        </Button>
        
        <div className="text-center flex-1 min-w-0">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate max-w-full">{currentLesson?.title}</h2>
          {currentLesson?.moduleTitle && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
              {currentLesson.moduleTitle} • {t('LessonNavigation.lesson')} {currentLesson.modulePosition}
            </p>
          )}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {t('LessonNavigation.lesson_of', { 
              current: (allLessons.findIndex((l: any) => l.public_id === currentLessonId) + 1), 
              total: allLessons.length 
            })}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('LessonNavigation.duration', { 
                minutes: currentLesson?.duration_sec ? Math.ceil(currentLesson.duration_sec / 60) : 0 
              })}
            </div>
            {currentLesson && (
              <button
                onClick={handleLessonComplete}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-full transition-colors whitespace-nowrap"
              >
                {t('LessonNavigation.mark_complete')}
              </button>
            )}
          </div>
        </div>
        
        <Button
          onClick={handleNextLesson}
          variant="default"
          size="sm"
          disabled={!currentLessonId || allLessons.findIndex((l: any) => l.public_id === currentLessonId) === allLessons.length - 1}
          className="px-3 lg:px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
        >
          <span className="hidden sm:inline">{t('LessonNavigation.next_lesson')}</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Course Content and Learning Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Course Content Sidebar */}
        <div className="xl:col-span-1 lg:col-span-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 lg:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('CourseContent.title')}</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {(() => {
                const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                return progressArray.filter((p: any) => p.state === 'completed').length;
              })()} / {allLessons.length} {t('CourseContent.completed_count')}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(() => {
                    const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                    const completedCount = progressArray.filter((p: any) => p.state === 'completed').length;
                    return allLessons.length > 0 ? (completedCount / allLessons.length) * 100 : 0;
                  })()}%` 
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {(() => {
                const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                const completedCount = progressArray.filter((p: any) => p.state === 'completed').length;
                return allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;
              })()}% {t('CourseContent.progress_percentage')}
            </p>
          </div>
          
          {/* Module and Lesson List */}
          <div className="space-y-1 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500 dark:text-gray-400 text-sm">{t('CourseContent.loading_modules')}</div>
              </div>
            ) : courseModules?.length ? (
              courseModules.map((module: any) => (
                <ModuleLessons
                  key={module.id}
                  courseId={course?.id || 0}
                  module={module}
                  isExpanded={expandedModules.has(module.id)}
                  onToggle={() => toggleModuleExpansion(module.id)}
                  currentLessonId={currentLessonId}
                  onLessonClick={setCurrentLessonId}
                  progress={progress}
                  t={t}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400 text-sm">{t('CourseContent.no_lessons')}</div>
              </div>
            )}
          </div>
        </div>

        {/* Main Learning Panel */}
        <div className="xl:col-span-3 lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
            {/* Chapters Tab - Only show for video lessons */}
            {currentLesson?.kind === 'video' && (
              <Button
                onClick={() => setActiveTab('chapters')}
                variant="ghost"
                size="sm"
                className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                  activeTab === 'chapters'
                    ? 'text-orange-500'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline">Chapters</span>
              </Button>
            )}
            <Button
              onClick={() => setActiveTab('notes')}
              variant="ghost"
              size="sm"
              className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                activeTab === 'notes'
                  ? 'text-orange-500'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <PenTool size={16} />
              <span className="hidden sm:inline">Notes</span>
            </Button>
            <Button
              onClick={() => setActiveTab('quiz')}
              variant="ghost"
              size="sm"
              className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                activeTab === 'quiz'
                  ? 'text-orange-500'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Quiz</span>
            </Button>
            <Button
              onClick={() => setActiveTab('ai')}
              variant="ghost"
              size="sm"
              className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                activeTab === 'ai'
                  ? 'text-orange-500 border-b-orange-500'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Brain size={16} />
              <span className="hidden sm:inline">AI Assistant</span>
            </Button>
          </div>

          {/* Tab Content */}
          <div className="p-3 lg:p-4 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
            {activeTab === 'chapters' && currentLesson?.kind === 'video' && (
              <CourseChapterContent
                currentLessonId={currentLesson?.id}
                currentTimestamp={currentVideoTimestamp}
                onSeekTo={handleTimeUpdate}
              />
            )}
            {activeTab === 'notes' && (
              <CourseNoteContent
                currentLessonId={currentLesson?.id}
                currentTimestamp={currentVideoTimestamp}
                onTimeUpdate={handleTimeUpdate}
                lessonKind={currentLesson?.kind}
              />
            )}

            {activeTab === 'quiz' && currentLessonId && (
              <>
                {quiz.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-white/60">{t('Quiz.loading')}</div>
                  </div>
                ) : !quiz.questions.length ? (
                  <div className="text-center py-8">
                    <FileText size={48} className="text-white/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">{t('Quiz.no_quiz_title')}</h3>
                    <p className="text-white/60">
                      {t('Quiz.no_quiz_message')}
                    </p>
                  </div>
                ) : (
                  <CourseQuizInterface
                    lessonId={currentLessonId}
                    questions={quiz.questions}
                    onSubmitAnswer={quiz.handleSubmitAnswer}
                    onQuizComplete={quiz.handleQuizComplete}
                  />
                )}
              </>
            )}

            {activeTab === 'quiz' && !currentLessonId && (
              <div className="text-center py-8">
                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Quiz.select_lesson_title')}</h3>
                <p className="text-gray-600">
                  {t('Quiz.select_lesson_message')}
                </p>
              </div>
            )}

            {activeTab === 'ai' && (
              <>
                {knowledgeGraph.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-white/60">{t('KnowledgeGraph.loading')}</div>
                  </div>
                ) : knowledgeGraph.error || !knowledgeGraph.concepts.length ? (
                  <div className="text-center py-8">
                    <Brain size={48} className="text-purple-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">{t('KnowledgeGraph.title')}</h3>
                    <p className="text-white/60">
                      {t('KnowledgeGraph.empty_message')}
                    </p>
                  </div>
                ) : (
                  <CourseKnowledgeGraph
                    courseId={courseSlug}
                    concepts={knowledgeGraph.concepts}
                    links={knowledgeGraph.links}
                    onConceptClick={knowledgeGraph.handleConceptClick}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
