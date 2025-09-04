'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
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
import { useCourse } from '@/hooks/course/use-courses';
import { useCourseProgress, useUpdateProgress } from '@/hooks/course/use-course-progress';
import { useCourseNotes, useCreateNote } from '@/hooks/course/use-course-notes';
import { useUser } from '@/hooks/profile/use-user';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiSend } from '@/lib/api-config';
import CourseQuizInterface from './course-quiz-interface';
import CourseKnowledgeGraph from './course-knowledge-graph';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

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
  const [activeMenuItem, setActiveMenuItem] = useState('courses');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  
  // Use centralized user authentication
  const { data: userData, isLoading: userLoading } = useUser();
  const user = userData || null;
  
  // Learning state
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(initialLessonId || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'ai'>('notes');
  const [noteContent, setNoteContent] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState(0);

  const { data: course, isLoading: courseLoading } = useCourse(courseSlug);
  const { data: progress } = useCourseProgress(courseSlug);
  const { data: notes } = useCourseNotes(currentLessonId || '');
  const updateProgress = useUpdateProgress();
  const createNote = useCreateNote();
  const { toast } = useToast();

  // Get current lesson from course data
  const currentLesson = React.useMemo(() => {
    if (!course || !currentLessonId) return null;
    
    for (const module of course.modules || []) {
      const lesson = module.lessons?.find(l => l.public_id === currentLessonId);
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

  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
  };

  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  const handleMenuToggle = () => {
    const newExpanded = !isPermanentlyExpanded;
    setIsPermanentlyExpanded(newExpanded);
    setSidebarExpanded(newExpanded);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    setNoteTimestamp(time);
    
    // Update progress every 10 seconds
    if (currentLessonId && time % 10 === 0) {
      updateProgress.mutate({
        lessonId: currentLessonId,
        progressPct: Math.min((time / duration) * 100, 100),
        timeSpentSec: time
      });
    }
  };

  const handleLessonComplete = () => {
    if (currentLessonId) {
      updateProgress.mutate({
        lessonId: currentLessonId,
        progressPct: 100,
        timeSpentSec: duration
      });
    }
    toast({
      title: 'Lesson Complete!',
      description: 'Great job! You can now move to the next lesson.',
    });
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
    
    const currentIndex = allLessons.findIndex(l => l.public_id === currentLessonId);
    if (currentIndex > 0) {
      setCurrentLessonId(allLessons[currentIndex - 1].public_id);
    }
  };

  const handleNextLesson = () => {
    if (!currentLessonId) return;
    
    const currentIndex = allLessons.findIndex(l => l.public_id === currentLessonId);
    if (currentIndex < allLessons.length - 1) {
      setCurrentLessonId(allLessons[currentIndex + 1].public_id);
    }
  };

  if (courseLoading) {
    return (
      <AnimatedBackground sidebarWidth={sidebarWidth}>
        <ClassroomHeader
          title="Loading Course..."
          userName="Student"
          onProfileClick={() => handleHeaderAction('profile')}
          sidebarExpanded={isPermanentlyExpanded}
          onMenuToggle={handleMenuToggle}
        />

        <AnimatedSidebar
          activeItem={activeMenuItem}
          onItemClick={handleMenuItemClick}
          onExpansionChange={setSidebarExpanded}
          isPermanentlyExpanded={isPermanentlyExpanded}
        />

        <motion.div
          className="relative z-10 mt-16 h-full overflow-hidden"
          style={{
            marginLeft: sidebarExpanded ? '280px' : '80px',
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`,
          }}
        >
          <Skeleton className="w-full h-full" />
        </motion.div>
      </AnimatedBackground>
    );
  }

  if (!course) {
    return (
      <AnimatedBackground sidebarWidth={sidebarWidth}>
        <ClassroomHeader
          title="Course Not Found"
          userName={user?.email?.split('@')[0] || 'Student'}
          onProfileClick={() => handleHeaderAction('profile')}
          sidebarExpanded={isPermanentlyExpanded}
          onMenuToggle={handleMenuToggle}
        />

        <AnimatedSidebar
          activeItem={activeMenuItem}
          onItemClick={handleMenuItemClick}
          onExpansionChange={setSidebarExpanded}
          isPermanentlyExpanded={isPermanentlyExpanded}
        />

        <motion.div
          className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
          style={{
            marginLeft: sidebarExpanded ? '280px' : '80px',
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`,
          }}
        >
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-white/90 mb-4">Course Not Found</h1>
            <p className="text-lg text-white/70">The course you're looking for doesn't exist.</p>
          </div>
        </motion.div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground sidebarWidth={sidebarWidth}>
      <ClassroomHeader
        title={course.title}
        userName={user?.email?.split('@')[0] || 'Student'}
        onProfileClick={() => handleHeaderAction('profile')}
        sidebarExpanded={isPermanentlyExpanded}
        onMenuToggle={handleMenuToggle}
      />

      <AnimatedSidebar
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
        onExpansionChange={setSidebarExpanded}
        isPermanentlyExpanded={isPermanentlyExpanded}
      />

      <motion.div
        className="relative z-10 mt-16 h-full overflow-hidden"
        style={{
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`,
        }}
      >
        <div className="h-full flex flex-col">
          {/* Video Player Section */}
          <div className="flex-1 bg-black relative">
            <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
              {currentLesson?.video_url ? (
                <video
                  className="w-full h-full object-contain"
                  controls
                  onTimeUpdate={(e) => handleTimeUpdate((e.target as HTMLVideoElement).currentTime)}
                  onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                  onEnded={handleLessonComplete}
                >
                  <source src={currentLesson.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center text-white/60">
                  <Play size={64} className="mx-auto mb-4" />
                  <p className="text-xl">Video content coming soon</p>
                  <p className="text-sm mt-2">{currentLesson?.title}</p>
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePreviousLesson}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    disabled={allLessons.findIndex(l => l.public_id === currentLessonId) === 0}
                  >
                    <SkipBack size={20} />
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  <button
                    onClick={handleNextLesson}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    disabled={allLessons.findIndex(l => l.public_id === currentLessonId) === allLessons.length - 1}
                  >
                    <SkipForward size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')} / 
                    {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
                  </span>
                  <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <Volume2 size={20} />
                  </button>
                  <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Panel */}
          <div className="h-80 bg-white/5 backdrop-blur-md border-t border-white/20 flex">
            {/* Course Content Sidebar */}
            <div className="w-80 border-r border-white/20 p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Course Content</h3>
              <div className="space-y-2">
                {course.modules?.map((module: any) => (
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
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'text-white/70 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle 
                                size={16} 
                                className={
                                  isCompleted
                                    ? 'text-green-400'
                                    : 'text-white/30'
                                }
                              />
                              <span className="truncate">{lesson.title}</span>
                            </div>
                            <div className="text-xs text-white/50 mt-1">
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

            {/* Main Panel */}
            <div className="flex-1 flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-white/20">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'notes'
                      ? 'text-blue-300 border-b-2 border-blue-300'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <PenTool size={16} />
                  Notes
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'quiz'
                      ? 'text-blue-300 border-b-2 border-blue-300'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <FileText size={16} />
                  Quiz
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'ai'
                      ? 'text-blue-300 border-b-2 border-blue-300'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Brain size={16} />
                  AI Assistant
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    {/* Note Input */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Clock size={14} />
                        <span>
                          {Math.floor(noteTimestamp / 60)}:{String(noteTimestamp % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Add a note at this timestamp..."
                        className="w-full h-24 bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 resize-none focus:outline-none focus:border-blue-400"
                      />
                      <button
                        onClick={handleCreateNote}
                        disabled={!noteContent.trim() || createNote.isPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {createNote.isPending ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>

                    {/* Existing Notes */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-white/80">Your Notes</h4>
                      {notes?.map((note) => (
                        <div key={note.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                            <Clock size={12} />
                            <div className="text-xs text-gray-500">
                              {(note.timestampSec ?? 0) > 0 ? `${Math.floor((note.timestampSec ?? 0) / 60)}:${String((note.timestampSec ?? 0) % 60).padStart(2, '0')} - ` : ''}
                              {new Date(note.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <p className="text-white/80 text-sm">{note.content}</p>
                        </div>
                      )) || (
                        <p className="text-white/60 text-sm">No notes yet. Start taking notes as you watch!</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'quiz' && currentLessonId && (
                  <QuizWrapper lessonId={currentLessonId} />
                )}

                {activeTab === 'quiz' && !currentLessonId && (
                  <div className="text-center py-8">
                    <FileText size={48} className="text-white/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Select a Lesson</h3>
                    <p className="text-white/60">
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
      </motion.div>
    </AnimatedBackground>
  );
}
