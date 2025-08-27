"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createSupabaseClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import RecommendationPanels from '@/components/recommendation-panels';
import { useToast } from '@/hooks/use-toast';

export default function ClassroomContent() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeMenuItem, setActiveMenuItem] = useState('classroom');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  
  const { toast } = useToast();

  // Fetch user authentication data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Error fetching user:', error);
        } else {
          setUser(user);
        }
      } catch (error) {
        console.error('Error in fetchUser:', error);
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
    const supabase = createSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  // Mouse position tracking
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
    console.log('Menu item clicked:', itemId);
  };

  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  const handleMenuToggle = () => {
    setIsPermanentlyExpanded(!isPermanentlyExpanded);
    setSidebarExpanded(!isPermanentlyExpanded);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      {/* Header */}
      <ClassroomHeader
        title="Classroom"
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

      {/* Animated Orange Gradient Sphere - Behind frosted glass */}
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #f78b4a 0%, #d9653a 70%, transparent 100%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: mousePosition.x - 192, // Half of sphere width (384px / 2)
          y: mousePosition.y - 192, // Half of sphere height
        }}
        transition={{
          type: "spring",
          stiffness: 50,
          damping: 20,
          mass: 0.8
        }}
      />

      {/* Additional smaller sphere for more depth */}
      <motion.div
        className="absolute w-64 h-64 rounded-full opacity-40 blur-2xl"
        style={{
          background: 'radial-gradient(circle, #f78b4a 0%, #d9653a 50%, transparent 100%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: mousePosition.x - 128 + 50, // Offset slightly for layered effect
          y: mousePosition.y - 128 + 50,
        }}
        transition={{
          type: "spring",
          stiffness: 60,
          damping: 25,
          mass: 0.6
        }}
      />

      {/* Frosted Glass Overlay */}
      <div
        className="absolute inset-0 backdrop-blur-md border border-white/20"
        style={{
          backgroundColor: '#1d2939',
          opacity: 0.85,
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      />

      {/* Main Content Area - Recommendation Panels */}
      <motion.div
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`
        }}
      >
        {/* Welcome Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white/90 mb-2 dark:text-white/90">
            {isLoading ? 'Loading...' : `Welcome to your Classroom, ${user?.email?.split('@')[0] || 'Student'}!`}
          </h1>
          <p className="text-lg text-white/70 dark:text-white/70">
            Explore courses, track progress, and enhance your learning experience
          </p>
        </motion.div>

        {/* Recommendation Panels */}
        <RecommendationPanels user={user} isLoading={isLoading} />
      </motion.div>
    </div>
  );
}
