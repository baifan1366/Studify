"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
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
  ChevronUp,
  XCircle,
  User,
  Users,
  Star,
  Tag,
  Globe,
  BookMarked,
  Target,
  AlertCircle,
  Info,
  Menu,
  X,
  Settings,
  Eye,
  EyeOff,
  Layers,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useCourseBySlug } from "@/hooks/course/use-courses";
import { useModuleByCourseId } from "@/hooks/course/use-course-module";
import {
  useLessonByCourseModuleId,
  useAllLessonsByCourseId,
} from "@/hooks/course/use-course-lesson";
import {
  useCourseProgress,
  useCourseProgressByLessonId,
  useUpdateCourseProgress,
  useUpdateCourseProgressByLessonId,
} from "@/hooks/course/use-course-progress";
import {
  useLessonProgress,
  useVideoProgressTracker,
} from "@/hooks/learning/use-learning-progress";
import { useStudySessionTracker } from "@/hooks/learning/use-study-session-tracker";
import { useUser } from "@/hooks/profile/use-user";
import { useKnowledgeGraph } from "@/hooks/course/use-knowledge-graph";
import { useQuiz } from "@/hooks/course/use-quiz";
import CourseQuizInterface from "./course-quiz-interface";
import CourseKnowledgeGraph from "./course-knowledge-graph";
import CourseNoteContent from "./course-note-content";
import CourseChapterContent from "./course-chapter-content";
import VideoAIAssistant from "./video-ai-assistant";
import BilibiliVideoPlayer from "@/components/video/bilibili-video-player";
import { useDanmaku } from "@/hooks/video/use-danmaku";
import { 
  useVideoComments, 
  useCreateComment,
  useToggleCommentLike,
  useUpdateComment,
  useDeleteComment,
  type VideoComment 
} from "@/hooks/video/use-video-interactions";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAttachment } from "@/hooks/course/use-attachments";
import MegaDocumentPreview from "@/components/attachment/mega-document-preview";
import MegaImage from "@/components/attachment/mega-blob-image";
import BannedCourseDisplay from "./banned-course-display";

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
  allLessons: any[]; // Add allLessons prop to avoid N+1 queries
}

function ModuleLessons({
  courseId,
  module,
  isExpanded,
  onToggle,
  currentLessonId,
  onLessonClick,
  progress,
  t,
  allLessons,
}: ModuleLessonsProps) {
  // Filter lessons from already fetched data instead of making separate API calls
  const moduleLessons = useMemo(() => {
    if (!allLessons || !Array.isArray(allLessons)) return [];
    return allLessons.filter((lesson) => lesson.moduleId === module.id);
  }, [allLessons, module.id]);

  const lessonsLoading = false; // No loading since we use existing data

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg">
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg"
        aria-label={
          isExpanded
            ? t("CourseContent.collapse_module")
            : t("CourseContent.expand_module")
        }
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
            {module.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {moduleLessons?.length || 0}{" "}
            {t("CourseContent.module_lessons_count")}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp
            size={16}
            className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2"
          />
        ) : (
          <ChevronDown
            size={16}
            className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2"
          />
        )}
      </button>

      {/* Module Lessons */}
      {isExpanded && (
        <div className="px-3 pb-2 space-y-1">
          {lessonsLoading ? (
            <div className="py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {t("CourseContent.loading_modules")}...
            </div>
          ) : moduleLessons?.length ? (
            moduleLessons.map((lesson: any, index: number) => {
              const progressArray = Array.isArray(progress)
                ? progress
                : progress
                ? [progress]
                : [];
              const isCompleted = progressArray.some(
                (p: any) =>
                  p.lessonId === lesson.public_id && p.state === "completed"
              );
              const isActive = currentLessonId === lesson.public_id;

              return (
                <button
                  key={lesson.id}
                  onClick={() => onLessonClick(lesson.public_id)}
                  data-lesson-id={lesson.public_id}
                  className={`w-full text-left p-2 rounded-md text-sm transition-all duration-200 group ${
                    isActive
                      ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <CheckCircle
                      size={14}
                      className={`flex-shrink-0 mt-0.5 ${
                        isCompleted
                          ? "text-green-500 dark:text-green-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0 mt-0.5">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium flex-1 leading-tight">
                      {lesson.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs ml-6">
                    <span className="text-gray-500 dark:text-gray-400">
                      {lesson.duration_sec
                        ? Math.ceil(lesson.duration_sec / 60)
                        : 0}{" "}
                      {t("CourseContent.lesson_duration")}
                    </span>
                    {isCompleted && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {t("CourseContent.no_lessons")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseLearningContent({
  courseSlug,
  initialLessonId,
}: CourseLearningContentProps) {
  // Use centralized user authentication
  const { data: userData, isLoading: userLoading } = useUser();
  const user = userData || null;
  const t = useTranslations();

  // Learning state
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(
    initialLessonId || null
  );
  const [activeTab, setActiveTab] = useState<
    "chapters" | "notes" | "quiz" | "ai"
  >("chapters");
  const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    new Set()
  );

  // Responsive design state
  const [showToolPanel, setShowToolPanel] = useState(false); // For mobile tool panel toggle
  const [isMobileView, setIsMobileView] = useState(false);
  const [showCourseContent, setShowCourseContent] = useState(false); // For mobile course content sidebar

  const { data: course, isLoading: courseLoading } =
    useCourseBySlug(courseSlug);

  // Memoize course ID to prevent unnecessary re-renders
  const courseIdMemo = useMemo(() => course?.id || 0, [course?.id]);
  const { data: courseModules, isLoading: modulesLoading } =
    useModuleByCourseId(courseIdMemo);
  const { data: progress } = useCourseProgress(courseSlug);

  // Use dedicated hook to fetch all lessons from all modules - only when we have course and modules
  const { data: allLessons = [] } = useAllLessonsByCourseId(
    courseIdMemo,
    courseModules || []
  );

  // Get current lesson - define this before hooks that depend on it
  const currentLesson = React.useMemo(() => {
    if (!allLessons || !currentLessonId) return null;
    return (
      allLessons.find((lesson) => lesson.public_id === currentLessonId) || null
    );
  }, [allLessons, currentLessonId]);

  // Memoize current lesson ID to prevent unnecessary API calls
  const currentLessonIdMemo = useMemo(
    () => currentLesson?.public_id || "",
    [currentLesson?.public_id]
  );

  // Get lesson progress and progress update hooks - only call when we have a valid lesson ID
  const { data: lessonProgress } =
    useCourseProgressByLessonId(currentLessonIdMemo);
  const { data: enhancedLessonProgress } =
    useLessonProgress(currentLessonIdMemo); // Enhanced progress data
  const createProgress = useUpdateCourseProgress();
  const updateProgress = useUpdateCourseProgressByLessonId();
  const updateProgressByLesson = useUpdateCourseProgressByLessonId();
  const { toast } = useToast();

  // Enhanced video progress tracking
  const {
    trackProgress,
    markAsStarted,
    markAsCompleted,
    isUpdating: isProgressUpdating,
  } = useVideoProgressTracker(currentLessonIdMemo || "", {
    updateInterval: 10, // Save every 10 seconds
    autoSave: true,
  });

  // Study session time tracking for gamification
  const {
    isTracking,
    accumulatedTime,
    isSaving: isSessionSaving,
  } = useStudySessionTracker({
    lessonId: currentLessonIdMemo,
    courseId: course?.public_id,
    activityType:
      currentLesson?.kind === "video"
        ? "video_watching"
        : currentLesson?.kind === "quiz"
        ? "quiz_taking"
        : currentLesson?.kind === "document"
        ? "reading"
        : "practice",
    autoStart: true,
    minDuration: 2, // Only record sessions >= 2 minutes
  });

  // Store trackProgress in a ref to avoid dependency issues - only update when lessonId changes
  const trackProgressRef = useRef(trackProgress);
  const currentLessonRef = useRef(currentLessonIdMemo);

  // Only update ref when lesson changes to maintain throttling
  if (currentLessonRef.current !== currentLessonIdMemo) {
    trackProgressRef.current = trackProgress;
    currentLessonRef.current = currentLessonIdMemo;
  }

  // Knowledge Graph and Quiz hooks - only call when needed
  const knowledgeGraph = useKnowledgeGraph({ courseSlug });
  const quiz = useQuiz({ lessonId: currentLessonIdMemo });
  // Video player hooks
  const { addMessage: addDanmaku, messages: danmakuMessages } = useDanmaku({
    maxVisible: 100,
    colors: [
      "#FFFFFF",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
    ],
  });

  // Video comments hooks
  const { data: commentsData } = useVideoComments(
    currentLessonIdMemo || "", // lessonId
    undefined, // parentId
    1, // page
    50, // limit - show more comments
    'newest' // sortBy
  );
  const createCommentMutation = useCreateComment();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  // Extract comments from API response
  const comments = React.useMemo(() => {
    if (!commentsData?.comments) return [];
    return commentsData.comments;
  }, [commentsData?.comments]);

  // Get attachment ID from current lesson attachments (for all types with attachments)
  // Skip loading attachment for external videos (YouTube/Vimeo)
  const attachmentId = React.useMemo(() => {
    if (!currentLesson || !currentLesson.attachments?.length) {
      return null;
    }

    // For video lessons, check if it's an external video (YouTube/Vimeo)
    if (currentLesson.kind === "video" && currentLesson.content_url) {
      const url = currentLesson.content_url;
      const isExternal =
        url.includes("youtube.com") ||
        url.includes("youtu.be") ||
        url.includes("vimeo.com");
      if (isExternal) {
        return null; // Don't load attachment for YouTube/Vimeo
      }
    }

    // Use the first attachment ID
    return currentLesson.attachments[0];
  }, [
    currentLesson?.kind,
    currentLesson?.content_url,
    currentLesson?.attachments?.[0],
  ]);

  // Fetch attachment data if we have an attachment ID - only when needed
  const { data: attachment, isLoading: attachmentLoading } =
    useAttachment(attachmentId);

  // Helper function to toggle module expansion
  const toggleModuleExpansion = (moduleId: number) => {
    setExpandedModules((prev) => {
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
      const currentLesson = allLessons.find(
        (lesson) => lesson.public_id === currentLessonId
      );
      if (currentLesson && currentLesson.moduleId) {
        setExpandedModules((prev) => {
          const newSet = new Set(prev);
          newSet.add(currentLesson.moduleId);
          return newSet;
        });

        // Set default tab based on lesson type
        setActiveTab(currentLesson.kind === "video" ? "chapters" : "notes");

        // Scroll to the selected lesson after a brief delay
        setTimeout(() => {
          const lessonElement = document.querySelector(
            `[data-lesson-id="${currentLessonId}"]`
          );
          if (lessonElement) {
            lessonElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }
        }, 100);
      }
    }
  }, [currentLessonId, allLessons.length]); // Only depend on length to avoid array reference changes

  // Initialize first few modules as expanded
  const moduleIds = useMemo(
    () => courseModules?.map((m) => m.id) || [],
    [courseModules]
  );

  React.useEffect(() => {
    if (moduleIds.length > 0 && expandedModules.size === 0) {
      // Expand first 2 modules by default
      const initialExpanded = new Set<number>();
      moduleIds.slice(0, 2).forEach((moduleId) => {
        initialExpanded.add(moduleId);
      });
      setExpandedModules(initialExpanded);
    }
  }, [moduleIds.join(","), expandedModules.size]); // Use joined string to avoid array reference issues

  // Set initial lesson if not provided - only once when lessons are first loaded
  const firstLessonId = useMemo(
    () => (allLessons.length > 0 ? allLessons[0].public_id : null),
    [allLessons.length > 0 ? allLessons[0]?.public_id : null]
  );

  useEffect(() => {
    if (!currentLessonId && firstLessonId) {
      setCurrentLessonId(firstLessonId);
    }
  }, [firstLessonId, currentLessonId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          // Toggle play/pause (would need to be implemented in video player)
          break;
        case "ArrowLeft":
          e.preventDefault();
          handlePreviousLesson();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNextLesson();
          break;
        case "f":
          e.preventDefault();
          setIsFullscreen(!isFullscreen);
          break;
        case "c":
          e.preventDefault();
          if (currentLesson?.kind === "video") {
            setActiveTab("chapters");
          }
          break;
        case "n":
          e.preventDefault();
          setActiveTab("notes");
          break;
        case "q":
          e.preventDefault();
          setActiveTab("quiz");
          break;
        case "a":
          e.preventDefault();
          setActiveTab("ai");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentLessonId, isFullscreen]);

  // Initialize progress when starting a lesson - triggered by user action, not useEffect
  const initializeProgress = () => {
    if (currentLessonIdMemo && !lessonProgress && !createProgress.isPending) {
      createProgress.mutate({
        lessonId: currentLessonIdMemo,
        progressPct: 0,
        timeSpentSec: 0,
      });
    }
  };

  // Responsive design detection
  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 1024); // lg breakpoint
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Auto-hide tool panel on larger screens
  useEffect(() => {
    if (!isMobileView) {
      setShowToolPanel(false);
    }
  }, [isMobileView]);

  // Store current progress state for batch saving
  const currentProgressRef = useRef({
    currentTime: 0,
    duration: 0,
    lessonId: "",
  });

  // Track last save time to prevent duplicate saves
  const lastSaveTimeRef = useRef(0);
  const MIN_SAVE_INTERVAL = 5000; // Minimum 5 seconds between saves

  // Function to save current progress to database
  const saveCurrentProgress = React.useCallback(() => {
    const { currentTime, duration, lessonId } = currentProgressRef.current;
    const now = Date.now();

    // Prevent duplicate saves within MIN_SAVE_INTERVAL
    if (now - lastSaveTimeRef.current < MIN_SAVE_INTERVAL) {
      return;
    }

    if (lessonId && currentTime > 0 && duration > 0) {
      const progressPct = Math.min((currentTime / duration) * 100, 100);

      // Force save using trackProgress with force=true via ref
      trackProgressRef.current(currentTime, duration, true);
      lastSaveTimeRef.current = now;
    }
  }, []); // No dependencies to prevent infinite loop

  // Save progress when switching lessons
  useEffect(() => {
    // Save progress when lesson ID changes (but not on initial mount)
    const prevLessonId = currentProgressRef.current.lessonId;
    if (prevLessonId && prevLessonId !== currentLessonIdMemo) {
      saveCurrentProgress();
    }
  }, [currentLessonIdMemo, saveCurrentProgress]);

  // Save progress on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentProgress();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentProgress();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Final save on cleanup
      saveCurrentProgress();
    };
  }, []); // Remove saveCurrentProgress from deps to prevent infinite loop

  // Optional: Periodic backup save every 2 minutes (much less frequent)
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentProgressRef.current.currentTime > 0) {
        saveCurrentProgress();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []); // Remove saveCurrentProgress from deps to prevent infinite loop

  // Throttle handleTimeUpdate to avoid excessive calls
  const lastTimeUpdateRef = useRef(0);

  const handleTimeUpdate = React.useCallback(
    (time: number, duration?: number) => {
      setCurrentVideoTimestamp(time);

      // Only update local state, no API calls during playback
      if (currentLesson?.kind === "video" && duration && duration > 0) {
        // Update current progress reference for later saving
        currentProgressRef.current = {
          currentTime: time,
          duration: duration,
          lessonId: currentLesson.public_id,
        };

        // Auto-mark as completed when reaching 95% or end (but not at the very beginning)
        const progressPct = (time / duration) * 100;
        if (
          progressPct >= 95 &&
          time > 30 &&
          lessonProgress?.state !== "completed"
        ) {
          // Require at least 30s watch time
          markAsCompleted(duration);
        }

        // Auto-mark as started when passing 10 seconds
        if (
          progressPct > 5 &&
          time > 10 &&
          lessonProgress?.state === "not_started"
        ) {
          markAsStarted();
        }

        // Let useVideoProgressTracker handle all throttling
        trackProgressRef.current(time, duration);
      }
    },
    [
      currentLesson?.public_id,
      lessonProgress?.state,
      markAsCompleted,
      markAsStarted,
    ]
  );

  // Function to start a lesson (create progress with not_started status)
  const handleLessonStart = () => {
    if (!currentLesson) return;

    // Skip if already started or completed
    if (
      lessonProgress?.state === "in_progress" ||
      lessonProgress?.state === "completed"
    ) {
      return;
    }

    // Use enhanced progress tracking for video lessons
    if (currentLesson.kind === "video") {
      markAsStarted();
    }

    // Use PATCH endpoint which handles both create and update (upsert)
    updateProgressByLesson.mutate({
      lessonId: currentLesson.public_id,
      progressPct:
        lessonProgress?.progressPct && lessonProgress.progressPct > 0
          ? lessonProgress.progressPct
          : 1,
      timeSpentSec: lessonProgress?.timeSpentSec || 0,
      state: "in_progress",
    });
  };

  const handleLessonComplete = () => {
    if (!currentLesson) return;

    // Initialize progress if needed before completing
    if (!lessonProgress) {
      initializeProgress();
    }

    // Use enhanced progress tracking for video lessons
    if (currentLesson.kind === "video") {
      const duration =
        enhancedLessonProgress?.video_duration_sec ||
        currentLesson.duration_sec ||
        0;
      markAsCompleted(duration);
    }

    // Update progress to completed (only if progress exists)
    if (lessonProgress) {
      updateProgressByLesson.mutate({
        lessonId: currentLesson.public_id,
        progressPct: 100,
        timeSpentSec: lessonProgress.timeSpentSec,
      });
    }

    // Check if this completes the entire course
    const progressArray = Array.isArray(progress)
      ? progress
      : progress
      ? [progress]
      : [];
    const completedCount = progressArray.filter(
      (p: any) => p.state === "completed"
    ).length;
    const isLastLesson =
      allLessons.findIndex((l: any) => l.public_id === currentLessonId) ===
      allLessons.length - 1;

    if (isLastLesson && completedCount === allLessons.length - 1) {
      // Course completed!
      toast({
        title: t("LessonNavigation.course_completed"),
        description: t("LessonNavigation.course_completed_desc"),
      });
    } else {
      toast({
        title: t("LessonNavigation.lesson_completed"),
        description: t("LessonNavigation.lesson_completed_desc"),
      });
    }
  };

  const handlePreviousLesson = () => {
    if (!currentLessonId) return;

    const currentIndex = allLessons.findIndex(
      (l: any) => l.public_id === currentLessonId
    );
    if (currentIndex > 0) {
      const previousLesson = allLessons[currentIndex - 1];
      setCurrentLessonId(previousLesson.public_id);

      // Show toast with lesson info
      toast({
        title: t("LessonNavigation.previous_lesson"),
        description: `${previousLesson.moduleTitle} • ${previousLesson.title}`,
        duration: 2000,
      });
    }
  };

  const handleNextLesson = () => {
    if (!currentLessonId) return;

    const currentIndex = allLessons.findIndex(
      (l: any) => l.public_id === currentLessonId
    );
    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      setCurrentLessonId(nextLesson.public_id);

      // Show toast with lesson info
      toast({
        title: t("LessonNavigation.next_lesson"),
        description: `${nextLesson.moduleTitle} • ${nextLesson.title}`,
        duration: 2000,
      });
    }
  };

  const handleDanmakuSend = (message: string) => {
    if (currentLessonId) {
      addDanmaku(message, 0.5, {
        color: "#FFFFFF",
        size: "medium",
        userId: user?.profile?.id?.toString() || "anonymous",
        username: user?.profile?.full_name || user?.profile?.display_name || user?.email?.split("@")[0] || "匿名用户",
      });
    }
  };

  const handleCommentSend = (content: string) => {
    if (!currentLessonIdMemo || !content.trim()) return;
    
    createCommentMutation.mutate({
      lessonId: currentLessonIdMemo,
      attachmentId: attachmentId || undefined,
      content: content.trim(),
    });
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
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t("CourseLearning.course_not_found")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {t("CourseLearning.course_not_found_desc")}
        </p>
      </div>
    );
  }

  // Check if course is banned
  if (course.status === "ban") {
    return (
      <BannedCourseDisplay courseId={course.id} courseName={course.title} />
    );
  }

  // Helper function to format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} ${t("CourseLearning.minutes")}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${t("CourseLearning.hours")}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  // Helper function to format price
  const formatPrice = (priceCents: number, currency: string) => {
    if (priceCents === 0) {
      return t("CourseLearning.free");
    }
    const price = priceCents / 100;
    return `${currency} ${price.toFixed(2)}`;
  };

  return (
    <div className="w-full">
      {/* Course Information Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4 lg:p-6">
          {/* Course Title and Basic Info */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {course.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {course.level && (
                  <div className="flex items-center gap-1">
                    <Target size={16} />
                    <span>{t(`CourseLearning.${course.level}`)}</span>
                  </div>
                )}
                {course.total_duration_minutes &&
                  course.total_duration_minutes > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>
                        {formatDuration(course.total_duration_minutes)}
                      </span>
                    </div>
                  )}
                {course.total_lessons && course.total_lessons > 0 && (
                  <div className="flex items-center gap-1">
                    <BookOpen size={16} />
                    <span>
                      {course.total_lessons} {t("CourseLearning.lessons")}
                    </span>
                  </div>
                )}
                {course.total_students && course.total_students > 0 && (
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>
                      {course.total_students} {t("CourseLearning.students")}
                    </span>
                  </div>
                )}
                {course.average_rating && course.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-500" />
                    <span>{course.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Badge */}
            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  course.price_cents === 0
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                }`}
              >
                {formatPrice(course.price_cents || 0, course.currency || "MYR")}
              </div>
            </div>
          </div>

          {/* Course Description */}
          {course.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Info size={18} />
                {t("CourseLearning.description")}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {course.description}
              </p>
            </div>
          )}

          {/* Additional Course Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {t("CourseLearning.requirements")}
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {course.requirements.map((req: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Learning Objectives */}
            {course.learning_objectives &&
              course.learning_objectives.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Target size={16} />
                    {t("CourseLearning.learning_objectives")}
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {course.learning_objectives.map(
                      (obj: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle
                            size={14}
                            className="text-green-500 mt-0.5 flex-shrink-0"
                          />
                          <span>{obj}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {/* Course Tags & Category */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Tag size={16} />
                {t("CourseLearning.course_info")}
              </h4>
              <div className="space-y-2 text-sm">
                {course.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t("CourseLearning.course_category")}:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {course.category}
                    </span>
                  </div>
                )}
                {course.language && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t("CourseLearning.course_language")}:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {course.language}
                    </span>
                  </div>
                )}
                {course.tags && course.tags.length > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">
                      {t("CourseLearning.course_tags")}:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {course.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Display */}
      <div className="mb-6">
        {/* 1. Image with MEGA attachment - use MegaImage */}
        {currentLesson?.kind === "image" && attachmentId && attachment?.url ? (
          <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
            <MegaImage
              megaUrl={attachment.url}
              alt={currentLesson.title || t("LessonContent.image_lesson")}
              className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
            />
          </div>
        ) : /* 1b. Image lesson with external URL (not MEGA) */
        currentLesson?.kind === "image" && !attachmentId && currentLesson?.content_url ? (
          <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
            <img
              src={currentLesson.content_url}
              alt={currentLesson.title || t("LessonContent.image_lesson")}
              className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
              onError={(e) => {
                console.error("Failed to load image:", currentLesson.content_url);
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : /* 1c. Image lesson but attachment is loading */
        currentLesson?.kind === "image" && attachmentId && attachmentLoading ? (
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg">
            <div className="text-center text-white/60">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl">{t("LessonContent.loading_image")}</p>
              <p className="text-sm mt-2">{currentLesson?.title}</p>
            </div>
          </div>
        ) : /* 1d. Image lesson but no attachment or URL found */
        currentLesson?.kind === "image" ? (
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg">
            <div className="text-center text-white/60">
              <FileText size={64} className="mx-auto mb-4" />
              <p className="text-xl">
                {t("LessonContent.content_coming_soon")}
              </p>
              <p className="text-sm mt-2">{currentLesson?.title}</p>
              <p className="text-xs mt-1 opacity-80">
                {t("LessonContent.image_lesson")}
              </p>
            </div>
          </div>
        ) : /* 2. Document with MEGA attachment - use MegaDocumentPreview */
        currentLesson?.kind === "document" && attachment?.url ? (
          <MegaDocumentPreview
            attachmentId={attachment.id}
            className="w-full min-h-[400px]"
            showControls={true}
          />
        ) : /* 3. Video with MEGA attachment - use BilibiliVideoPlayer with attachment streaming */
        currentLesson?.kind === "video" && attachment?.url ? (
          <BilibiliVideoPlayer
            attachmentId={attachment.id}
            src={currentLesson.content_url} // Fallback for external videos
            lessonId={currentLesson.public_id}
            title={currentLesson.title || t("VideoPlayer.default_lesson_title")}
            poster={course?.thumbnail_url || undefined}
            onTimeUpdate={handleTimeUpdate}
            initialTime={enhancedLessonProgress?.video_position_sec || 0}
          />
        ) : /* 4. Video with YouTube/external link - use BilibiliVideoPlayer */
        currentLesson?.kind === "video" && currentLesson?.content_url ? (
          <BilibiliVideoPlayer
            src={currentLesson.content_url}
            lessonId={currentLesson.public_id}
            title={currentLesson.title || t("VideoPlayer.default_lesson_title")}
            poster={course?.thumbnail_url || undefined}
            onTimeUpdate={handleTimeUpdate}
            initialTime={enhancedLessonProgress?.video_position_sec || 0}
            videoDuration={currentLesson.duration_sec || undefined}
          />
        ) : /* Loading states */
        attachmentLoading ? (
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg">
            <div className="text-center text-white/60">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl">
                {t("LessonContent.loading", {
                  kind: currentLesson?.kind || "content",
                })}
              </p>
              <p className="text-sm mt-2">{currentLesson?.title}</p>
            </div>
          </div>
        ) : /* Error/fallback states */
        currentLesson?.kind === "video" && attachmentId && !attachment ? (
          <BilibiliVideoPlayer
            src={currentLesson.content_url} // Fallback to external video
            lessonId={currentLesson.public_id}
            title={currentLesson.title || t("VideoPlayer.default_lesson_title")}
            poster={course?.thumbnail_url || undefined}
            onTimeUpdate={handleTimeUpdate}
            initialTime={enhancedLessonProgress?.video_position_sec || 0}
          />
        ) : currentLesson?.kind === "video" ? (
          <BilibiliVideoPlayer
            src={currentLesson?.content_url} // May be empty, will show no content state
            lessonId={currentLesson.public_id}
            title={currentLesson.title || t("VideoPlayer.default_lesson_title")}
            poster={course?.thumbnail_url || undefined}
            onTimeUpdate={handleTimeUpdate}
            initialTime={enhancedLessonProgress?.video_position_sec || 0}
          />
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center rounded-lg">
            <div className="text-center text-white/60">
              <FileText size={64} className="mx-auto mb-4" />
              <p className="text-xl">
                {t("LessonContent.content_coming_soon")}
              </p>
              <p className="text-sm mt-2">{currentLesson?.title}</p>
              <p className="text-xs mt-1 opacity-80">
                {currentLesson?.kind
                  ? `${currentLesson.kind} ${t("LessonContent.lesson_suffix")}`
                  : t("LessonContent.no_content_specified")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lesson Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 lg:p-4 gap-3 sm:gap-4">
        <Button
          onClick={handlePreviousLesson}
          disabled={
            !currentLessonId ||
            allLessons.findIndex(
              (l: any) => l.public_id === currentLessonId
            ) === 0
          }
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">
            {t("LessonNavigation.previous_lesson")}
          </span>
          <span className="sm:hidden">Prev</span>
        </Button>

        <div className="text-center flex-1 min-w-0">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate max-w-full">
            {currentLesson?.title}
          </h2>
          {currentLesson?.moduleTitle && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
              {currentLesson.moduleTitle} • {t("LessonNavigation.lesson")}{" "}
              {currentLesson.modulePosition}
            </p>
          )}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {t("LessonNavigation.lesson_of", {
              current:
                allLessons.findIndex(
                  (l: any) => l.public_id === currentLessonId
                ) + 1,
              total: allLessons.length,
            })}
          </p>

          {/* Study Time Tracker Indicator */}
          {isTracking && (
            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>⏱️ {Math.round(accumulatedTime)} min studied</span>
              {isSessionSaving && (
                <span className="text-xs text-gray-500">💾</span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t("LessonNavigation.duration", {
                minutes: currentLesson?.duration_sec
                  ? Math.ceil(currentLesson.duration_sec / 60)
                  : 0,
              })}
            </div>
            {currentLesson && (
              <>
                {/* Show different buttons based on progress state */}
                {!lessonProgress || lessonProgress.state === "not_started" ? (
                  <Button onClick={handleLessonStart}>
                    {t("LessonNavigation.start_now")}
                  </Button>
                ) : lessonProgress.state === "in_progress" ? (
                  <Button onClick={handleLessonComplete}>
                    {t("LessonNavigation.mark_complete")}
                  </Button>
                ) : null}
                {/* No button shown for completed state */}
              </>
            )}
          </div>
        </div>

        <Button
          onClick={handleNextLesson}
          variant="default"
          size="sm"
          disabled={
            !currentLessonId ||
            allLessons.findIndex(
              (l: any) => l.public_id === currentLessonId
            ) ===
              allLessons.length - 1
          }
          className="px-3 lg:px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
        >
          <span className="hidden sm:inline">
            {t("LessonNavigation.next_lesson")}
          </span>
          <span className="sm:hidden">Next</span>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Mobile Tool Bar - Only visible on mobile */}
      {isMobileView && (
        <div className="lg:hidden mb-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between gap-2">
              {/* Course Content Toggle */}
              <Button
                onClick={() => setShowCourseContent(!showCourseContent)}
                variant="ghost"
                size="sm"
                className="flex-1 justify-center gap-2 text-xs sm:text-sm"
              >
                {showCourseContent ? (
                  <PanelLeftClose size={16} />
                ) : (
                  <PanelLeftOpen size={16} />
                )}
                <span className="truncate">
                  {t("CourseLearning.mobile_course")}
                </span>
              </Button>

              {/* Learning Tools Toggle */}
              <Button
                onClick={() => setShowToolPanel(!showToolPanel)}
                variant="ghost"
                size="sm"
                className="flex-1 justify-center gap-2 text-xs sm:text-sm"
              >
                <Layers size={16} />
                <span className="truncate">
                  {t("CourseLearning.mobile_tools")}
                </span>
              </Button>

              {/* Quick Tab Access */}
              <div className="flex items-center gap-1 flex-1 justify-center">
                {currentLesson?.kind === "video" && (
                  <Button
                    onClick={() => {
                      setActiveTab("chapters");
                      setShowToolPanel(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className={`p-2 ${
                      activeTab === "chapters"
                        ? "text-orange-500"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <BookOpen size={16} />
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setActiveTab("notes");
                    setShowToolPanel(true);
                  }}
                  variant="ghost"
                  size="sm"
                  className={`p-2 ${
                    activeTab === "notes"
                      ? "text-orange-500"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <PenTool size={16} />
                </Button>
                <Button
                  onClick={() => {
                    setActiveTab("quiz");
                    setShowToolPanel(true);
                  }}
                  variant="ghost"
                  size="sm"
                  className={`p-2 ${
                    activeTab === "quiz"
                      ? "text-orange-500"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <MessageSquare size={16} />
                </Button>
                <Button
                  onClick={() => {
                    setActiveTab("ai");
                    setShowToolPanel(true);
                  }}
                  variant="ghost"
                  size="sm"
                  className={`p-2 ${
                    activeTab === "ai"
                      ? "text-orange-500"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <Brain size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobileView && showToolPanel && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowToolPanel(false)}
        />
      )}

      {/* Course Content and Learning Panel */}
      <div
        className={`grid gap-4 lg:gap-6 transition-all duration-300 ${
          isMobileView
            ? "grid-cols-1"
            : "grid-cols-1 xl:grid-cols-4 lg:grid-cols-3"
        }`}
      >
        {/* Course Content Sidebar */}
        <div
          className={`xl:col-span-1 lg:col-span-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 lg:p-4 ${
            isMobileView && !showCourseContent ? "hidden" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("CourseContent.title")}
            </h3>
            {/* <div className="text-xs text-gray-500 dark:text-gray-400">
              {(() => {
                const progressArray = Array.isArray(progress) ? progress : progress ? [progress] : [];
                return progressArray.filter((p: any) => p.state === 'completed').length;
              })()} / {allLessons.length} {t('CourseContent.completed_count')}
            </div> */}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(() => {
                    const progressArray = Array.isArray(progress)
                      ? progress
                      : progress
                      ? [progress]
                      : [];
                    const completedCount = progressArray.filter(
                      (p: any) => p.state === "completed"
                    ).length;
                    return allLessons.length > 0
                      ? (completedCount / allLessons.length) * 100
                      : 0;
                  })()}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {(() => {
                const progressArray = Array.isArray(progress)
                  ? progress
                  : progress
                  ? [progress]
                  : [];
                const completedCount = progressArray.filter(
                  (p: any) => p.state === "completed"
                ).length;
                return allLessons.length > 0
                  ? Math.round((completedCount / allLessons.length) * 100)
                  : 0;
              })()}
              % {t("CourseContent.progress_percentage")}
            </p>
          </div>

          {/* Module and Lesson List */}
          <div className="space-y-1 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  {t("CourseContent.loading_modules")}
                </div>
              </div>
            ) : courseModules?.length ? (
              courseModules.map((module: any) => (
                <ModuleLessons
                  key={module.id}
                  courseId={courseIdMemo}
                  module={module}
                  isExpanded={expandedModules.has(module.id)}
                  onToggle={() => toggleModuleExpansion(module.id)}
                  currentLessonId={currentLessonId}
                  onLessonClick={setCurrentLessonId}
                  progress={progress}
                  t={t}
                  allLessons={allLessons}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  {t("CourseContent.no_lessons")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Learning Panel */}
        <div
          className={`xl:col-span-3 lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            isMobileView && !showToolPanel
              ? "hidden scale-95 opacity-0"
              : "scale-100 opacity-100"
          } ${
            isMobileView
              ? "fixed inset-x-4 top-16 bottom-16 z-50 flex flex-col max-h-[80vh]"
              : ""
          }`}
        >
          {/* Mobile Panel Header */}
          {isMobileView && (
            <div className="lg:hidden flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t("CourseLearning.learning_tools")}
              </h3>
              <Button
                onClick={() => setShowToolPanel(false)}
                variant="ghost"
                size="sm"
                className="p-1"
              >
                <X size={16} />
              </Button>
            </div>
          )}

          {/* Tabs */}
          <div
            className={`flex flex-wrap border-b border-gray-200 dark:border-gray-700 ${
              isMobileView ? "px-3 flex-shrink-0" : ""
            }`}
          >
            {/* Chapters Tab - Only show for video lessons */}
            {currentLesson?.kind === "video" && (
              <Button
                onClick={() => setActiveTab("chapters")}
                variant="ghost"
                size="sm"
                className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                  activeTab === "chapters"
                    ? "text-orange-500"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline">Chapters</span>
              </Button>
            )}
            <Button
              onClick={() => setActiveTab("notes")}
              variant="ghost"
              size="sm"
              className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                activeTab === "notes"
                  ? "text-orange-500"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <PenTool size={16} />
              <span className="hidden sm:inline">Notes</span>
            </Button>
            <Button
              onClick={() => setActiveTab("quiz")}
              variant="ghost"
              size="sm"
              className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                activeTab === "quiz"
                  ? "text-orange-500"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Quiz</span>
            </Button>
            <Button
              onClick={() => setActiveTab("ai")}
              variant="ghost"
              size="sm"
              className={`gap-2 flex items-center px-3 py-2 text-sm border-b-2 border-b-transparent ${
                activeTab === "ai"
                  ? "text-orange-500"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <Brain size={16} />
              <span className="hidden sm:inline">AI Assistant</span>
            </Button>
          </div>

          {/* Tab Content */}
          <div
            className={`p-3 lg:p-4 overflow-y-auto ${
              isMobileView
                ? "flex-1 min-h-0 max-h-[calc(80vh-8rem)]"
                : "max-h-64 sm:max-h-80 lg:max-h-96"
            }`}
          >
            {activeTab === "chapters" && currentLesson?.kind === "video" && (
              <CourseChapterContent
                currentLessonId={currentLesson?.public_id}
                currentTimestamp={currentVideoTimestamp}
                onSeekTo={handleTimeUpdate}
              />
            )}
            {activeTab === "notes" && (
              <CourseNoteContent
                currentLessonId={currentLesson?.id}
                currentTimestamp={currentVideoTimestamp}
                onTimeUpdate={handleTimeUpdate}
                lessonKind={currentLesson?.kind}
              />
            )}

            {activeTab === "quiz" && currentLessonId && (
              <>
                {quiz.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {t("Quiz.loading")}
                    </div>
                  </div>
                ) : quiz.error ? (
                  <div className="text-center py-8">
                    <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t("LessonContent.error_loading_quiz")}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t("LessonContent.quiz_load_error")}
                    </p>
                  </div>
                ) : !quiz.questions.length ? (
                  <div className="text-center py-8">
                    <FileText
                      size={48}
                      className="text-gray-400 mx-auto mb-4"
                    />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t("Quiz.no_quiz_title")}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t("Quiz.no_quiz_message")}
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

            {activeTab === "quiz" && !currentLessonId && (
              <div className="text-center py-8">
                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("Quiz.select_lesson_title")}
                </h3>
                <p className="text-gray-600">
                  {t("Quiz.select_lesson_message")}
                </p>
              </div>
            )}

            {activeTab === "ai" && (
              <VideoAIAssistant
                courseSlug={courseSlug}
                currentLessonId={currentLessonId}
                currentTimestamp={currentVideoTimestamp}
                selectedText={null} // TODO: 实现文本选择功能
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
