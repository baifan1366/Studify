'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  HardDrive,
  Plus,
  TrendingUp,
  Calendar,
  Target,
  BarChart3,
  Clock,
  Award,
  Settings,
  Video,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useUserProfile } from '@/hooks/profile/use-profile';
import { useCourses } from '@/hooks/course/use-courses';
import { useStudentsByTutorId } from '@/hooks/students/use-student';
// import { useClassrooms } from '@/hooks/tutor-classroom/use-classroom';
import Link from 'next/link';

interface DashboardContentProps {}

const DashboardContent: React.FC<DashboardContentProps> = () => {
  const t = useTranslations('TutorDashboard');
  
  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  
  // Fetch tutor's courses
  const { data: courses = [], isLoading: coursesLoading } = useCourses(profile?.id);
  
  // Fetch tutor's students
  const { data: studentsData, isLoading: studentsLoading } = useStudentsByTutorId(profile?.id || 0);
  
  // Fetch tutor's classrooms
  // const { data: classroomsData, isLoading: classroomsLoading } = useClassrooms();

  const isLoading = profileLoading || coursesLoading || studentsLoading;

  // Calculate analytics
  const totalCourses = courses?.length || 0;
  const totalStudents = studentsData?.total_students || 0;
  // const totalClassrooms = classroomsData?.classrooms?.length || 0;
  const activeCourses = courses?.filter(course => course.status === 'active').length || 0;
  const pendingCourses = courses?.filter(course => course.status === 'pending').length || 0;
  
  // Quick action items
  const quickActions = [
    {
      title: t('create_course'),
      description: t('create_course_desc'),
      icon: BookOpen,
      href: '/tutor/courses/create',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      title: t('create_classroom'),
      description: t('create_classroom_desc'),
      icon: Users,
      href: '/tutor/classroom/create',
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    {
      title: t('manage_students'),
      description: t('manage_students_desc'),
      icon: GraduationCap,
      href: '/tutor/students',
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
    },
    {
      title: t('manage_storage'),
      description: t('manage_storage_desc'),
      icon: HardDrive,
      href: '/tutor/storage',
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
  ];

  // Feature showcase items
  const features = [
    {
      title: t('course_management'),
      description: t('course_management_desc'),
      icon: BookOpen,
      items: [t('create_courses'), t('manage_modules'), t('track_progress')],
      href: '/tutor/teaching/course-content',
    },
    {
      title: t('classroom_system'),
      description: t('classroom_system_desc'),
      icon: Video,
      items: [t('live_sessions'), t('chat_messaging'), t('assignments')],
      href: '/tutor/classroom',
    },
    {
      title: t('quiz_system'),
      description: t('quiz_system_desc'),
      icon: FileText,
      items: [t('create_quizzes'), t('ai_generation'), t('track_results')],
      href: '/tutor/teaching/quiz-content',
    },
    {
      title: t('student_management'),
      description: t('student_management_desc'),
      icon: GraduationCap,
      items: [t('enrollment_tracking'), t('progress_monitoring'), t('status_updates')],
      href: '/tutor/student',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('welcome_back')}, {profile?.full_name || profile?.display_name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('dashboard_subtitle')}
        </p>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_courses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {activeCourses} {t('active')}, {pendingCourses} {t('pending')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_students')}</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t('across_courses')} {studentsData?.total_courses || 0} {t('courses')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('classrooms')}</CardTitle>
            <Video className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              {t('active_classrooms')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('this_month')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses?.filter(course => {
                const courseDate = new Date(course.created_at);
                const thisMonth = new Date();
                return courseDate.getMonth() === thisMonth.getMonth() && 
                       courseDate.getFullYear() === thisMonth.getFullYear();
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('new_courses_created')}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature Showcase */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
          {t('system_features')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="mt-1">{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feature.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                  <Separator className="my-3" />
                  <Link href={feature.href}>
                    <Button variant="outline" className="w-full">
                      <span>{t('explore_feature')}</span>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity & Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Recent Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>{t('recent_courses')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses && courses.length > 0 ? (
              <div className="space-y-4">
                {courses.slice(0, 5).map((course) => (
                  <div key={course.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{course.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('created')} {new Date(course.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={course.status === 'active' ? 'default' : course.status === 'pending' ? 'secondary' : 'destructive'}>
                      {course.status}
                    </Badge>
                  </div>
                ))}
                <Link href="/tutor/teaching/course-content">
                  <Button variant="ghost" className="w-full mt-4">
                    {t('view_all_courses')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">{t('no_courses_yet')}</p>
                <Link href="/tutor/teaching/course-content">
                  <Button className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('create_first_course')}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>{t('course_overview')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('active_courses')}</span>
                <span className="text-sm font-medium">{activeCourses}/{totalCourses}</span>
              </div>
              <Progress value={totalCourses > 0 ? (activeCourses / totalCourses) * 100 : 0} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('pending_approval')}</span>
                <span className="text-sm font-medium">{pendingCourses}/{totalCourses}</span>
              </div>
              <Progress value={totalCourses > 0 ? (pendingCourses / totalCourses) * 100 : 0} className="h-2" />
            </div>

            <Separator />
            
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('student_engagement')}</span>
                <Award className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-center">
                {totalStudents > 0 ? Math.round(totalStudents / (totalCourses || 1)) : 0}
              </p>
              <p className="text-xs text-gray-500 text-center">{t('avg_students_per_course')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardContent;