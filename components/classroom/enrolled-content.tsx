"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { BookOpen, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

export default function EnrolledContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('enrolled');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();

  // Mock enrolled courses data
  const enrolledCourses = [
    {
      id: 1,
      title: "Advanced Mathematics",
      instructor: "Dr. Sarah Johnson",
      progress: 75,
      totalLessons: 24,
      completedLessons: 18,
      nextLesson: "Calculus Integration",
      dueDate: "2024-01-15",
      status: "active",
      color: "from-blue-500 to-cyan-500",
      lastAccessed: "2 hours ago"
    },
    {
      id: 2,
      title: "Physics Fundamentals",
      instructor: "Prof. Michael Chen",
      progress: 45,
      totalLessons: 20,
      completedLessons: 9,
      nextLesson: "Newton's Laws",
      dueDate: "2024-01-20",
      status: "active",
      color: "from-purple-500 to-pink-500",
      lastAccessed: "1 day ago"
    },
    {
      id: 3,
      title: "Chemistry Lab",
      instructor: "Dr. Emily Davis",
      progress: 90,
      totalLessons: 16,
      completedLessons: 14,
      nextLesson: "Final Project",
      dueDate: "2024-01-10",
      status: "near_completion",
      color: "from-green-500 to-teal-500",
      lastAccessed: "3 hours ago"
    },
    {
      id: 4,
      title: "Computer Science",
      instructor: "Mr. David Lee",
      progress: 25,
      totalLessons: 32,
      completedLessons: 8,
      nextLesson: "Data Structures",
      dueDate: "2024-02-01",
      status: "behind",
      color: "from-orange-500 to-red-500",
      lastAccessed: "5 days ago"
    }
  ];

  // Fetch user authentication data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Error fetching user:', error);
        } else {
          setUser(user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);



  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
  };

  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  const handleMenuToggle = () => {
    setIsPermanentlyExpanded(!isPermanentlyExpanded);
    setSidebarExpanded(!isPermanentlyExpanded);
  };

  const handleContinueCourse = (courseId: number) => {
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
        return 'On Track';
      case 'near_completion':
        return 'Near Completion';
      case 'behind':
        return 'Behind Schedule';
      default:
        return 'Unknown';
    }
  };

  return (
    <AnimatedBackground>
      {/* Header */}
      <ClassroomHeader
        title="Enrolled Courses"
        userName={user?.email?.split('@')[0] || 'Student'}
        onProfileClick={() => handleHeaderAction('profile')}
        sidebarExpanded={isPermanentlyExpanded}
        onMenuToggle={handleMenuToggle}
      />

      {/* Sidebar */}
      <AnimatedSidebar
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
        onExpansionChange={setSidebarExpanded}
        isPermanentlyExpanded={isPermanentlyExpanded}
      />

      {/* Main Content Area */}
      <motion.div
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`
        }}
      >

        {/* Enrolled Courses Content */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              My Enrolled Courses
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              Continue your learning journey and track your progress
            </p>
          </div>

          {/* Course Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{enrolledCourses.length}</div>
                <div className="text-white/70 text-sm">Total Courses</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {enrolledCourses.filter(c => c.status === 'active').length}
                </div>
                <div className="text-white/70 text-sm">Active</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {enrolledCourses.filter(c => c.status === 'near_completion').length}
                </div>
                <div className="text-white/70 text-sm">Near Completion</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-2">
                  {Math.round(enrolledCourses.reduce((acc, course) => acc + course.progress, 0) / enrolledCourses.length)}%
                </div>
                <div className="text-white/70 text-sm">Avg Progress</div>
              </div>
            </motion.div>
          </div>

          {/* Enrolled Courses Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              // Skeleton loading state
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
              enrolledCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  {/* Course Header */}
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

                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/70 dark:text-white/70">Progress</span>
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
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                      <span>Last accessed: {course.lastAccessed}</span>
                    </div>
                  </div>

                  {/* Next Lesson */}
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-sm text-white/70 mb-1">Next Lesson:</div>
                    <div className="text-white font-medium">{course.nextLesson}</div>
                    <div className="text-xs text-white/60 mt-1">Due: {course.dueDate}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleContinueCourse(course.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      Continue Learning
                    </button>
                    <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatedBackground>
  );
}
