'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { BookOpen, Clock, Users, Star } from 'lucide-react';
import { useMyCourses } from '@/hooks/course/use-courses';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function MyCoursesContent() {
  const [user, setUser] = useState<User | null>(null);
  
  const { data: courses, isLoading } = useMyCourses();
  const { toast } = useToast();
  
  // derive courses for UI with defaults
  const uiCourses = useMemo(() => {
    return (courses ?? []).map((c, idx) => ({
      id: c.public_id,
      title: c.title,
      instructor: `Owner #${c.owner_id}`,
      duration: c.total_duration_minutes ? `${c.total_duration_minutes} mins` : '—',
      students: c.total_students ?? 0,
      rating: c.average_rating ?? 0,
      progress: (c as any).progress ?? 0, // Now comes from the API
      color: [
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-green-500 to-teal-500',
        'from-orange-500 to-red-500',
        'from-indigo-500 to-purple-500',
        'from-cyan-500 to-blue-500',
      ][idx % 6],
    }));
  }, [courses]);

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

  const handleContinueCourse = (courseId: string | number) => {
    toast({
      title: "Continue Course",
      description: `Continuing course ${courseId}...`,
    });
  };

  const handleCourseDetails = (courseId: string | number) => {
    toast({
      title: "Course Details",
      description: `Opening details for course ${courseId}...`,
    });
  };

  return (
    <>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              My Learning
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              Your personal space to continue your learning journey.
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
              uiCourses.map((course, index) => (
                <motion.div
                  key={String(course.id)}
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
    </>
  );
}