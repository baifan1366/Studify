'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';
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
  ShoppingCart
} from 'lucide-react';
import { useCourseBySlug } from '@/hooks/course/use-courses';
import { usePurchaseCourse } from '@/hooks/course/use-course-purchase';
import { useUser } from '@/hooks/profile/use-user';
import { useEnrolledCourseStatus } from '@/hooks/course/use-enrolled-courses';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import AnimatedBackground from '@/components/ui/animated-background';

interface CourseDetailContentProps {
  courseSlug: string;
}

export default function CourseDetailContent({ courseSlug }: CourseDetailContentProps) {
  const [activeMenuItem, setActiveMenuItem] = useState('courses');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  
  // Use centralized user authentication
  const { data: userData, isLoading: userLoading } = useUser();
  const user = userData || null;

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

  // Handle success parameter from payment completion
  useEffect(() => {
    if (isSuccess && course) {
      // Show success message
      toast({
        title: 'Payment Successful!',
        description: `You have successfully enrolled in ${course.title}`,
        variant: 'default',
      });
      
      // Refetch course and enrollment data
      refetchCourse();
      refetchEnrollment();
      
      // Remove success parameter from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isSuccess, course, toast, refetchCourse, refetchEnrollment]);

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
          title: 'Error',
          description: 'Failed to load user data',
          variant: 'destructive',
        });
      }
    };

    fetchUser();
  }, [toast]);

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
          title: 'Enrollment Successful',
          description: 'You have been enrolled in this course!',
        });
        // Redirect to course learning page
        window.location.href = `/courses/${courseSlug}/learn`;
      }
    } catch (error) {
      toast({
        title: 'Enrollment Failed',
        description: 'There was an error processing your enrollment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AnimatedBackground sidebarWidth={sidebarWidth}>
        <ClassroomHeader
          title="Course Details"
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
          className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
          style={{
            marginLeft: sidebarExpanded ? '280px' : '80px',
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`,
          }}
        >
          <div className="max-w-6xl mx-auto space-y-8">
            <Skeleton className="w-full h-64 rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
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
          <div className="max-w-6xl mx-auto text-center py-20">
            <h1 className="text-4xl font-bold text-white/90 mb-4">Course Not Found</h1>
            <p className="text-lg text-white/70">The course you're looking for doesn't exist.</p>
          </div>
        </motion.div>
      </AnimatedBackground>
    );
  }

  const price = course.price_cents ? `$${(course.price_cents / 100).toFixed(2)}` : 'Free';
  const isFree = !course.price_cents || course.price_cents === 0;

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
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`,
        }}
      >
        <motion.div
          className="max-w-6xl mx-auto space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {/* Hero Section */}
          <div className="relative bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      {course.level?.toUpperCase() || 'ALL LEVELS'}
                    </span>
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                      {course.category || 'General'}
                    </span>
                  </div>
                  <h1 className="text-4xl font-bold text-white mb-4">{course.title}</h1>
                  <p className="text-lg text-white/70">{course.description}</p>
                </div>

                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span>{course.total_duration_minutes || 0} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={20} />
                    <span>{course.total_students || 0} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={20} className="text-yellow-400 fill-current" />
                    <span>{course.average_rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-white">{price}</div>
                  {!isEnrolled && (
                    <Button
                      onClick={handleEnrollNow}
                      disabled={purchaseCourse.isPending}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      {purchaseCourse.isPending ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : isFree ? (
                        <>
                          <Play size={20} />
                          Free
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={20} />
                          Buy Now
                        </>
                      )}
                    </Button>
                  )}
                  {isEnrolled && (
                    <div className="flex items-center gap-2 text-green-400 font-semibold">
                      <CheckCircle size={20} />
                      Already Enrolled
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-white/10">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-center">
                      <Play size={64} className="text-white/60 mx-auto mb-4" />
                      <p className="text-white/60">Course Preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* What You'll Learn */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Target size={24} />
                  What You'll Learn
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.learning_objectives?.map((objective, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/80">{objective}</span>
                    </div>
                  )) || (
                    <div className="col-span-2 text-white/60">
                      Learning objectives will be available soon.
                    </div>
                  )}
                </div>
              </div>

              {/* Course Content */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <BookOpen size={24} />
                  Course Content
                </h2>
                <div className="space-y-4">
                  {course.modules?.map((module, moduleIndex) => (
                    <div key={module.id} className="border border-white/10 rounded-lg">
                      <div className="p-4 bg-white/5">
                        <h3 className="text-lg font-semibold text-white">
                          Module {moduleIndex + 1}: {module.title}
                        </h3>
                        {/* Module description not available in current type */}
                      </div>
                      <div className="divide-y divide-white/10">
                        {module.lessons?.map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Play size={16} className="text-white/60" />
                              <span className="text-white/80">{lesson.title}</span>
                            </div>
                            <span className="text-white/60 text-sm">
                              {lesson.duration_sec ? Math.ceil(lesson.duration_sec / 60) : 0} min
                            </span>
                          </div>
                        )) || (
                          <div className="p-4 text-white/60">Lessons coming soon...</div>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className="text-white/60">Course modules will be available soon.</div>
                  )}
                </div>
              </div>

              {/* Requirements */}
              {course.requirements && course.requirements.length > 0 && (
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-6">Requirements</h2>
                  <ul className="space-y-2">
                    {course.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-white/60 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-white/80">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Course Stats */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Course Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Students</span>
                    <span className="text-white font-semibold">{course.total_students || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Duration</span>
                    <span className="text-white font-semibold">
                      {Math.floor((course.total_duration_minutes || 0) / 60)}h {(course.total_duration_minutes || 0) % 60}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Level</span>
                    <span className="text-white font-semibold">{course.level || 'All Levels'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Language</span>
                    <span className="text-white font-semibold">English</span>
                  </div>
                </div>
              </div>

              {/* Certificate */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-center">
                  <Award size={48} className="text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Certificate of Completion</h3>
                  <p className="text-white/70 text-sm">
                    Earn a certificate when you complete this course
                  </p>
                </div>
              </div>

              {/* AI Features */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="text-center">
                  <Brain size={48} className="text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Learning</h3>
                  <p className="text-white/70 text-sm mb-4">
                    Get personalized recommendations and smart study assistance
                  </p>
                  <div className="space-y-2 text-sm text-white/60">
                    <div>• Adaptive learning paths</div>
                    <div>• Smart note-taking</div>
                    <div>• Progress analytics</div>
                    <div>• Knowledge graphs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatedBackground>
  );
}
