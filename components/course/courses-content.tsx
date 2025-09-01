"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { BookOpen, Clock, Users, Star } from 'lucide-react';
// import { useCourses } from '@/hooks/use-courses';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

export default function CoursesContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('courses');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80); // Add sidebar width state
  
  // const { data: courses, isLoading, error } = useCourses();
  const isLoading = false; // Temporary for demo
  const { toast } = useToast();

  // Mock course data - should come from API
  const mockCourses = [
    {
      id: 1,
      title: "Advanced Mathematics",
      instructor: "Dr. Sarah Johnson",
      duration: "12 weeks",
      students: 156,
      rating: 4.8,
      progress: 75,
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      title: "Physics Fundamentals",
      instructor: "Prof. Michael Chen",
      duration: "10 weeks",
      students: 89,
      rating: 4.6,
      progress: 45,
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      title: "Chemistry Lab",
      instructor: "Dr. Emily Davis",
      duration: "8 weeks",
      students: 67,
      rating: 4.9,
      progress: 90,
      color: "from-green-500 to-teal-500"
    },
    {
      id: 4,
      title: "Biology Essentials",
      instructor: "Dr. Robert Wilson",
      duration: "14 weeks",
      students: 134,
      rating: 4.7,
      progress: 30,
      color: "from-orange-500 to-red-500"
    },
    {
      id: 5,
      title: "English Literature",
      instructor: "Ms. Amanda Brown",
      duration: "16 weeks",
      students: 98,
      rating: 4.5,
      progress: 60,
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: 6,
      title: "Computer Science",
      instructor: "Mr. David Lee",
      duration: "20 weeks",
      students: 203,
      rating: 4.9,
      progress: 25,
      color: "from-cyan-500 to-blue-500"
    }
  ];

  // Fetch user authentication data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // This should be replaced with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUser({
          id: '1',
          email: 'student@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          confirmation_sent_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      }
    };

    fetchUser();
  }, [toast]);



  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
    console.log('Menu item clicked:', itemId);
  };

  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  const handleMenuToggle = () => {
    const newExpanded = !isPermanentlyExpanded;
    setIsPermanentlyExpanded(newExpanded);
    setSidebarExpanded(newExpanded);
    setSidebarWidth(newExpanded ? 280 : 80); // Update sidebar width for synchronization
  };

  const handleContinueCourse = (courseId: number) => {
    toast({
      title: "Continue Course",
      description: `Continuing course ${courseId}...`,
    });
  };

  const handleCourseDetails = (courseId: number) => {
    toast({
      title: "Course Details",
      description: `Opening details for course ${courseId}...`,
    });
  };

  return (
    <AnimatedBackground sidebarWidth={sidebarWidth}>
      {/* Header */}
      <ClassroomHeader
        title="Courses"
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
          marginLeft: `${sidebarWidth}px`, // Use shared state for synchronization
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarWidth}px)`
        }}
      >

        {/* Courses Content */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              Course Catalog
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              Explore our comprehensive collection of courses and continue your learning journey
            </p>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Skeleton loading state
              [...Array(6)].map((_, index) => (
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
                  <Skeleton className="h-3 w-1/3 mb-4" />
                  <div className="space-y-2 mb-4">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                </div>
              ))
            ) : (
              mockCourses.map((course, index) => (
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
                  </div>

                  {/* Course Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-white/60" />
                      <span className="text-white/80 text-sm dark:text-white/80">{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-white/60" />
                      <span className="text-white/80 text-sm dark:text-white/80">{course.students}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < Math.floor(course.rating) ? "text-yellow-400 fill-current" : "text-white/30"}
                        />
                      ))}
                    </div>
                    <span className="text-white/80 text-sm dark:text-white/80">{course.rating}</span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/70 dark:text-white/70">Progress</span>
                      <span className="text-white dark:text-white">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <motion.div
                        className={`bg-gradient-to-r ${course.color} h-2 rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleContinueCourse(course.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Continue
                    </button>
                    <button 
                      onClick={() => handleCourseDetails(course.id)}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Details
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
