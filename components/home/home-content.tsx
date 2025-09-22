"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';
 
import HeroSection from '@/components/home/hero-section';
import AIAssistantPreview from '@/components/ai-assistant-preview';
import LearningPath from '@/components/learning-path';
import CommunityHighlights from '@/components/community-highlights';
import LearningReport from '@/components/learning-report';
import GamificationSection from '@/components/gamification-section';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export default function HomeContent() {
  const t = useTranslations('HomeContent');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();

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
        console.error('Error in fetchUser:', error);
        toast({
          title: t('error_title'),
          description: t('error_fetch_user'),
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



  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  const handleStartLearning = () => {
    toast({
      title: t('start_learning_title'),
      description: t('start_learning_desc'),
    });
  };

  const handleExploreCourses = () => {
    toast({
      title: t('explore_courses_title'),
      description: t('explore_courses_desc'),
    });
  };

  const handleExperienceAI = () => {
    toast({
      title: t('ai_tutoring_title'),
      description: t('ai_tutoring_desc'),
    });
  };

  const handleGenerateStudyPlan = () => {
    toast({
      title: t('study_plan_title'),
      description: t('study_plan_desc'),
    });
  };

  const handleCreatePost = () => {
    toast({
      title: t('create_post_title'),
      description: t('create_post_desc'),
    });
  };

  const handleJoinGroup = () => {
    toast({
      title: t('join_group_title'),
      description: t('join_group_desc'),
    });
  };

  const handleViewProgress = () => {
    toast({
      title: t('progress_report_title'),
      description: t('progress_report_desc'),
    });
  };

  const handleDailyCheckin = () => {
    toast({
      title: t('daily_checkin_title'),
      description: t('daily_checkin_desc'),
    });
  };

  return (
    <>
      {/* Main Content */}
      <div>
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
      </div>
    </>
  );
}
