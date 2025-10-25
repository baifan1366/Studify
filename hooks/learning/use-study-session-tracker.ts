import { useEffect, useRef, useCallback } from "react";
import { useCreateStudySession } from "@/hooks/profile/use-learning-stats";

interface UseStudySessionTrackerOptions {
  lessonId?: string; // public_id
  courseId?: string; // public_id
  activityType?: "video_watching" | "quiz_taking" | "reading" | "practice";
  autoStart?: boolean;
  minDuration?: number; // Minimum minutes to record (default: 1)
}

/**
 * Hook to automatically track study sessions
 * Records time spent on learning activities for gamification
 */
export function useStudySessionTracker({
  lessonId,
  courseId,
  activityType = "video_watching",
  autoStart = true,
  minDuration = 1,
}: UseStudySessionTrackerOptions) {
  const createSession = useCreateStudySession();

  const sessionStartRef = useRef<Date | null>(null);
  const accumulatedTimeRef = useRef(0); // In minutes
  const lastSaveRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store latest values in refs to avoid stale closures
  const lessonIdRef = useRef(lessonId);
  const courseIdRef = useRef(courseId);
  const activityTypeRef = useRef(activityType);
  const minDurationRef = useRef(minDuration);
  
  // Update refs when props change
  useEffect(() => {
    lessonIdRef.current = lessonId;
    courseIdRef.current = courseId;
    activityTypeRef.current = activityType;
    minDurationRef.current = minDuration;
  }, [lessonId, courseId, activityType, minDuration]);

  // Start tracking session
  const startSession = useCallback(() => {
    if (!sessionStartRef.current) {
      sessionStartRef.current = new Date();
      console.log("📚 Study session started:", activityTypeRef.current);
    }
  }, []);

  // Stop and save session
  const stopSession = useCallback(async () => {
    if (!sessionStartRef.current) return;

    const sessionEnd = new Date();
    const durationMinutes =
      (sessionEnd.getTime() - sessionStartRef.current.getTime()) / 1000 / 60;

    // Only save if duration meets minimum threshold
    if (durationMinutes >= minDurationRef.current) {
      try {
        await createSession.mutateAsync({
          lessonId: lessonIdRef.current || undefined,
          courseId: courseIdRef.current || undefined,
          sessionStart: sessionStartRef.current.toISOString(),
          sessionEnd: sessionEnd.toISOString(),
          durationMinutes: Math.round(durationMinutes),
          activityType: activityTypeRef.current,
        });

        console.log(
          `✅ Study session saved: ${Math.round(durationMinutes)} minutes`,
          {
            lessonId: lessonIdRef.current,
            activityType: activityTypeRef.current,
          }
        );

        accumulatedTimeRef.current += durationMinutes;
      } catch (error) {
        console.error("Failed to save study session:", error);
      }
    } else {
      console.log(
        `⏭️ Session too short to record: ${durationMinutes.toFixed(
          1
        )} min < ${minDurationRef.current} min`
      );
    }

    // Reset session
    sessionStartRef.current = null;
  }, [createSession]);

  // Periodic save (every 5 minutes)
  const saveProgress = useCallback(async () => {
    if (!sessionStartRef.current) return;

    const now = new Date();
    const durationSinceStart =
      (now.getTime() - sessionStartRef.current.getTime()) / 1000 / 60;

    // Calculate duration since last save
    let durationToSave = durationSinceStart;
    if (lastSaveRef.current) {
      durationToSave =
        (now.getTime() - lastSaveRef.current.getTime()) / 1000 / 60;
    }

    if (durationToSave >= minDurationRef.current) {
      try {
        await createSession.mutateAsync({
          lessonId: lessonIdRef.current || undefined,
          courseId: courseIdRef.current || undefined,
          sessionStart:
            lastSaveRef.current?.toISOString() ||
            sessionStartRef.current.toISOString(),
          sessionEnd: now.toISOString(),
          durationMinutes: Math.round(durationToSave),
          activityType: activityTypeRef.current,
        });

        console.log(`💾 Progress saved: ${Math.round(durationToSave)} minutes`);
        accumulatedTimeRef.current += durationToSave;
        lastSaveRef.current = now;
      } catch (error) {
        console.error("Failed to save progress:", error);
      }
    }
  }, [createSession]);

  // Auto-start session when lesson changes
  useEffect(() => {
    if (autoStart && lessonId) {
      startSession();

      // Set up periodic saves every 5 minutes
      intervalRef.current = setInterval(() => {
        saveProgress();
      }, 5 * 60 * 1000); // 5 minutes
    }

    // Cleanup: save on unmount or lesson change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, autoStart]); // Only re-run when lessonId or autoStart changes

  // Save on visibility change (user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the tab - save progress
        saveProgress();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set up once

  // Save on beforeunload (user closes tab/window)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set up once

  return {
    startSession,
    stopSession,
    saveProgress,
    isTracking: sessionStartRef.current !== null,
    accumulatedTime: accumulatedTimeRef.current,
    isSaving: createSession.isPending,
  };
}
