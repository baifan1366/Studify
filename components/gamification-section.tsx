"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Star,
  Calendar,
  Flame,
  Award,
  Crown,
  CheckCircle,
  Gift,
  Zap,
  Target,
  Users,
  BookOpen,
  TrendingUp,
  Eye,
  ChevronRight,
  Lock,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useLearningStats,
  useAchievements,
  Achievement,
} from "@/hooks/profile/use-learning-stats";
import {
  useWeeklyLeaderboard,
  getRankColorClass,
} from "@/hooks/profile/use-leaderboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiSend } from "@/lib/api-config";

interface GamificationSectionProps {
  onDailyCheckin?: () => void;
}

interface CheckinResponse {
  success: boolean;
  data: {
    pointsEarned: number;
    currentStreak: number;
    isNewRecord: boolean;
    message: string;
    alreadyCheckedIn?: boolean;
    weeklyCheckins?: boolean[];
  };
}

export default function GamificationSection({
  onDailyCheckin,
}: GamificationSectionProps) {
  const t = useTranslations("GamificationSection");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinResult, setCheckinResult] = useState<
    CheckinResponse["data"] | null
  >(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 获取真实数据
  const { data: learningStatsData } = useLearningStats("week");
  const { data: achievementsData, isLoading: achievementsLoading } =
    useAchievements();
  const { data: leaderboardData, isLoading: leaderboardLoading } =
    useWeeklyLeaderboard(5);

  // Check-in mutation
  const checkinMutation = useMutation<CheckinResponse, Error>({
    mutationFn: () =>
      apiSend({
        url: "/api/community/checkin",
        method: "POST",
        body: {},
      }),
    onSuccess: (response) => {
      setCheckinResult(response.data);
      setShowCheckinModal(true);
      // Refresh learning stats to update streak
      queryClient.invalidateQueries({ queryKey: ["learning-stats"] });
      queryClient.invalidateQueries({ queryKey: ["points-data"] });
      onDailyCheckin?.();
    },
    onError: (error: any) => {
      toast({
        title: t("checkin_error_title") || "Check-in Failed",
        description:
          error.message ||
          t("checkin_error_desc") ||
          "Unable to complete check-in",
        variant: "destructive",
      });
    },
  });

  // 解析学习统计数据
  const learningStats = learningStatsData?.data;
  const achievements = achievementsData?.data;
  const leaderboard = leaderboardData?.data?.users || [];
  
  // 签到状态从checkinResult获取
  const hasCheckedInToday = checkinResult?.alreadyCheckedIn || false;
  const currentStreak = checkinResult?.currentStreak || learningStats?.summary.studyStreak || 0;
  const weeklyCheckins = checkinResult?.weeklyCheckins || Array(7).fill(false);

  // 获取成就图标
  const getAchievementIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      learning: BookOpen,
      consistency: Flame,
      social: Users,
      mastery: Target,
      rewards: Gift,
      general: Star,
    };
    return iconMap[category] || Star;
  };

  // 获取成就颜色
  const getAchievementColor = (category: string, rarity?: string) => {
    if (rarity === "Legendary") return "from-orange-500 to-red-500";
    if (rarity === "Epic") return "from-purple-500 to-blue-500";
    if (rarity === "Rare") return "from-blue-500 to-cyan-500";

    const colorMap: Record<string, string> = {
      learning: "from-yellow-500 to-orange-500",
      consistency: "from-red-500 to-pink-500",
      social: "from-green-500 to-teal-500",
      mastery: "from-purple-500 to-blue-500",
      rewards: "from-pink-500 to-purple-500",
      general: "from-blue-500 to-indigo-500",
    };
    return colorMap[category] || "from-gray-500 to-gray-600";
  };

  // 处理成就显示
  const allAchievements = achievements?.achievements || [];
  const filteredAchievements =
    selectedCategory === "all"
      ? allAchievements
      : allAchievements.filter((a) => a.category === selectedCategory);

  const displayAchievements = showAllAchievements
    ? filteredAchievements
    : filteredAchievements.slice(0, 4);

  // 成就统计
  const achievementStats = {
    total: allAchievements.length,
    unlocked: allAchievements.filter((a) => a.isUnlocked).length,
    inProgress: allAchievements.filter((a) => !a.isUnlocked && a.progress > 0)
      .length,
    categories: achievements?.categories || {},
  };

  // 成就分类选项
  const categoryOptions = [
    { value: "all", label: "All", icon: Award },
    { value: "learning", label: "Learning", icon: BookOpen },
    { value: "consistency", label: "Consistency", icon: Flame },
    { value: "social", label: "Social", icon: Users },
    { value: "mastery", label: "Mastery", icon: Target },
    { value: "rewards", label: "Rewards", icon: Gift },
  ];

  const handleCheckin = () => {
    checkinMutation.mutate();
  };

  const getMotivationalMessage = (streak: number, isNewRecord: boolean) => {
    if (isNewRecord) {
      return (
        t("checkin_new_record", { count: streak }) ||
        `🎉 New record! ${streak} days streak!`
      );
    }
    if (streak === 1) {
      return t("checkin_first_day") || "🌟 Great start! Keep it up!";
    }
    if (streak === 7) {
      return t("checkin_week") || "🔥 One week streak! Amazing!";
    }
    if (streak === 30) {
      return t("checkin_month") || "🏆 30 days! You're unstoppable!";
    }
    if (streak >= 100) {
      return t("checkin_legend") || "👑 Legend status! 100+ days!";
    }
    if (streak >= 50) {
      return t("checkin_master") || "💎 Master level! Keep going!";
    }
    if (streak % 10 === 0) {
      return t("checkin_milestone") || `🎯 ${streak} days milestone!`;
    }
    return t("checkin_keep_going") || `💪 ${streak} days! Keep the momentum!`;
  };

  return (
    <motion.section
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
          <Trophy className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
          <p className="text-white/70">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Check-in */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-white" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              {t("daily_checkin_title")}
            </h3>
            <p className="text-sm text-white/70 mb-4">
              {t("daily_checkin_desc_prefix")}{" "}
              {t("current_streak", {
                count: currentStreak,
              })}
            </p>

            <Button
              onClick={handleCheckin}
              disabled={checkinMutation.isPending || hasCheckedInToday}
              className="group bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {checkinMutation.isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Sparkles size={20} />
                    </motion.div>
                    {t("checking_in") || "Checking in..."}
                  </>
                ) : hasCheckedInToday ? (
                  <>
                    <CheckCircle size={20} />
                    {t("already_checked_in") || "Checked In Today!"}
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    {t("check_in_today_button")}
                  </>
                )}
              </div>
            </Button>

            {/* Streak Visualization */}
            <div className="flex justify-center gap-1 mt-4">
              {weeklyCheckins.map((isChecked, i) => (
                <motion.div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    isChecked ? "bg-orange-500" : "bg-white/20"
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                />
              ))}
            </div>
            <p className="text-xs text-white/50 mt-2">
              {t("this_weeks_progress")}
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={20} className="text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">
              {t("weekly_leaderboard_title")}
            </h3>
          </div>

          <div className="space-y-3">
            {leaderboardLoading ? (
              // 加载状态
              [...Array(5)].map((_, index) => (
                <div
                  key={`loading-leaderboard-${index}`}
                  className="bg-white/5 rounded-lg p-3 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full"></div>
                    <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-white/20 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-white/20 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : leaderboard.length === 0 ? (
              // 无数据状态
              <div className="bg-white/5 rounded-lg p-6 border border-white/10 text-center">
                <Trophy className="mx-auto mb-2 text-white/40" size={24} />
                <p className="text-white/60 text-sm">
                  {t("no_leaderboard_data") ||
                    "No leaderboard data available yet"}
                </p>
              </div>
            ) : (
              // 真实数据
              leaderboard.map((user, index) => (
                <motion.div
                  key={user.publicId || user.userId}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    user.isCurrentUser
                      ? "bg-blue-600/20 border border-blue-400/30"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankColorClass(
                        user.rank
                      )}`}
                    >
                      {user.rank}
                    </span>
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium text-sm ${
                          user.isCurrentUser ? "text-blue-400" : "text-white"
                        }`}
                      >
                        {user.displayName}
                      </span>
                      {user.badge && (
                        <span className="text-sm">{user.badge}</span>
                      )}
                    </div>
                    <span className="text-xs text-white/60">
                      {user.points} {t("points_suffix")}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Enhanced Badge Showcase */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-purple-400" />
              <h3 className="text-lg font-semibold text-white">
                {t("badge_collection_title")}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Trophy size={14} />
              <span>
                {achievementStats.unlocked}/{achievementStats.total}
              </span>
            </div>
          </div>

          {/* Achievement Stats */}
          {!achievementsLoading && achievementStats.total > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-green-400 font-bold text-sm">
                  {achievementStats.unlocked}
                </div>
                <div className="text-xs text-white/60">Earned</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-yellow-400 font-bold text-sm">
                  {achievementStats.inProgress}
                </div>
                <div className="text-xs text-white/60">In Progress</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-blue-400 font-bold text-sm">
                  {achievementStats.total - achievementStats.unlocked}
                </div>
                <div className="text-xs text-white/60">Locked</div>
              </div>
            </div>
          )}

          {/* Category Filter */}
          {!achievementsLoading && showAllAchievements && (
            <div className="flex flex-wrap gap-2 mb-4">
              {categoryOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => setSelectedCategory(option.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedCategory === option.value
                        ? "bg-purple-600 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <IconComponent size={12} />
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            {achievementsLoading ? (
              // 加载状态
              [...Array(4)].map((_, index) => (
                <div
                  key={`loading-achievement-${index}`}
                  className="bg-white/5 rounded-lg p-3 border border-white/10 animate-pulse"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-white/20 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-white/20 rounded w-32 mb-2"></div>
                      <div className="h-2 bg-white/20 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : displayAchievements.length === 0 ? (
              // 无数据状态
              <div className="bg-white/5 rounded-lg p-6 border border-white/10 text-center">
                <Lock className="mx-auto mb-2 text-white/40" size={24} />
                <p className="text-white/60 text-sm">
                  {selectedCategory === "all"
                    ? t("no_achievements") || "No achievements available"
                    : `No ${selectedCategory} achievements yet`}
                </p>
              </div>
            ) : (
              // 真实数据
              displayAchievements.map(
                (achievement: Achievement, index: number) => {
                  const IconComponent = getAchievementIcon(
                    achievement.category
                  );
                  const achievementColor = getAchievementColor(
                    achievement.category
                  );

                  return (
                    <motion.div
                      key={achievement.public_id}
                      className={`p-3 rounded-lg border transition-all duration-300 cursor-pointer ${
                        achievement.isUnlocked
                          ? "bg-white/10 border-white/20 hover:bg-white/15"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg bg-gradient-to-r ${achievementColor} ${
                            !achievement.isUnlocked ? "opacity-50" : ""
                          }`}
                        >
                          <IconComponent size={16} className="text-white" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-medium text-sm ${
                                achievement.isUnlocked
                                  ? "text-white"
                                  : "text-white/60"
                              }`}
                            >
                              {achievement.name}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                achievement.isUnlocked
                                  ? "bg-green-500/20 text-green-300"
                                  : "bg-purple-500/20 text-purple-300"
                              }`}
                            >
                              {achievement.category}
                            </span>
                          </div>

                          <p className="text-xs text-white/60 mb-2">
                            {achievement.description}
                          </p>

                          {!achievement.isUnlocked &&
                            achievement.progress < 100 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-white/50">
                                    {t("progress_label")}
                                  </span>
                                  <span className="text-white/70">
                                    {Math.round(achievement.progress)}%
                                  </span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-1.5">
                                  <motion.div
                                    className={`h-1.5 rounded-full bg-gradient-to-r ${achievementColor}`}
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${achievement.progress}%`,
                                    }}
                                    transition={{
                                      duration: 1,
                                      delay: 0.5 + index * 0.1,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                          {achievement.isUnlocked && (
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <Star size={12} fill="currentColor" />
                              {t("earned_label")} • +{achievement.pointsReward}{" "}
                              {t("points_suffix")}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                }
              )
            )}
          </div>

          {/* View All Button */}
          {!achievementsLoading && allAchievements.length > 4 && (
            <motion.button
              onClick={() => setShowAllAchievements(!showAllAchievements)}
              className="w-full mt-4 p-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 text-white/80 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye size={16} />
              {showAllAchievements
                ? "Show Less"
                : `View All ${allAchievements.length} Achievements`}
              <ChevronRight
                size={16}
                className={`transition-transform ${
                  showAllAchievements ? "rotate-90" : ""
                }`}
              />
            </motion.button>
          )}
        </div>
      </div>

      {/* Daily Check-in Modal */}
      <Dialog open={showCheckinModal} onOpenChange={setShowCheckinModal}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-purple-500/20">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
              <Sparkles className="text-yellow-400" />
              {checkinResult?.alreadyCheckedIn
                ? t("already_checked_in_title") || "Already Checked In!"
                : t("checkin_success_title") || "Check-in Complete!"}
            </DialogTitle>
          </DialogHeader>

          {checkinResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 py-4"
            >
              {/* Streak Display */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 mb-4"
                >
                  <div className="text-center">
                    <Flame className="text-white mx-auto mb-1" size={32} />
                    <div className="text-2xl font-bold text-white">
                      {checkinResult.currentStreak}
                    </div>
                  </div>
                </motion.div>

                <h3 className="text-xl font-semibold text-white mb-2">
                  {getMotivationalMessage(
                    checkinResult.currentStreak,
                    checkinResult.isNewRecord
                  )}
                </h3>

                {!checkinResult.alreadyCheckedIn && (
                  <p className="text-white/70 text-sm">
                    {t("current_streak", {
                      count: checkinResult.currentStreak,
                    })}
                  </p>
                )}
              </div>

              {/* Rewards Display */}
              {!checkinResult.alreadyCheckedIn &&
                checkinResult.pointsEarned > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <Gift className="text-yellow-400" size={24} />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          +{checkinResult.pointsEarned}{" "}
                          {t("points_suffix") || "XP"}
                        </div>
                        <div className="text-sm text-white/70">
                          {t("daily_reward") || "Daily Reward"}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              {/* Streak Milestones */}
              <div className="space-y-2">
                <p className="text-xs text-white/50 text-center">
                  {t("next_milestones") || "Next Milestones"}
                </p>
                <div className="flex justify-center gap-2">
                  {[7, 30, 50, 100].map((milestone) => {
                    const isReached = checkinResult.currentStreak >= milestone;
                    const isNext =
                      checkinResult.currentStreak < milestone &&
                      checkinResult.currentStreak >=
                        (milestone === 7
                          ? 0
                          : milestone === 30
                          ? 7
                          : milestone === 50
                          ? 30
                          : 50);

                    return (
                      <div
                        key={milestone}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                          isReached
                            ? "bg-green-500/20 border border-green-400/30"
                            : isNext
                            ? "bg-blue-500/20 border border-blue-400/30"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <div
                          className={`text-xs font-bold ${
                            isReached
                              ? "text-green-400"
                              : isNext
                              ? "text-blue-400"
                              : "text-white/50"
                          }`}
                        >
                          {milestone}
                        </div>
                        {isReached && (
                          <CheckCircle size={12} className="text-green-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              {checkinResult.message && (
                <p className="text-center text-sm text-white/70 italic">
                  "{checkinResult.message}"
                </p>
              )}

              {/* Close Button */}
              <Button
                onClick={() => setShowCheckinModal(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {t("continue_learning") || "Continue Learning"}
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}
