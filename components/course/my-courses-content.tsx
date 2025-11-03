'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/profile/use-user';
import { BookOpen, Clock, Users, Star } from 'lucide-react';
import { useEnrolledCoursesByUserId } from '@/hooks/course/use-enrolled-courses';
import { useCourseProgress } from '@/hooks/course/use-course-progress';
import { useAllLessonsByCourseId } from '@/hooks/course/use-course-lesson';
import { useModuleByCourseId } from '@/hooks/course/use-course-module';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { ReportButton } from '@/components/ui/report-button';

// Enriched enrollment type with course data from API
interface EnrollmentWithCourse {
  id: number;
  public_id: string;
  course_id: number;
  user_id: number;
  role: 'student' | 'tutor' | 'owner' | 'assistant';
  status: 'active' | 'completed' | 'dropped' | 'locked';
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  course: {
    id: number;
    public_id: string;
    title: string;
    description?: string;
    slug: string;
    thumbnail_url?: string | null;
    price_cents?: number;
    currency?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    category?: string;
    status?: string;
    created_at: string;
    updated_at: string;
  };
}

// UI course type for better type safety
interface UICourse {
  id: number;
  courseId: string;
  course: {
    id: number;
    title: string;
    slug: string;
    total_duration_minutes?: number;
    total_students?: number;
    average_rating?: number;
    thumbnail_url?: string | null;
    level?: 'beginner' | 'intermediate' | 'advanced';
    public_id: string;
  };
  title: string;
  duration: string;
  students: number;
  rating: number;
  level: string;
  progress: number;
  color: string;
  thumbnail: string | null;
}

// Custom hook to calculate course progress based on lesson completion
function useCourseProgressCalculation(courseId: number, coursePublicId: string) {
  const { data: courseModules } = useModuleByCourseId(courseId);
  const { data: allLessons = [] } = useAllLessonsByCourseId(courseId, courseModules || []);
  const { data: progress } = useCourseProgress(coursePublicId);

  const calculatedProgress = React.useMemo(() => {
    if (!allLessons.length) return 0;
    if (!progress || !Array.isArray(progress)) return 0;
    
    const completedCount = progress.filter((p) => p.state === 'completed').length;
    return Math.round((completedCount / allLessons.length) * 100);
  }, [progress, allLessons]);

  return calculatedProgress;
}

// Course card component with real-time progress calculation
function CourseCard({ course, index, t, onContinueCourse, onCourseDetails }: {
  course: UICourse;
  index: number;
  t: (key: string) => string;
  onContinueCourse: (courseSlug: string) => void;
  onCourseDetails: (courseSlug: string) => void;
}) {
  const calculatedProgress = useCourseProgressCalculation(course.course.id, course.course.public_id);
  
  return (
    <motion.div
      key={course.id}
      className="bg-white/5 hover:bg-white/10 rounded-xl p-6 border border-white/10 transition-all duration-300 flex flex-col h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ scale: 1.02, y: -5 }}
    >
      {/* Course Header */}
      <div className="flex items-start gap-4 mb-4">
        {course?.thumbnail ? (
          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
            <img 
              src={course.thumbnail} 
              alt={course?.title || 'Course thumbnail'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 flex-shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
            <BookOpen size={24} className="text-gray-400 dark:text-gray-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg truncate">{course?.title || t('untitled_course')}</h3>
          <div className="text-sm text-white/60 capitalize">
            {course?.level ? t(course.level as 'beginner' | 'intermediate' | 'advanced') : t('beginner')}
          </div>
        </div>
        <div className="flex-shrink-0">
          <ReportButton 
            targetId={course.course.id} 
            targetType="course" 
          />
        </div>
      </div>

      {/* Course Stats */}
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-white/60 flex-shrink-0" />
        <span className="text-white/80 text-sm truncate">{t('self_paced')}</span>
      </div>

      {/* Progress with calculated percentage */}
      <div className="mt-auto">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-white/70">{t('progress')}</span>
          <span className="text-white">{calculatedProgress}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-1.5 mb-4">
          <motion.div
            className={`h-full rounded-full ${course.color} bg-gradient-to-r`}
            initial={{ width: 0 }}
            animate={{ width: `${calculatedProgress}%` }}
            transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto w-full">
        <Button
          onClick={() => onContinueCourse(course.course.slug)}
          variant="default"
          className="w-1/2"
        >
          {t(calculatedProgress > 0 ? 'continue_button' : 'start_button')}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => onCourseDetails(course.course.slug)}
          className="w-1/2"
        >
          {t('view_details')}
        </Button>
      </div>
    </motion.div>
  );
}

// A separate component for the loading state
function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="space-y-2 mb-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// A separate component for the error state
function ErrorState({ onRetry, t }: { onRetry: () => void; t: (key: string) => string }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-red-500 mb-4">{t('error_loading')}</h2>
      <p className="text-white/70 mb-6">{t('error_message')}</p>
      <Button 
        onClick={onRetry}
        variant="outline"
        className="border-white/20 hover:bg-white/10"
      >
        {t('retry_button')}
      </Button>
    </div>
  );
}

// A separate component for the empty state
function EmptyState({ onBrowseCourses, t }: { onBrowseCourses: () => void; t: (key: string) => string }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-white mb-4">{t('no_courses_title')}</h2>
      <p className="text-white/70 mb-6">{t('no_courses_message')}</p>
      <Button 
        onClick={onBrowseCourses}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {t('browse_courses')}
      </Button>
    </div>
  );
}

export default function MyCoursesContent() {
  const { data: user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('MyCoursesContent');
  const userId = user?.profile?.id ? parseInt(user.profile.id) : null;
  
  // State to hold the transformed UI courses data
  const [uiCourses, setUiCourses] = useState<UICourse[]>([]);
  
  // Get enrolled courses for the current user
  const { data: enrollments, isLoading, error, refetch } = useEnrolledCoursesByUserId(userId!) as {
    data: EnrollmentWithCourse[] | undefined;
    isLoading: boolean;
    error: any;
    refetch: () => void;
  };

  // Transform courses data when enrollments change
  useEffect(() => {
    if (!enrollments || !Array.isArray(enrollments)) {
      setUiCourses([]);
      return;
    }
    
    // First filter valid enrollments - check if enrollment has course data
    const validEnrollments = enrollments.filter(enrollment => {
      return enrollment && enrollment.course && typeof enrollment.course === 'object';
    });
    
    // Then map to UI format
    const processed = validEnrollments.map((enrollment: EnrollmentWithCourse, idx) => {
      const course = enrollment.course;

      return {
        id: enrollment.id,
        courseId: course.id.toString(),
        course: { // Include the full course object for nested access
          ...course,
          slug: course.slug || `course-${course.public_id}`, // Ensure we always have a slug
          total_duration_minutes: 0, // Will be calculated from lessons if needed
          total_students: 0, // Not available in enrollment data
          average_rating: 0, // Not available in enrollment data
        },
        title: course.title || 'Untitled Course',
        duration: 'Self-paced', // Default since we don't have duration in enrollment
        students: 0, // Not available in enrollment data
        rating: 0, // Not available in enrollment data
        level: course.level || 'beginner',
        progress: 0, // Will be calculated by the CourseCard component
        color: [
          'from-blue-500 to-cyan-500',
          'from-purple-500 to-pink-500',
          'from-green-500 to-teal-500',
          'from-orange-500 to-red-500',
          'from-indigo-500 to-purple-500',
          'from-cyan-500 to-blue-500',
        ][idx % 6],
        thumbnail: course.thumbnail_url || null,
      };
    });
    
    setUiCourses(processed);
  }, [enrollments]);

  // Handle loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Handle error state
  if (error) {
    return <ErrorState onRetry={() => refetch()} t={t} />;
  }

  // Handle empty state
  if (!enrollments || enrollments.length === 0) {
    return <EmptyState onBrowseCourses={() => router.push('/courses')} t={t} />;
  }

  const handleContinueCourse = (courseSlug: string) => {
    router.push(`/courses/${courseSlug}/learn`);
  };

  const handleCourseDetails = (courseSlug: string) => {
    router.push(`/courses/${courseSlug}`);
  };

  return (
    <>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
          {t('page_title')}
        </h1>
        <p className="text-lg text-white/70 mb-8 dark:text-white/70">
          {t('page_subtitle')}
        </p>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uiCourses.map((course, index) => (
          <CourseCard
            key={course.id}
            course={course}
            index={index}
            t={t}
            onContinueCourse={handleContinueCourse}
            onCourseDetails={handleCourseDetails}
          />
        ))}
      </div>
    </>
  );
}
