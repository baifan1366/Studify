"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/utils/supabase/client';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import HeroSection from '@/components/hero-section';
import AIAssistantPreview from '@/components/ai-assistant-preview';
import LearningPath from '@/components/learning-path';
import CommunityHighlights from '@/components/community-highlights';
import LearningReport from '@/components/learning-report';
import GamificationSection from '@/components/gamification-section';
import { useToast } from '@/hooks/use-toast';

export default function HomeContent() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeMenuItem, setActiveMenuItem] = useState('home');
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

  const handleStartLearning = () => {
    toast({
      title: "Starting Learning Journey",
      description: "Redirecting to your personalized learning path...",
    });
  };

  const handleExploreCourses = () => {
    toast({
      title: "Exploring Courses",
      description: "Opening course catalog...",
    });
  };

  const handleExperienceAI = () => {
    toast({
      title: "AI Tutoring",
      description: "Launching AI assistant...",
    });
  };

  const handleGenerateStudyPlan = () => {
    toast({
      title: "Study Plan",
      description: "Generating personalized study plan...",
    });
  };

  const handleCreatePost = () => {
    toast({
      title: "Create Post",
      description: "Opening post editor...",
    });
  };

  const handleJoinGroup = () => {
    toast({
      title: "Join Group",
      description: "Joining study group...",
    });
  };

  const handleViewProgress = () => {
    toast({
      title: "Progress Report",
      description: "Opening detailed progress analytics...",
    });
  };

  const handleDailyCheckin = () => {
    toast({
      title: "Daily Check-in",
      description: "Streak updated! Keep up the great work!",
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      {/* Header */}
      <ClassroomHeader
        title="Home"
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
        {/* Hero Section */}
        <HeroSection
          onStartLearning={handleStartLearning}
          onExploreCourses={handleExploreCourses}
        />

        {/* AI Learning Assistant Preview */}
        <AIAssistantPreview
          onExperienceAI={handleExperienceAI}
        />

        {/* Learning Path Planning */}
        <LearningPath
          onGenerateStudyPlan={handleGenerateStudyPlan}
        />

        {/* Community Highlights */}
        <CommunityHighlights
          onCreatePost={handleCreatePost}
          onJoinGroup={handleJoinGroup}
        />

        {/* Learning Report */}
        <LearningReport
          onViewProgress={handleViewProgress}
        />

        {/* Gamification Section */}
        <GamificationSection
          onDailyCheckin={handleDailyCheckin}
        />
      </motion.div>
    </div>
  );
}
