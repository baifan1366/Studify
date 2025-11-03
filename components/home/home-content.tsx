"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import HeroSection from "@/components/home/hero-section";
import ShowHeroButton from "@/components/home/show-hero-button";
import AIAssistantPreview from "@/components/ai-assistant-preview";
import LearningPath from "@/components/learning-path";
import CommunityHighlights from "@/components/community-highlights";
import LearningReport from "@/components/learning-report";
import GamificationSection from "@/components/gamification-section";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useUser } from "@/hooks/profile/use-user";

export default function HomeContent() {
  const t = useTranslations("HomeContent");
  const { toast } = useToast();
  const router = useRouter();
  const locale = useLocale();

  // Use the useUser hook to get user authentication data
  const { data: user, isLoading, isError, error } = useUser();

  const handleHeaderAction = (action: string) => {
    console.log("Header action:", action);
  };

  const handleStartLearning = () => {
    // Navigate to dashboard where users can start their learning journey
    router.push(`/${locale}/dashboard`);
  };

  const handleExploreCourses = () => {
    // Navigate to courses page to explore available courses
    router.push(`/${locale}/courses`);
  };

  const handleExperienceAI = () => {
    // Navigate to tutoring page for AI assistance
    router.push(`/${locale}/tutoring`);
  };

  const handleGenerateStudyPlan = () => {
    // Navigate to dashboard where learning paths are managed
    router.push(`/${locale}/dashboard`);
  };

  const handleCreatePost = () => {
    // Navigate to community page to create posts
    router.push(`/${locale}/community`);
  };

  const handleJoinGroup = () => {
    // Navigate to community page to join groups
    router.push(`/${locale}/community`);
  };

  const handleViewProgress = () => {
    // Navigate to dashboard to view learning progress and reports
    router.push(`/${locale}/dashboard`);
  };

  const handleDailyCheckin = () => {
    // Check-in is now handled by the GamificationSection component with modal
    // No navigation needed - modal will show rewards and streak
  };

  return (
    <>
      {/* Main Content */}
      <div>
        {/* Show Hero Button (only visible when hero is hidden) */}
        <ShowHeroButton />

        {/* Hero Section */}
        <HeroSection
          onStartLearning={handleStartLearning}
          onExploreCourses={handleExploreCourses}
        />

        {/* AI Learning Assistant Preview */}
        <AIAssistantPreview onExperienceAI={handleExperienceAI} />

        {/* Community Highlights */}
        <CommunityHighlights
          onCreatePost={handleCreatePost}
          onJoinGroup={handleJoinGroup}
        />

        {/* Gamification Section */}
        <GamificationSection onDailyCheckin={handleDailyCheckin} />

        {/* Learning Path Planning */}
        <LearningPath onGenerateStudyPlan={handleGenerateStudyPlan} />

        {/* Learning Report */}
        <LearningReport onViewProgress={handleViewProgress} />
      </div>
    </>
  );
}
