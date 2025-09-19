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
import { useLessonByCourseModuleId } from '@/hooks/course/use-course-lesson';
import { useCourseProgress, useUpdateProgress } from '@/hooks/course/use-course-progress';
import { useCourseNotes, useCreateNote } from '@/hooks/course/use-course-notes';
import { useUser } from '@/hooks/profile/use-user';
import { useKnowledgeGraph } from '@/hooks/course/use-knowledge-graph';
import { useQuiz } from '@/hooks/course/use-quiz';
import CourseQuizInterface from './course-quiz-interface';
import CourseKnowledgeGraph from './course-knowledge-graph';
import BilibiliVideoPlayer from '@/components/video/bilibili-video-player';
import { useDanmaku } from '@/hooks/video/use-danmaku';
import { useVideoComments } from '@/hooks/video/use-video-comments';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

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
          <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">{module.title}</h4>
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
                  className={`w-full text-left p-2 rounded-md text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle 
                      size={14} 
                      className={`flex-shrink-0 ${
                        isCompleted
                          ? 'text-green-500 dark:text-green-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono min-w-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate font-medium flex-1 min-w-0">{lesson.title}</span>
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
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'ai'>('notes');
  const [noteContent, setNoteContent] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const { data: course, isLoading: courseLoading } = useCourseBySlug(courseSlug);
  const { data: courseModules, isLoading: modulesLoading } = useModuleByCourseId(course?.id || 0);
  const { data: progress } = useCourseProgress(courseSlug);
  const { data: notes } = useCourseNotes(currentLessonId || '');
  const updateProgress = useUpdateProgress();
  const createNote = useCreateNote();
  const { toast } = useToast();

  // Knowledge Graph and Quiz hooks
  const knowledgeGraph = useKnowledgeGraph({ courseSlug });
  const quiz = currentLessonId ? useQuiz({ lessonId: currentLessonId }) : null;

  // Video player hooks
  const { addMessage: addDanmaku, messages: danmakuMessages } = useDanmaku({
    maxVisible: 100,
    colors: ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  });

  const { comments, addComment } = useVideoComments({
    videoId: currentLessonId || 'default',
    userId: user?.id
  });

  // Custom hook to collect all lessons from all modules
  const useAllLessons = () => {
    const [lessons, setLessons] = useState<any[]>([]);

    React.useEffect(() => {
      if (courseModules && courseModules.length > 0) {
        const allModuleLessons: any[] = [];
        
        // This is a simplified approach - in a real app, you'd want to 
        // properly collect lessons from each useLessonByCourseModuleId hook
        courseModules.forEach(module => {
          if (module.lessons) {
            module.lessons.forEach((lesson: any) => {
              allModuleLessons.push({
                ...lesson,
                moduleTitle: module.title,
                moduleId: module.id
              });
            });
          }
        });
        
        setLessons(allModuleLessons.sort((a, b) => a.position - b.position));
      }
    }, [courseModules]);

    return lessons;
  };

  const allLessons = useAllLessons();

  // Get current lesson - we'll still search through course modules for now
  const currentLesson = React.useMemo(() => {
    if (!allLessons || !currentLessonId) return null;
    return allLessons.find(lesson => lesson.public_id === currentLessonId) || null;
  }, [allLessons, currentLessonId]);

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
  }, [allLessons]);

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
    setNoteTimestamp(time);
    
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

  const handleCreateNote = async () => {
    if (!noteContent.trim() || !currentLessonId) return;
    
    try {
      await createNote.mutate({
        lessonId: currentLessonId,
        content: noteContent,
        timestampSec: noteTimestamp
      });
      
      setNoteContent('');
      toast({
        title: 'Note Saved',
        description: 'Your note has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePreviousLesson = () => {
    if (!currentLessonId) return;
    
    const currentIndex = allLessons.findIndex((l: any) => l.public_id === currentLessonId);
    if (currentIndex > 0) {
      setCurrentLessonId(allLessons[currentIndex - 1].public_id);
    }
  };

  const handleNextLesson = () => {
    if (!currentLessonId) return;
    
    const currentIndex = allLessons.findIndex((l: any) => l.public_id === currentLessonId);
    if (currentIndex < allLessons.length - 1) {
      setCurrentLessonId(allLessons[currentIndex + 1].public_id);
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
      {/* Bilibili Video Player */}
      <div className="mb-6">
        {currentLesson?.content_url ? (
          <BilibiliVideoPlayer
            src={currentLesson.content_url}
            title={currentLesson.title || 'Course Lesson'}
            poster={course?.thumbnail_url || undefined}
            danmakuMessages={danmakuMessages}
            comments={comments}
            onDanmakuSend={handleDanmakuSend}
            onCommentSend={handleCommentSend}
          />
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg">
            <div className="text-center text-white/60">
              <Play size={64} className="mx-auto mb-4" />
              <p className="text-xl">Video content coming soon</p>
              <p className="text-sm mt-2">{currentLesson?.title}</p>
            </div>
          </div>
        )}
      </div>

      {/* Lesson Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={handlePreviousLesson}
          disabled={!currentLessonId || allLessons.findIndex((l: any) => l.public_id === currentLessonId) === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700 dark:disabled:bg-gray-900 rounded-lg text-sm font-medium transition-colors"
        >
          <ChevronLeft size={16} />
          {t('LessonNavigation.previous_lesson')}
        </button>
        
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md mx-auto">{currentLesson?.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('LessonNavigation.lesson_of', { 
              current: (allLessons.findIndex((l: any) => l.public_id === currentLessonId) + 1), 
              total: allLessons.length 
            })}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('LessonNavigation.duration', { 
                minutes: currentLesson?.duration_sec ? Math.ceil(currentLesson.duration_sec / 60) : 0 
              })}
            </div>
            {currentLesson && (
              <button
                onClick={handleLessonComplete}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-full transition-colors"
              >
                {t('LessonNavigation.mark_complete')}
              </button>
            )}
          </div>
        </div>
        
        <button
          onClick={handleNextLesson}
          disabled={!currentLessonId || allLessons.findIndex((l: any) => l.public_id === currentLessonId) === allLessons.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t('LessonNavigation.next_lesson')}
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Course Content and Learning Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course Content Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
          <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
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
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PenTool size={16} />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'quiz'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={16} />
              Quiz
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Brain size={16} />
              AI Assistant
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Note Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>
                      {Math.floor(noteTimestamp / 60)}:{String(noteTimestamp % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a note at this timestamp..."
                    className="w-full h-24 border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCreateNote}
                    disabled={!noteContent.trim() || createNote.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {createNote.isPending ? 'Saving...' : 'Save Note'}
                  </button>
                </div>

                {/* Existing Notes */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Your Notes</h4>
                  {notes?.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Clock size={12} />
                        <div className="text-xs text-gray-500">
                          {(note.timestampSec ?? 0) > 0 ? `${Math.floor((note.timestampSec ?? 0) / 60)}:${String((note.timestampSec ?? 0) % 60).padStart(2, '0')} - ` : ''}
                          {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-gray-800 text-sm">{note.content}</p>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">No notes yet. Start taking notes as you watch!</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'quiz' && currentLessonId && quiz && (
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
