'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Play, 
  CheckCircle, 
  Award,
  Target,
  Brain,
  ShoppingCart,
  Globe,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useCourseBySlug } from '@/hooks/course/use-courses';
import { usePurchaseCourse } from '@/hooks/course/use-course-purchase';
import { useUser } from '@/hooks/profile/use-user';
import { useEnrolledCourseStatus } from '@/hooks/course/use-enrolled-courses';
import { useEnrolledStudentByCourse } from '@/hooks/students/use-student';
import { useModuleByCourseId } from '@/hooks/course/use-course-module';
import { useLessonByCourseModuleId } from '@/hooks/course/use-course-lesson';
import { Enrollment } from '@/interface/courses/enrollment-interface';
import { ModuleWithLessons } from '@/interface/courses/module-interface';
import { Lesson } from '@/interface/courses/lesson-interface';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useFormat } from '@/hooks/use-format';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import MegaImage from '@/components/attachment/mega-blob-image';
import BannedCourseDisplay from './banned-course-display';

interface CourseDetailContentProps {
  courseSlug: string;
}

// Component for handling module lessons with dedicated hook
interface ModuleLessonsProps {
  courseId: number;
  module: ModuleWithLessons;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

function ModuleLessons({ courseId, module, isExpanded, onToggle, t }: ModuleLessonsProps) {
  // Fetch lessons for this specific module using dedicated hook
  const { data: moduleLessons, isLoading: lessonsLoading } = useLessonByCourseModuleId(
    courseId,
    module.id
  );

  // Calculate total module duration
  const totalDuration = moduleLessons?.reduce((total, lesson) => {
    return total + (lesson.duration_sec || 0);
  }, 0) || 0;

  const lessonCount = moduleLessons?.length || 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
          <h3 className="text-base lg:text-lg font-semibold text-foreground truncate">
            {module.title}
          </h3>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {lessonCount} {lessonCount === 1 ? t('lesson') : t('lessons')}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.ceil(totalDuration / 60)} {t('min')}
          </span>
          {isExpanded ? (
            <ChevronDown size={20} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={20} className="text-muted-foreground" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="divide-y divide-border">
          {lessonsLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2].map((index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : moduleLessons && moduleLessons.length > 0 ? (
            moduleLessons.map((lesson: Lesson, lessonIndex: number) => (
              <div key={lesson.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Play size={16} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground text-sm lg:text-base truncate">
                    {lesson.title}
                  </span>
                  {lesson.kind && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex-shrink-0">
                      {lesson.kind}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground text-sm flex-shrink-0">
                  {lesson.duration_sec ? Math.ceil(lesson.duration_sec / 60) : 0} {t('min')}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-muted-foreground text-center">
              {t('lessons_coming_soon')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseDetailContent({ courseSlug }: CourseDetailContentProps) {  
  // Use centralized user authentication
  const { data: userData, isLoading: userLoading } = useUser();
  const user = userData || null;
  const t = useTranslations('CourseDetailContent');
  const { formatPrice } = useFormat();
  const router = useRouter();

  const { data: course, isLoading, refetch: refetchCourse } = useCourseBySlug(courseSlug);
  const { toast } = useToast();
  const purchaseCourse = usePurchaseCourse();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';
  
  // Check enrollment status
  const userId = userData?.profile?.id;
  const courseId = course?.id;
  const { data: enrollmentData, refetch: refetchEnrollment } = useEnrolledCourseStatus(
    Number(userId) || 0,
    Number(courseId) || 0
  );
  // Only consider enrolled if we have valid user, course, and actual enrollment data with records
  const isEnrolled = !!(userId && courseId && enrollmentData && Array.isArray(enrollmentData) && enrollmentData.length > 0);

  // Get enrollments for this specific course to calculate real student count
  const { data: courseEnrollments } = useEnrolledStudentByCourse(Number(courseId) || 0);
  
  // Get course modules using dedicated hook
  const { data: courseModules, isLoading: modulesLoading } = useModuleByCourseId(Number(courseId) || 0);
  
  // State for managing module collapse/expand
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  
  // State for managing Show More/Show Less functionality
  const [showAllObjectives, setShowAllObjectives] = useState(false);
  const [showAllRequirements, setShowAllRequirements] = useState(false);
  
  // Toggle module expansion
  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };
  
  // Calculate actual enrolled student count for this course
  const actualStudentCount = useMemo(() => {
    if (!courseEnrollments || !courseId) return course?.total_students || 0;
    
    // Count students enrolled in this specific course with active or completed status
    const count = courseEnrollments.filter((enrollment: Enrollment) => 
      ['active', 'completed'].includes(enrollment.status)
    ).length;
    
    return count;
  }, [courseEnrollments, courseId, course?.total_students]);

  // Handle success parameter from payment completion
  useEffect(() => {
    if (isSuccess && course) {
      // Show success message
      toast({
        title: t('payment_successful'),
        description: t('enrollment_success_desc', { title: course.title }),
        variant: 'default',
      });

      // Show additional messages for auto-creation if applicable
      if (course.auto_create_classroom || course.auto_create_community) {
        setTimeout(() => {
          let autoMessage = '';
          if (course.auto_create_classroom && course.auto_create_community) {
            autoMessage = t('auto_creation_success');
          } else if (course.auto_create_classroom) {
            autoMessage = t('auto_creation_classroom_only');
          } else if (course.auto_create_community) {
            autoMessage = t('auto_creation_community_only');
          }
          
          if (autoMessage) {
            toast({
              title: "🎉 " + autoMessage,
              description: "You can now access your classroom and community resources",
              variant: 'default',
            });
          }
        }, 2000); // Show after main success message
      }
      
      // Refetch course and enrollment data
      refetchCourse();
      refetchEnrollment();
      
      // Remove success parameter from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isSuccess, course, toast, refetchCourse, refetchEnrollment, t]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // setUser({
        //   id: '1',
        //   email: 'student@example.com',
        //   created_at: new Date().toISOString(),
        //   app_metadata: {},
        //   user_metadata: {},
        //   aud: 'authenticated',
        //   confirmation_sent_at: new Date().toISOString(),
        // });
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: t('error'),
          description: t('failed_load_user_data'),
          variant: 'destructive',
        });
      }
    };

    fetchUser();
  }, [toast]);

  const handleEnrollNow = async () => {
    if (!course) return;
    
    try {
      const result = await purchaseCourse.mutateAsync({
        courseId: course.public_id
      });
      
      if (result.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl;
      } else {
        // Free course - show success message and redirect to course
        toast({
          title: t('enrollment_successful'),
          description: t('enrollment_successful_desc'),
        });
        // Redirect to course learning page
        window.location.href = `/courses/${courseSlug}/learn`;
      }
    } catch (error) {
      toast({
        title: t('enrollment_failed'),
        description: t('enrollment_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <Skeleton className="w-full h-64 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('course_not_found')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('course_not_found_desc')}
          </p>
        </div>
      </div>
    );
  }

  // Check if course is banned
  if (course.status === 'ban') {
    return (
      <BannedCourseDisplay 
        courseId={course.id} 
        courseName={course.title} 
      />
    );
  }

  const isFree = !course.price_cents || course.price_cents === 0;
  const price = formatPrice(course.price_cents || 0, course.currency || 'USD', isFree);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-6 lg:p-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium border border-blue-500/20">
                    {course.level?.toUpperCase() || t('all_levels')}
                  </span>
                  <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm font-medium border border-green-500/20">
                    {course.category || t('general')}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  {course.title}
                </h1>
                <p className="text-base lg:text-lg text-muted-foreground leading-relaxed line-clamp-3">
                  {course.description}
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-4 lg:gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  <span className="text-sm lg:text-base">
                    {course.total_duration_minutes || 0} {t('minutes')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <span className="text-sm lg:text-base">
                    {actualStudentCount} {t('students')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-yellow-500 fill-current" />
                  <span className="text-sm lg:text-base">
                    {course.average_rating?.toFixed(1) || '0.0'}
                  </span>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-4">
                <div className="text-2xl lg:text-3xl font-bold text-foreground">
                  {price}
                </div>
                {!isEnrolled && (
                  <Button
                    onClick={handleEnrollNow}
                    disabled={purchaseCourse.isPending}
                    variant="default"
                  >
                    {purchaseCourse.isPending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('processing')}
                      </>
                    ) : isFree ? (
                      <>
                        <Play size={20} />
                        {t('enroll_free')}
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={20} />
                        {t('buy_now')}
                      </>
                    )}
                  </Button>
                )}
                {isEnrolled && (
                  <>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                      <CheckCircle size={20} />
                      {t('already_enrolled')}
                    </div>
                    <Button
                      onClick={() => router.push(`/courses/${courseSlug}/learn`)}
                      variant="default"
                    >
                      <Play size={20} />
                      {t('start_now')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="order-first lg:order-last">
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center border border-border overflow-hidden">
                {course.thumbnail_url ? (
                  // Check if it's a MEGA URL
                  course.thumbnail_url.includes('mega.nz') ? (
                    <MegaImage
                      megaUrl={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(error) => {
                        console.error('Failed to load MEGA thumbnail:', error);
                        // Could show fallback UI here
                      }}
                    />
                  ) : (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      width={400}
                      height={250}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="text-center">
                    <Play size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('course_preview')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* What You'll Learn */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Target size={24} className="text-primary" />
                {t('what_youll_learn')}
              </h2>
              <div className="grid gap-4">
                {course.learning_objectives && course.learning_objectives.length > 0 ? (
                  course.learning_objectives
                    .slice(0, showAllObjectives ? undefined : 5)
                    .map((objective, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground text-sm lg:text-base leading-relaxed">
                          {objective}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="text-muted-foreground">
                    {t('learning_objectives_soon')}
                  </div>
                )}
              </div>
              {course.learning_objectives && course.learning_objectives.length > 5 && (
                <button
                  onClick={() => setShowAllObjectives(!showAllObjectives)}
                  className="mt-4 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                >
                  {showAllObjectives ? t('show_less') : t('show_more')} ({course.learning_objectives.length - 5} more)
                </button>
              )}
            </div>

            {/* Course Content */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <BookOpen size={24} className="text-primary" />
                {t('course_content')}
              </h2>
              <div className="space-y-4">
                {modulesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((index) => (
                      <Skeleton key={index} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : courseModules && Array.isArray(courseModules) && courseModules.length > 0 ? (
                  courseModules.map((module: ModuleWithLessons, moduleIndex: number) => (
                    <ModuleLessons
                      key={module.id}
                      courseId={Number(courseId) || 0}
                      module={module}
                      isExpanded={expandedModules.has(module.id)}
                      onToggle={() => toggleModule(module.id)}
                      t={t}
                    />
                  ))
                ) : (
                  <div className="text-muted-foreground text-center py-8">
                    {t('course_modules_soon')}
                  </div>
                )}
              </div>
            </div>

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-6">
                  {t('requirements')}
                </h2>
                <ul className="space-y-3">
                  {course.requirements
                    .slice(0, showAllRequirements ? undefined : 4)
                    .map((requirement, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="text-muted-foreground text-sm lg:text-base leading-relaxed">
                          {requirement}
                        </span>
                      </li>
                    ))}
                </ul>
                {course.requirements.length > 4 && (
                  <button
                    onClick={() => setShowAllRequirements(!showAllRequirements)}
                    className="mt-4 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  >
                    {showAllRequirements ? t('show_less') : t('show_more')} ({course.requirements.length - 4} more)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Stats */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">
                {t('course_stats')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm lg:text-base">
                    {t('students')}
                  </span>
                  <span className="text-foreground font-semibold">
                    {actualStudentCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm lg:text-base">
                    {t('duration')}
                  </span>
                  <span className="text-foreground font-semibold">
                    {Math.floor((course.total_duration_minutes || 0) / 60)}h {(course.total_duration_minutes || 0) % 60}m
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm lg:text-base">
                    {t('level')}
                  </span>
                  <span className="text-foreground font-semibold">
                    {course.level || t('all_levels')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm lg:text-base flex items-center gap-2">
                    <Globe size={16} />
                    {t('language')}
                  </span>
                  <span className="text-foreground font-semibold">
                    {t('english')}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="text-center">
                <Award size={48} className="text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('certificate_completion')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('certificate_completion_desc')}
                </p>
              </div>
            </div>

            {/* AI Features */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="text-center">
                <Brain size={48} className="text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('ai_powered_learning')}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('ai_powered_learning_desc')}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    {t('adaptive_learning_paths')}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    {t('smart_note_taking')}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    {t('progress_analytics')}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    {t('knowledge_graphs')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
