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
  ChevronRight
} from 'lucide-react';
import { useCourseBySlug } from '@/hooks/course/use-courses';
import { useCourseProgress, useUpdateProgress } from '@/hooks/course/use-course-progress';
import { useCourseNotes, useCreateNote } from '@/hooks/course/use-course-notes';
import { useUser } from '@/hooks/profile/use-user';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';
import CourseQuizInterface from './course-quiz-interface';
import CourseKnowledgeGraph from './course-knowledge-graph';
import BilibiliVideoPlayer from '@/components/video/bilibili-video-player';
import { useDanmaku } from '@/hooks/video/use-danmaku';
import { useVideoComments } from '@/hooks/video/use-video-comments';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface CourseLearningContentProps {
  courseSlug: string;
  initialLessonId?: string;
}

// Knowledge Graph Wrapper Component
function KnowledgeGraphWrapper({ courseSlug }: { courseSlug: string }) {
  const { data: conceptsData, isLoading } = useQuery({
    queryKey: ['concepts', courseSlug],
    queryFn: () => apiGet(`/api/course/concept?courseSlug=${courseSlug}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">Loading knowledge graph...</div>
      </div>
    );
  }

  const concepts = (conceptsData as any)?.data?.concepts || [];
  const links = (conceptsData as any)?.data?.links || [];

  if (!concepts.length) {
    return (
      <div className="text-center py-8">
        <Brain size={48} className="text-purple-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Knowledge Graph</h3>
        <p className="text-white/60">
          The knowledge graph for this course is being built.
        </p>
      </div>
    );
  }

  return (
    <CourseKnowledgeGraph
      courseId={courseSlug}
      concepts={concepts}
      links={links}
      onConceptClick={(concept) => {
        // Handle concept click if needed
        console.log('Concept clicked:', concept);
      }}
    />
  );
}

// Quiz Wrapper Component
function QuizWrapper({ lessonId }: { lessonId: string }) {
  const { toast } = useToast();
  
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: () => apiGet(`/api/course/quiz?lessonId=${lessonId}`),
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; answer: string }) => {
      const response = await fetch('/api/course/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          questionId: data.questionId,
          answer: data.answer,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Answer Submitted',
        description: 'Your answer has been recorded.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit answer. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmitAnswer = async (questionId: string, answer: string) => {
    await submitAnswerMutation.mutateAsync({ questionId, answer });
  };

  const handleQuizComplete = () => {
    toast({
      title: 'Quiz Complete!',
      description: 'Great job completing the quiz!',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">Loading quiz...</div>
      </div>
    );
  }

  const questions = (quizData as any)?.data?.questions || (quizData as any)?.questions || [];
  
  if (!questions.length) {
    return (
      <div className="text-center py-8">
        <FileText size={48} className="text-white/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Quiz Available</h3>
        <p className="text-white/60">
          This lesson doesn't have a quiz yet.
        </p>
      </div>
    );
  }

  return (
    <CourseQuizInterface
      lessonId={lessonId}
      questions={questions}
      onSubmitAnswer={handleSubmitAnswer}
      onQuizComplete={handleQuizComplete}
    />
  );
}

export default function CourseLearningContent({ courseSlug, initialLessonId }: CourseLearningContentProps) {
  // Use centralized user authentication
  const { data: userData, isLoading: userLoading } = useUser();
  const user = userData || null;
  
  // Learning state
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(initialLessonId || null);
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'ai'>('notes');
  const [noteContent, setNoteContent] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const { data: course, isLoading: courseLoading } = useCourseBySlug(courseSlug);
  const { data: progress } = useCourseProgress(courseSlug);
  const { data: notes } = useCourseNotes(currentLessonId || '');
  const updateProgress = useUpdateProgress();
  const createNote = useCreateNote();
  const { toast } = useToast();

  // Video player hooks
  const { addMessage: addDanmaku, messages: danmakuMessages } = useDanmaku({
    maxVisible: 100,
    colors: ['#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  });

  const { comments, addComment } = useVideoComments({
    videoId: currentLessonId || 'default',
    userId: user?.id
  });

  // Get current lesson from course data
  const currentLesson = React.useMemo(() => {
    if (!course || !currentLessonId) return null;
    
    for (const module of course.modules || []) {
      const lesson = module.lessons?.find((l: any) => l.public_id === currentLessonId);
      if (lesson) return lesson;
    }
    return null;
  }, [course, currentLessonId]);

  // Get all lessons for navigation
  const allLessons = React.useMemo(() => {
    if (!course) return [];
    
    // Get all lessons from all modules
    const allLessons = course?.modules?.flatMap((module: any) => 
      module.lessons?.map((lesson: any) => ({
        ...lesson,
        moduleTitle: module.title
      }))
    ).filter(Boolean) || [];

    return (allLessons || []).sort((a: any, b: any) => a.position - b.position);
  }, [course]);

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
          title: '🎉 Course Completed!',
          description: 'Congratulations! You have successfully completed this course.',
        });
      } else {
        toast({
          title: 'Lesson Complete!',
          description: 'Great job! You can now move to the next lesson.',
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
      <div className="flex items-center justify-between mb-6 bg-white rounded-lg shadow-sm border p-4">
        <button
          onClick={handlePreviousLesson}
          disabled={!currentLessonId || allLessons.findIndex((l: any) => l.public_id === currentLessonId) === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg text-sm font-medium transition-colors"
        >
          <ChevronLeft size={16} />
          Previous Lesson
        </button>
        
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">{currentLesson?.title}</h2>
          <p className="text-sm text-gray-600">
            Lesson {(allLessons.findIndex((l: any) => l.public_id === currentLessonId) + 1)} of {allLessons.length}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="text-xs text-gray-500">
              Duration: {currentLesson?.duration_sec ? Math.ceil(currentLesson.duration_sec / 60) : 0} min
            </div>
            {currentLesson && (
              <button
                onClick={handleLessonComplete}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-full transition-colors"
              >
                Mark Complete
              </button>
            )}
          </div>
        </div>
        
        <button
          onClick={handleNextLesson}
          disabled={!currentLessonId || allLessons.findIndex((l: any) => l.public_id === currentLessonId) === allLessons.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-50 disabled:text-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Next Lesson
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Course Content and Learning Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course Content Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Course Content</h3>
            <div className="text-xs text-gray-500">
              {(() => {
                const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                return progressArray.filter((p: any) => p.state === 'completed').length;
              })()} / {allLessons.length} completed
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(() => {
                    const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                    const completedCount = progressArray.filter((p: any) => p.state === 'completed').length;
                    return allLessons.length > 0 ? (completedCount / allLessons.length) * 100 : 0;
                  })()}%` 
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(() => {
                const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                const completedCount = progressArray.filter((p: any) => p.state === 'completed').length;
                return allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;
              })()}% Complete
            </p>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {course?.modules?.map((module: any) => (
              <div key={module.id} className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">{module.title}</h4>
                <div className="space-y-2">
                  {module.lessons?.map((lesson: any) => {
                    const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                    const isCompleted = progressArray.some(
                      (p: any) => p.lessonId === lesson.id && p.state === 'completed'
                    );
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonId(lesson.public_id)}
                        className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                          currentLessonId === lesson.public_id
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle 
                            size={16} 
                            className={
                              isCompleted
                                ? 'text-green-500'
                                : 'text-gray-300'
                            }
                          />
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {lesson.duration_minutes || 0} min
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Learning Panel */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border">
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

            {activeTab === 'quiz' && currentLessonId && (
              <QuizWrapper lessonId={currentLessonId} />
            )}

            {activeTab === 'quiz' && !currentLessonId && (
              <div className="text-center py-8">
                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Lesson</h3>
                <p className="text-gray-600">
                  Choose a lesson to view its quiz content.
                </p>
              </div>
            )}

            {activeTab === 'ai' && (
              <KnowledgeGraphWrapper 
                courseSlug={courseSlug}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
