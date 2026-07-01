"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import HeroSection from "@/components/home/hero-section";
import ShowHeroButton from "@/components/home/show-hero-button";
import AIAssistantPreview from "@/components/ai-assistant-preview";
import LearningPath from "@/components/learning-path";
import CommunityHighlights from "@/components/community-highlights";
import LearningReport from "@/components/learning-report";
import GamificationSection from "@/components/gamification-section";
import { useUser } from "@/hooks/profile/use-user";
import { useLearningStats } from "@/hooks/profile/use-learning-stats";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  BookOpen,
  Star,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function HomeContent() {
  const t = useTranslations("HomeContent");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [aiDraft, setAiDraft] = useState("");
  const openQuickQna = searchParams.get("ai") === "quick_qa";

  useEffect(() => {
    if (!openQuickQna) return;

    setAiDraft(sessionStorage.getItem("studify:ai-quick-qna-draft") || "");
    sessionStorage.removeItem("studify:ai-quick-qna-draft");
    requestAnimationFrame(() => {
      document.getElementById("ai-assistant")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [openQuickQna]);

  const { data: user, isLoading } = useUser();
  const { data: learningStats, isLoading: statsLoading } = useLearningStats("week");

  const profile = user?.profile;
  const displayName =
    profile?.display_name || user?.email?.split("@")[0] || "Learner";

  const quickStats = {
    streak: learningStats?.summary?.studyStreak ?? 0,
    points: profile?.points ?? learningStats?.summary?.currentPoints ?? 0,
    courses: learningStats?.summary?.completedCourses ?? 0,
    studyHours: learningStats?.summary?.totalStudyHours ?? 0,
  };

  const handleStartLearning = () => router.push(`/${locale}/dashboard`);
  const handleExploreCourses = () => router.push(`/${locale}/courses`);
  const handleExperienceAI = () => router.push(`/${locale}/tutoring`);
  const handleGenerateStudyPlan = () => router.push(`/${locale}/dashboard`);
  const handleCreatePost = () => router.push(`/${locale}/community`);
  const handleJoinGroup = () => router.push(`/${locale}/community`);
  const handleViewProgress = () => router.push(`/${locale}/dashboard`);
  const handleDailyCheckin = () => {};

  if (isLoading) {
    return (
      <div className="space-y-8 px-4 sm:px-0">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const quickStatItems = [
    {
      icon: Flame,
      label: "Study Streak",
      value: quickStats.streak,
      suffix: "",
      color: "#FF6B00",
      glow: "rgba(255,107,0,0.25)",
      bg: "from-orange-500/15 to-red-500/10",
    },
    {
      icon: Star,
      label: "Total Points",
      value: quickStats.points.toLocaleString(),
      suffix: "",
      color: "#F59E0B",
      glow: "rgba(245,158,11,0.2)",
      bg: "from-yellow-500/15 to-orange-500/10",
    },
    {
      icon: BookOpen,
      label: "Completed",
      value: quickStats.courses,
      suffix: " courses",
      color: "#10B981",
      glow: "rgba(16,185,129,0.2)",
      bg: "from-emerald-500/15 to-teal-500/10",
    },
    {
      icon: Clock,
      label: "Study Time",
      value: quickStats.studyHours,
      suffix: "h",
      color: "#8B5CF6",
      glow: "rgba(139,92,246,0.2)",
      bg: "from-violet-500/15 to-purple-500/10",
    },
  ];

  return (
    <>
      <div className="space-y-8 px-4 sm:px-6 lg:px-0">
        {/* Show Hero Button */}
        <ShowHeroButton />

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-orange-500/20 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,107,0,0.12) 0%, rgba(16,185,129,0.08) 50%, rgba(13,31,26,0.6) 100%)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Subtle glow */}
          <div
            className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,107,0,0.2) 0%, transparent 70%)" }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-orange-400" />
              <span className="text-xs font-medium text-orange-400/80 uppercase tracking-wider">
                Welcome back
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Hey, <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #FF6B00, #FF9A3C)" }}
              >{displayName}</span> 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {quickStats.streak > 0
                ? `You're on a ${quickStats.streak}-day streak — keep it up!`
                : "Start learning today to build your streak!"}
            </p>
          </div>
          <motion.button
            onClick={handleStartLearning}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex-shrink-0 shadow-md"
            style={{ background: "linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)" }}
          >
            <TrendingUp size={16} />
            Go to Dashboard
            <ArrowRight size={14} className="ml-1" />
          </motion.button>
        </motion.div>

        {/* Quick Stats Bar */}
        {!statsLoading && (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {quickStatItems.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${stat.bg} p-4 cursor-default`}
                style={{ backdropFilter: "blur(8px)" }}
              >
                <div
                  className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-60 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${stat.glow} 0%, transparent 70%)` }}
                />
                <div className="relative z-10">
                  <stat.icon size={20} style={{ color: stat.color }} className="mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}<span className="text-base font-medium text-muted-foreground">{stat.suffix}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Hero Section */}
        <HeroSection
          onStartLearning={handleStartLearning}
          onExploreCourses={handleExploreCourses}
        />

        {/* AI Learning Assistant Preview */}
        <div id="ai-assistant" className="scroll-mt-6">
          <AIAssistantPreview
            onExperienceAI={handleExperienceAI}
            initialFeature={openQuickQna ? "quick_qa" : null}
            initialQuestion={aiDraft}
          />
        </div>

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
