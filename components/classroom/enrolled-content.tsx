"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, CheckCircle, AlertCircle, Search, Plus } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useEnrolledCourses, useRecommendedCourses } from '@/hooks/use-enrolled-courses';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import JoinCourseDialog from './join-course-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';

export default function EnrolledContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('enrolled');
  const { data: userData } = useUser();
  const user = userData?.user;
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("enrolled");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const { toast } = useToast();
  const { data: enrolledCourses, isLoading, error } = useEnrolledCourses();
  const { data: recommendedCourses, isLoading: isLoadingRecommended } = useRecommendedCourses();
  const t = useTranslations('EnrolledContent');

  // Filter courses based on search query
  const filteredCourses = enrolledCourses?.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // 检查是否有已注册的课程
  const hasEnrolledCourses = enrolledCourses && enrolledCourses.length > 0;

  React.useEffect(() => {
    if (error) {
      console.error('Error fetching enrolled courses:', error);
      toast({
        title: t('error_title'),
        description: t('error_fetch_courses'),
        variant: "destructive",
      });
    }
  }, [error, toast]);

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
    setSidebarWidth(newExpanded ? 280 : 80);
  };

  const handleContinueCourse = (courseId: string) => {
    toast({
      title: "Continue Course",
      description: `Continuing course ${courseId}...`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play size={16} className="text-green-400" />;
      case 'near_completion':
        return <CheckCircle size={16} className="text-blue-400" />;
      case 'behind':
        return <AlertCircle size={16} className="text-orange-400" />;
      default:
        return <BookOpen size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('status.on_track');
      case 'near_completion':
        return t('status.near_completion');
      case 'behind':
        return t('status.behind');
      default:
        return t('status.unknown');
    }
  };

  return (
    <AnimatedBackground sidebarWidth={sidebarWidth}>
      <ClassroomHeader
        title={t('header_title')}
        userName={user?.email?.split('@')[0] || t('default_user_name')}
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
          marginLeft: `${sidebarWidth}px`,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarWidth}px)`
        }}
      >
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white/90 dark:text-white/90">
                {t('page_title')}
              </h1>
              <p className="text-lg text-white/70 dark:text-white/70 mt-2">
                {t('page_subtitle')}
              </p>
            </div>
            <Button 
              onClick={() => setIsJoinDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Plus size={16} />
              {t('actions.join_course')}
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="enrolled" className="data-[state=active]:bg-white/20">
                {t('tabs.enrolled')}
              </TabsTrigger>
              <TabsTrigger value="recommended" className="data-[state=active]:bg-white/20">
                {t('tabs.recommended')}
              </TabsTrigger>
            </TabsList>

            {/* Search and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                <Input
                  type="text"
                  placeholder={t('search_placeholder')}
                  className="w-full bg-white/10 backdrop-blur-sm border-white/20 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Course Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Stats Cards */}
              </div>
            </div>

            {/* Join Course Dialog */}
            <JoinCourseDialog 
              isOpen={isJoinDialogOpen} 
              onClose={() => setIsJoinDialogOpen(false)} 
            />

            <TabsContent value="enrolled" className="mt-0">
              {!hasEnrolledCourses && !isLoading ? (
                <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                  <BookOpen size={48} className="mx-auto text-white/40 mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">{t('empty.title')}</h3>
                  <p className="text-white/60 mb-6 max-w-md mx-auto">{t('empty.desc')}</p>
                  <Button 
                    onClick={() => setActiveTab("recommended")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {t('empty.browse_recommended')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {isLoading ? (
                    [...Array(4)].map((_, index) => (
                      <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        <div className="flex items-center gap-3 mb-4">
                          <Skeleton className="w-12 h-12 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                        <Skeleton className="h-20 w-full mb-4" />
                        <div className="flex gap-2">
                          <Skeleton className="h-8 flex-1" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredCourses?.map((course, index) => (
                        <motion.div
                          key={course.id}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.6 }}
                          whileHover={{ scale: 1.02, y: -5 }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-r ${course.color} rounded-lg flex items-center justify-center`}>
                              <BookOpen size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg dark:text-white">{course.title}</h3>
                              <p className="text-white/60 text-sm dark:text-white/60">{course.instructor}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(course.status)}
                              <span className="text-xs text-white/70">{getStatusText(course.status)}</span>
                            </div>
                          </div>
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-white/70 dark:text-white/70">{t('labels.progress')}</span>
                              <span className="text-white dark:text-white">{course.progress}%</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                              <motion.div
                                className={`bg-gradient-to-r ${course.color} h-2 rounded-full`}
                                initial={{ width: 0 }}
                                animate={{ width: `${course.progress}%` }}
                                transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-white/60">
                              <span>{t('labels.lessons_count', { completed: course.completedLessons, total: course.totalLessons })}</span>
                              <span>{t('labels.last_accessed', { date: course.lastAccessed })}</span>
                            </div>
                          </div>
                          <div className="mb-4 p-3 bg-white/5 rounded-lg">
                            <div className="text-sm text-white/70 mb-1">{t('labels.next_lesson')}</div>
                            <div className="text-white font-medium">{course.nextLesson}</div>
                            <div className="text-xs text-white/60 mt-1">{t('labels.due', { date: course.dueDate })}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleContinueCourse(course.id)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <Play size={16} />
                              {t('buttons.continue_learning')}
                            </button>
                            <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                              {t('buttons.view_details')}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recommended" className="mt-0">
              {isLoadingRecommended ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <div className="flex items-center gap-3 mb-4">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-20 w-full mb-4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recommendedCourses?.map((course, index) => (
                    <motion.div
                      key={course.id}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      whileHover={{ scale: 1.02, y: -5 }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-r ${course.color} rounded-lg flex items-center justify-center`}>
                          <BookOpen size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg dark:text-white">{course.title}</h3>
                          <p className="text-white/60 text-sm dark:text-white/60">{course.instructor}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-white/70">
                            {course.tags[0]}
                          </span>
                        </div>
                      </div>
                      <div className="mb-4 text-white/80">
                        <p className="line-clamp-2 text-sm">{course.description}</p>
                      </div>
                      <div className="mb-4 flex justify-between text-sm text-white/70">
                        <div className="flex items-center gap-1">
                          <BookOpen size={14} />
                          <span>{course.totalLessons} lessons</span>
                        </div>
                        <div>
                          <span>{course.studentCount} students</span>
                        </div>
                        <div>
                          <span>★ {course.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="mb-4 p-3 bg-white/5 rounded-lg">
                        <div className="text-sm text-white/70 mb-1">{t('recommended.because')}</div>
                        <div className="text-white text-sm">{course.recommendReason}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setIsJoinDialogOpen(true)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          {t('actions.join_course')}
                        </Button>
                        <Button 
                          variant="outline"
                          className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                          {t('buttons.view_details')}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </AnimatedBackground>
  );
}
