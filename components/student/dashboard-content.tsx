"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Award,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  Target,
  Star,
  PlayCircle,
  MessageSquare,
  Zap,
  Trophy,
  Route,
  Maximize2,
  X,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useUser } from "@/hooks/profile/use-user";
import {
  useDashboard,
  RecentCourse,
  UpcomingEvent,
} from "@/hooks/dashboard/use-dashboard";
import {
  useLearningStats,
  useAchievements,
  formatStudyTime,
} from "@/hooks/profile/use-learning-stats";
import { useUserPreferences } from "@/hooks/profile/use-user-preferences";
import { useDashboardTrends } from "@/hooks/dashboard/use-dashboard-trends";
import { useLearningPaths } from "@/hooks/dashboard/use-learning-paths";
import {
  useContinueWatching,
  useContinueWatchingActions,
} from "@/hooks/learning/use-learning-progress";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Mermaid from "@/components/ui/mermaid";
import { ReactFlowMindMap } from "@/components/ai/react-flow-mind-map";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UniversalSearch from "@/components/search/universal-search";
import DailyCoachCard from "@/components/ai-coach/daily-coach-card";
import EveningReflectionModal from "@/components/ai-coach/evening-reflection-modal";
import { VideoLearningArtifacts } from "@/components/video/video-learning-artifacts";
import { cn } from "@/lib/utils";

/* ─── tiny helpers ─────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay },
});

const GlassCard = ({
  children,
  className = "",
  gradient = "from-white/5 to-white/[0.02]",
  glowColor = "",
  allowOverflow = false,
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  glowColor?: string;
  allowOverflow?: boolean;
}) => (
  <div
    className={cn(
      "relative rounded-2xl border border-white/10 bg-gradient-to-br backdrop-blur-sm p-6",
      allowOverflow ? "overflow-visible" : "overflow-hidden",
      gradient,
      className
    )}
  >
    {glowColor && (
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />
    )}
    <div className="relative z-10">{children}</div>
  </div>
);

/* ─── Stat card definitions ────────────────────────────── */
const STAT_CONFIG = [
  {
    key: "coursesEnrolled",
    icon: BookOpen,
    label: "courses_enrolled",
    color: "#3B82F6",
    glow: "rgba(59,130,246,0.3)",
    gradient: "from-blue-500/15 to-blue-500/5",
  },
  {
    key: "coursesCompleted",
    icon: Award,
    label: "completed",
    color: "#10B981",
    glow: "rgba(16,185,129,0.3)",
    gradient: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    key: "totalStudyTime",
    icon: Clock,
    label: "study_hours",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,0.3)",
    gradient: "from-violet-500/15 to-violet-500/5",
    suffix: "h",
  },
  {
    key: "currentStreak",
    icon: Flame,
    label: "current_streak",
    color: "#FF6B00",
    glow: "rgba(255,107,0,0.35)",
    gradient: "from-orange-500/15 to-orange-500/5",
    suffix: "d",
  },
  {
    key: "points",
    icon: Star,
    label: "points",
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.3)",
    gradient: "from-yellow-500/15 to-yellow-500/5",
  },
] as const;

export default function DashboardContent() {
  const t = useTranslations("Dashboard");
  const { data: userData, isLoading: userLoading } = useUser();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();
  const { data: learningStats, isLoading: statsLoading } = useLearningStats("week");
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements();
  const { data: learningPaths, isLoading: learningPathsLoading } = useLearningPaths({ limit: 3, activeOnly: true });
  const { data: continueWatchingItems, isLoading: continueWatchingLoading } = useContinueWatching();
  const { generateContinueWatchingUrl, formatProgress, formatTimeRemaining, formatLastAccessed } = useContinueWatchingActions();
  const { data: userPreferences, isLoading: preferencesLoading } = useUserPreferences();
  const { data: trendsData, isLoading: trendsLoading } = useDashboardTrends();

  // Modal states
  const [showReflectionModal, setShowReflectionModal] = React.useState(false);
  const [selectedLearningPath, setSelectedLearningPath] = React.useState<any>(null);
  const [showLearningPathModal, setShowLearningPathModal] = React.useState(false);

  const user = userData;
  const profile = user?.profile;

  if (userLoading || dashboardLoading || statsLoading || preferencesLoading || trendsLoading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ─── computed stats ────────────────────────────────── */
  const learningData = learningStats?.summary;
  const dashStats = dashboardData?.stats;

  const stats = {
    coursesEnrolled: dashStats?.coursesEnrolled ?? 0,
    coursesCompleted: learningData?.completedCourses ?? dashStats?.coursesCompleted ?? 0,
    totalStudyTime: learningData?.totalStudyHours ?? dashStats?.totalStudyTime ?? 0,
    currentStreak: learningData?.studyStreak ?? dashStats?.currentStreak ?? 0,
    points: profile?.points ?? learningData?.currentPoints ?? dashStats?.points ?? 0,
    lessonsCompleted: learningData?.completedLessons ?? 0,
    avgProgress: learningData?.avgProgress ?? 0,
    pointsEarned: learningData?.pointsEarned ?? 0,
    achievements: learningData?.unlockedAchievements ?? 0,
  } as Record<string, any>;

  const recentAchievements = achievementsData?.stats?.recentUnlocks || [];
  const dailyStats = learningStats?.charts?.dailyStudyTime || [];
  const recentCourses = dashboardData?.recentCourses || [];
  const upcomingEvents = dashboardData?.upcomingEvents || [];

  if (process.env.NODE_ENV === "development") {
    console.log("📊 Dashboard Stats Debug:", { dashStats, learningData, profilePoints: profile?.points, computedStats: stats });
  }

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Student";

  /* ─── greet ─────────────────────────────────────────── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  /* ─── trend helper ───────────────────────────────────── */
  const getTrendStr = (key: string) => {
    switch (key) {
      case "coursesCompleted": return trendsData?.courseCompletion?.trend || t("no_change_week");
      case "totalStudyTime": return trendsData?.studyTime?.trend || t("same_last_week");
      case "currentStreak": return trendsData?.streak?.trend || (stats.currentStreak > 0 ? t("keep_going") : t("start_today"));
      case "points": return trendsData?.points?.trend || t("no_points_earned");
      default: return null;
    }
  };

  /* ─── weekly chart helper ───────────────────────────── */
  const maxMinutes = Math.max(...(dailyStats.slice(-7).map((d: any) => d.minutes || 0)), 1);

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-32">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─── Header ──────────────────────────────────── */}
        <motion.div {...fadeUp(0)}>
          <div
            className="relative overflow-hidden rounded-2xl border border-orange-500/20 px-6 py-6 sm:px-8 sm:py-7"
            style={{
              background: "linear-gradient(135deg, rgba(255,107,0,0.10) 0%, rgba(16,185,129,0.06) 60%, rgba(13,31,26,0.5) 100%)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* glow orbs */}
            <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(255,107,0,0.4) 0%, transparent 70%)" }} />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)" }} />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-orange-400" />
                  <span className="text-xs font-medium text-orange-400/80 uppercase tracking-wider">
                    {greeting}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  {profile?.display_name || user?.email?.split("@")[0]
                    ? t("welcome_back", { name: displayName })
                    : t("welcome_back_default")}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">{t("learning_journey")}</p>
              </div>

              {/* Quick badges */}
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                {stats.currentStreak > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold">
                    <Flame size={12} />
                    {stats.currentStreak}-day streak 🔥
                  </div>
                )}
                {stats.points > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs font-semibold">
                    <Star size={12} />
                    {stats.points.toLocaleString()} pts
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Search ──────────────────────────────────── */}
        <motion.div {...fadeUp(0.1)} className="relative z-50">
          <GlassCard
            gradient="from-white/5 to-white/[0.02]"
            glowColor="rgba(59,130,246,0.15)"
            allowOverflow
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/20">
                <Search className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("search_title")}</h2>
                <p className="text-xs text-muted-foreground">{t("search_description")}</p>
              </div>
            </div>
            <UniversalSearch placeholder={t("search_placeholder")} className="w-full" />
          </GlassCard>
        </motion.div>

        <motion.div {...fadeUp(0.15)}>
          <GlassCard gradient="from-violet-500/10 via-purple-500/5 to-white/[0.02]" glowColor="rgba(139,92,246,0.2)">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/15 p-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Study library</h2>
                <p className="text-xs text-muted-foreground">All your notes, mind maps, and personal practice quizzes in one place.</p>
              </div>
            </div>
            <VideoLearningArtifacts library />
          </GlassCard>
        </motion.div>

        {/* ─── Stats Cards ─────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          {...fadeUp(0.2)}
        >
          {STAT_CONFIG.map((cfg, i) => {
            const rawVal = stats[cfg.key];
            const displayVal = cfg.key === "currentStreak"
              ? `${rawVal}`
              : cfg.key === "points"
              ? rawVal.toLocaleString()
              : rawVal;
            const trendStr = getTrendStr(cfg.key);

            return (
              <motion.div
                key={cfg.key}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${cfg.gradient} p-5 cursor-default`}
                style={{ backdropFilter: "blur(8px)" }}
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.45 }}
                whileHover={{ scale: 1.03, y: -3, transition: { duration: 0.2 } }}
              >
                <div
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-50 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)` }}
                />
                <div className="relative z-10">
                  <cfg.icon size={22} style={{ color: cfg.color }} className="mb-3" />
                  <p className="text-2xl font-bold text-foreground leading-none">
                    {displayVal}
                    {"suffix" in cfg && <span className="text-sm font-medium text-muted-foreground ml-0.5">{cfg.suffix}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t(cfg.label as any)}</p>
                  {trendStr && (
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: cfg.color }}>
                      <TrendingUp size={10} />
                      {trendStr}
                    </p>
                  )}
                  {cfg.key === "totalStudyTime" && stats.avgProgress > 0 && (
                    <div className="mt-3">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${stats.avgProgress}%`, background: cfg.color }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{stats.avgProgress}% {t("avg_progress")}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ─── Continue Learning ────────────────────────── */}
        <motion.div {...fadeUp(0.35)}>
          <GlassCard
            gradient="from-orange-500/10 via-red-500/5 to-purple-500/5"
            glowColor="rgba(255,107,0,0.2)"
          >
            <h3 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/15 border border-orange-500/20">
                <PlayCircle size={16} className="text-orange-400" />
              </div>
              {continueWatchingItems && continueWatchingItems.length > 0
                ? t("continue_watching")
                : t("continue_learning")}
            </h3>

            <div className="space-y-3">
              {continueWatchingItems && continueWatchingItems.length > 0
                ? continueWatchingItems.slice(0, 3).map((item) => (
                    <Link
                      key={`${item.course_slug}-${item.lesson_public_id}`}
                      href={generateContinueWatchingUrl(item)}
                      className="block group"
                    >
                      <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-orange-500/30 transition-all duration-250 cursor-pointer">
                        {/* Thumbnail */}
                        <div className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          {item.course_thumbnail ? (
                            <img src={item.course_thumbnail} alt={item.course_title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B00, #FF3D00)" }}>
                              <PlayCircle size={18} className="text-white/70" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle size={16} className="text-white" />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate text-sm">{item.lesson_title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{item.course_title}</p>
                          <p className="text-xs text-orange-400/70 mt-0.5">{item.module_title}</p>
                          {/* Progress bar */}
                          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${item.progress_pct}%`, background: "linear-gradient(90deg, #FF6B00, #FF9A3C)" }}
                            />
                          </div>
                        </div>

                        {/* Progress text */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-foreground">{formatProgress(item.progress_pct)}</p>
                          <p className="text-xs text-muted-foreground">{formatTimeRemaining(item.progress_pct, item.video_duration_sec)}</p>
                          <p className="text-xs text-muted-foreground/60">{formatLastAccessed(item.last_accessed_at)}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                : recentCourses.map((course: RecentCourse) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="w-16 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-slate-700 to-slate-800">
                        <BookOpen size={18} className="text-white/50" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">{course.title}</h4>
                        <p className="text-xs text-muted-foreground">{t("last_accessed")} {course.lastAccessed}</p>
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${course.progress}%`, background: "linear-gradient(90deg, #10B981, #059669)" }}
                          />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{course.progress}%</p>
                    </div>
                  ))}

              {!continueWatchingLoading &&
                (!continueWatchingItems || continueWatchingItems.length === 0) &&
                recentCourses.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <PlayCircle size={24} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-sm">{t("no_courses_progress")}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{t("start_course_hint")}</p>
                  </div>
                )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Cards Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <motion.div className="space-y-6" {...fadeUp(0.45)}>
            {/* Daily AI Coach */}
            <DailyCoachCard onReflectionClick={() => setShowReflectionModal(true)} />

            {/* My Learning Paths */}
            {learningPaths && learningPaths.length > 0 && (
              <GlassCard gradient="from-indigo-500/12 via-purple-500/8 to-pink-500/5" glowColor="rgba(99,102,241,0.25)">
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
                    <Route size={14} className="text-indigo-400" />
                  </div>
                  {t("my_learning_paths")}
                </h3>

                <div className="space-y-3">
                  {learningPaths.slice(0, 2).map((path) => (
                    <div
                      key={path.id}
                      className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-200 cursor-pointer group"
                      onClick={() => { setSelectedLearningPath(path); setShowLearningPathModal(true); }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                          <Target size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-foreground text-sm truncate">{path.title}</h4>
                            <Maximize2 size={12} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0 ml-2" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{path.description}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="text-[10px] px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border-indigo-500/25">{path.learning_goal}</Badge>
                            <Badge className="text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-300 border-purple-500/25">{path.current_level}</Badge>
                            <Badge className="text-[10px] px-2 py-0.5 bg-pink-500/15 text-pink-300 border-pink-500/25">
                              <Clock className="h-2.5 w-2.5 mr-1" />{path.time_constraint}
                            </Badge>
                          </div>
                          {(path.mind_map?.nodes?.length || path.mermaid_diagram) && (
                            <div className="mt-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <p className="text-[10px] text-muted-foreground/60 mb-1">{t("learning_path_preview")}</p>
                              <div className="max-h-28 overflow-hidden relative">
                                {path.mind_map?.nodes?.length ? (
                                  <ReactFlowMindMap graph={path.mind_map as any} className="h-28" />
                                ) : (
                                  <Mermaid chart={path.mermaid_diagram} className="w-full scale-75 origin-top-left" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
                              </div>
                              <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                                <Maximize2 size={10} />{t("click_to_view_full_path")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {learningPaths.length > 2 && (
                    <button className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1">
                      {t("view_all_learning_paths", { count: learningPaths.length })}
                    </button>
                  )}
                </div>
              </GlassCard>
            )}

          </motion.div>

          {/* Right Column */}
          <motion.div className="space-y-6" {...fadeUp(0.5)}>
            {/* Upcoming Events */}
            <GlassCard gradient="from-emerald-500/12 via-teal-500/8 to-blue-500/5" glowColor="rgba(16,185,129,0.2)">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                  <Calendar size={14} className="text-emerald-400" />
                </div>
                {t("upcoming")}
              </h3>

              <div className="space-y-2.5">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event: UpcomingEvent) => (
                    <div key={event.id} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                      <h4 className="font-medium text-foreground text-sm">{event.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.date} at {event.time}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Calendar size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground/60">No upcoming events</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Recent Achievements */}
            <GlassCard gradient="from-yellow-500/12 via-orange-500/8 to-red-500/5" glowColor="rgba(245,158,11,0.2)">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/20">
                    <Award size={14} className="text-yellow-400" />
                  </div>
                  {t("recent_achievements")}
                </h3>
                {stats.achievements > 0 && (
                  <Badge className="text-xs bg-yellow-500/15 text-yellow-300 border-yellow-500/25">
                    {stats.achievements} {t("unlocked")}
                  </Badge>
                )}
              </div>

              <div className="space-y-2.5">
                {recentAchievements.length > 0 ? (
                  recentAchievements.slice(0, 3).map((achievement: any, index: number) => (
                    <div key={achievement.id || index} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {achievement.category === "learning" ? "📚" : achievement.category === "consistency" ? "🔥" : "⭐"}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground text-sm">{achievement.name}</h4>
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-yellow-500/15 text-yellow-300 border-yellow-500/25">
                              +{achievement.pointsReward} pts
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Trophy size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground/60">Complete your first lesson to unlock achievements!</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Weekly Progress Chart */}
            <GlassCard gradient="from-green-500/12 via-emerald-500/8 to-teal-500/5" glowColor="rgba(16,185,129,0.2)">
              <h3 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                  <TrendingUp size={14} className="text-emerald-400" />
                </div>
                {t("this_week_progress")}
              </h3>

              {dailyStats.length > 0 ? (
                <div className="space-y-2.5">
                  {dailyStats.slice(-7).map((day: any, index: number) => {
                    const pct = Math.min((day.minutes / maxMinutes) * 100, 100);
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <div className="w-10 text-xs text-muted-foreground/60 text-right flex-shrink-0">
                          {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: pct > 50 ? "linear-gradient(90deg, #10B981, #059669)" : "linear-gradient(90deg, #6EE7B7, #10B981)" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.5 + index * 0.05, duration: 0.6 }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground/70 w-8 text-right flex-shrink-0">{day.hours}h</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TrendingUp size={28} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/60">No study data this week yet</p>
                </div>
              )}

              {/* Weekly goal */}
              <div className="mt-5 p-3 rounded-xl border border-white/5 bg-white/[0.03]">
                <div className="flex justify-between text-xs text-muted-foreground/70 mb-2">
                  <span>Weekly Goal: {userPreferences?.preferences?.weekly_study_goal_hours || 10}h</span>
                  <span className="text-emerald-400 font-medium">
                    {dailyStats.slice(-7).reduce((sum: number, d: any) => sum + d.hours, 0).toFixed(1)}h done
                  </span>
                </div>
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #10B981, #34D399)" }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(
                        (dailyStats.slice(-7).reduce((s: number, d: any) => s + d.hours, 0) /
                          (userPreferences?.preferences?.weekly_study_goal_hours || 10)) * 100,
                        100
                      )}%`,
                    }}
                    transition={{ delay: 0.8, duration: 0.7 }}
                  />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────── */}
      <EveningReflectionModal isOpen={showReflectionModal} onClose={() => setShowReflectionModal(false)} />

      {/* Learning Path Modal */}
      <Dialog open={showLearningPathModal} onOpenChange={setShowLearningPathModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-white/15" style={{ background: "linear-gradient(135deg, rgba(13,31,26,0.98) 0%, rgba(30,27,60,0.98) 100%)", backdropFilter: "blur(20px)" }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
                <Route className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">{selectedLearningPath?.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedLearningPath?.description}</p>
              </div>
            </div>
          </DialogHeader>

          {selectedLearningPath && (
            <div className="space-y-5 mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/25"><Target className="h-3 w-3 mr-1" />{selectedLearningPath.learning_goal}</Badge>
                <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/25"><TrendingUp className="h-3 w-3 mr-1" />{selectedLearningPath.current_level}</Badge>
                <Badge className="bg-pink-500/15 text-pink-300 border-pink-500/25"><Clock className="h-3 w-3 mr-1" />{selectedLearningPath.time_constraint}</Badge>
              </div>

              {(selectedLearningPath.mind_map?.nodes?.length || selectedLearningPath.mermaid_diagram) && (
                <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">{t("complete_learning_path")}</h4>
                  <div className="bg-white/90 rounded-lg p-5 overflow-x-auto">
                    {selectedLearningPath.mind_map?.nodes?.length ? (
                      <ReactFlowMindMap graph={selectedLearningPath.mind_map as any} className="h-[520px]" />
                    ) : (
                      <Mermaid chart={selectedLearningPath.mermaid_diagram} className="w-full min-h-[400px]" />
                    )}
                  </div>
                </div>
              )}

              {selectedLearningPath.ai_insights && (
                <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/20">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">AI Insights</h4>
                  <p className="text-sm text-foreground/80">{selectedLearningPath.ai_insights}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Link href={`/student/learning-paths/${selectedLearningPath?.id || selectedLearningPath?.public_id}`} className="flex-1">
                  <Button className="w-full text-white" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }} onClick={() => setShowLearningPathModal(false)}>
                    <PlayCircle className="w-4 h-4 mr-2" />{t("start_learning_path")}
                  </Button>
                </Link>
                <Button variant="outline" className="bg-white/5 border-white/15 text-foreground hover:bg-white/10" onClick={() => setShowLearningPathModal(false)}>
                  <X className="w-4 h-4 mr-2" />{t("close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
