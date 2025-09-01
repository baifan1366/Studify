'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { BookOpen, Clock, Users, Star, ShoppingCart, Zap } from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';
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
<<<<<<< HEAD
  const [sidebarWidth, setSidebarWidth] = useState(80); // Add sidebar width state
  
  // const { data: courses, isLoading, error } = useCourses();
  const isLoading = false; // Temporary for demo
=======

  const { data: courses, isLoading } = useCourses();
>>>>>>> ca86d4afaa9fefb7d0bac3d9efc1cac1c0eb2e8e
  const { toast } = useToast();

  const uiCourses = useMemo(() => {
    return (courses ?? []).map((c, idx) => ({
      id: c.public_id,
      title: c.title,
      instructor: `Owner #${c.owner_id}`,
      duration: c.total_duration_minutes
        ? `${c.total_duration_minutes} mins`
        : '—',
      students: c.total_students ?? 0,
      rating: c.average_rating ?? 0,
      price: c.price_cents ? `$${(c.price_cents / 100).toFixed(2)}` : 'Free',
      points: Math.floor(Math.random() * 500) + 100, // Placeholder for points
      thumbnailUrl: c.thumbnail_url,
      level: c.level,
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setUser({
          id: '1',
          email: 'student@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          confirmation_sent_at: new Date().toISOString(),
        });
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
    setSidebarWidth(newExpanded ? 280 : 80); // Update sidebar width for synchronization
  };

  const handleAddToCart = (courseId: string | number) => {
    toast({
      title: 'Added to Cart',
      description: `Course ${courseId} has been added to your cart.`,
    });
  };

  const handleBuyNow = (courseId: string | number) => {
    toast({
      title: 'Processing Purchase',
      description: `Proceeding to checkout for course ${courseId}...`,
    });
  };

  return (
<<<<<<< HEAD
    <AnimatedBackground sidebarWidth={sidebarWidth}>
      {/* Header */}
=======
    <AnimatedBackground>
>>>>>>> ca86d4afaa9fefb7d0bac3d9efc1cac1c0eb2e8e
      <ClassroomHeader
        title="Courses"
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
          marginLeft: `${sidebarWidth}px`, // Use shared state for synchronization
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
<<<<<<< HEAD
          width: `calc(100vw - ${sidebarWidth}px)`
=======
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`,
>>>>>>> ca86d4afaa9fefb7d0bac3d9efc1cac1c0eb2e8e
        }}
      >
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              Explore Courses
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              Find your next learning adventure from our curated collection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading
              ? [...Array(8)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                  >
                    <Skeleton className="w-full h-32 rounded-lg mb-4" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="flex justify-between items-center mb-4">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 flex-1" />
                    </div>
                  </div>
                ))
              : uiCourses.map((course, index) => (
                  <motion.div
                    key={String(course.id)}
                    className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 flex flex-col h-full hover:bg-white/10 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="relative">
                      <div
                        className={`w-full h-36 bg-gradient-to-r ${course.color} flex items-center justify-center`}
                      >
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen size={48} className="text-white/80" />
                        )}
                      </div>
                      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-md text-xs font-bold">
                        {course.level?.toUpperCase() || 'ALL LEVELS'}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-white font-bold text-lg mb-2 truncate">
                        {course.title}
                      </h3>
                      <p className="text-white/60 text-sm mb-3">
                        {course.instructor}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-white/80 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={14} />
                          <span>{course.students}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-yellow-400 font-bold text-sm">
                          {course.rating.toFixed(1)}
                        </span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < Math.round(course.rating)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-white/30'
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-xl font-bold text-white">
                            {course.price}
                          </p>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Zap size={16} />
                            <span className="font-semibold">
                              {course.points} pts
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddToCart(course.id)}
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <ShoppingCart size={16} />
                            <span>Add to Cart</span>
                          </button>
                          <button
                            onClick={() => handleBuyNow(course.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatedBackground>
  );
}