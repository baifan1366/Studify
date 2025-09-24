"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Target
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLearningStats, useAchievements, Achievement } from '@/hooks/profile/use-learning-stats';

interface GamificationSectionProps {
  onDailyCheckin?: () => void;
}

export default function GamificationSection({ onDailyCheckin }: GamificationSectionProps) {
  const t = useTranslations('GamificationSection');
  const [checkedIn, setCheckedIn] = useState(false);
  
  // 获取真实数据
  const { data: learningStatsData, isLoading: statsLoading } = useLearningStats('week');
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements();
  
  // 解析学习统计数据
  const learningStats = learningStatsData?.data;
  const achievements = achievementsData?.data;
  
  // 模拟排行榜数据（可以从API获取真实数据）
  const leaderboard = [
    { rank: 1, name: "Alex Chen", points: 2847, avatar: "/api/placeholder/32/32", badge: "👑" },
    { rank: 2, name: "You", points: learningStats?.summary.currentPoints || 2156, avatar: "/api/placeholder/32/32", badge: "🥈", isUser: true },
    { rank: 3, name: "Sarah Kim", points: 1923, avatar: "/api/placeholder/32/32", badge: "🥉" },
    { rank: 4, name: "Mike Johnson", points: 1756, avatar: "/api/placeholder/32/32", badge: "" },
    { rank: 5, name: "Emma Wilson", points: 1642, avatar: "/api/placeholder/32/32", badge: "" },
  ];

  // 获取成就图标
  const getAchievementIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      learning: Zap,
      consistency: Flame,
      social: Award,
      mastery: Target,
      rewards: Gift,
      general: Star
    };
    return iconMap[category] || Star;
  };
  
  // 获取成就颜色
  const getAchievementColor = (category: string, rarity?: string) => {
    if (rarity === 'Legendary') return 'from-orange-500 to-red-500';
    if (rarity === 'Epic') return 'from-purple-500 to-blue-500';
    if (rarity === 'Rare') return 'from-blue-500 to-cyan-500';
    
    const colorMap: Record<string, string> = {
      learning: 'from-yellow-500 to-orange-500',
      consistency: 'from-red-500 to-pink-500',
      social: 'from-green-500 to-teal-500',
      mastery: 'from-purple-500 to-blue-500',
      rewards: 'from-pink-500 to-purple-500',
      general: 'from-blue-500 to-indigo-500'
    };
    return colorMap[category] || 'from-gray-500 to-gray-600';
  };
  
  // 处理成就显示（最多4个）
  const displayAchievements = achievements?.achievements?.slice(0, 4) || [];

  const handleCheckin = () => {
    setCheckedIn(true);
    onDailyCheckin?.();
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
          <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
          <p className="text-white/70">{t('subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Check-in */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-white" />
            </div>
              
            <h3 className="text-lg font-semibold text-white mb-2">{t('daily_checkin_title')}</h3>
            <p className="text-sm text-white/70 mb-4">
              {t('daily_checkin_desc_prefix')} {t('current_streak', { count: learningStats?.summary.studyStreak || 0 })}
            </p>

            <AnimatePresence mode="wait">
              {!checkedIn ? (
                <motion.button
                  key="checkin-button"
                  onClick={handleCheckin}
                  className="group bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 w-full"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle size={20} />
                    {t('check_in_today_button')}
                  </div>
                </motion.button>
              ) : (
                <motion.div
                  key="checked-in"
                  className="bg-green-600/20 border border-green-400/30 text-green-400 px-6 py-3 rounded-xl font-semibold w-full"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle size={20} />
                    {t('checked_in_with_xp', { xp: 50 })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Streak Visualization */}
            <div className="flex justify-center gap-1 mt-4">
              {[...Array(7)].map((_, i) => {
                const currentStreak = learningStats?.summary.studyStreak || 0;
                const isActive = i < Math.min(currentStreak, 7);
                return (
                  <motion.div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      isActive ? 'bg-orange-500' : 'bg-white/20'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  />
                );
              })}
            </div>
            <p className="text-xs text-white/50 mt-2">{t('this_weeks_progress')}</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={20} className="text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">{t('weekly_leaderboard_title')}</h3>
          </div>

          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <motion.div
                key={user.rank}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  user.isUser 
                    ? 'bg-blue-600/20 border border-blue-400/30' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    user.rank === 1 ? 'bg-yellow-500 text-black' :
                    user.rank === 2 ? 'bg-gray-400 text-black' :
                    user.rank === 3 ? 'bg-orange-500 text-black' :
                    'bg-white/20 text-white'
                  }`}>
                    {user.rank}
                  </span>
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${
                      user.isUser ? 'text-blue-400' : 'text-white'
                    }`}>
                      {user.name}
                    </span>
                    {user.badge && <span className="text-sm">{user.badge}</span>}
                  </div>
                  <span className="text-xs text-white/60">{user.points} {t('points_suffix')}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Badge Showcase */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Award size={20} className="text-purple-400" />
            <h3 className="text-lg font-semibold text-white">{t('badge_collection_title')}</h3>
          </div>

          <div className="space-y-3">
            {achievementsLoading ? (
              // 加载状态
              [...Array(4)].map((_, index) => (
                <div key={`loading-achievement-${index}`} className="bg-white/5 rounded-lg p-3 border border-white/10 animate-pulse">
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
                <p className="text-white/60 text-sm">
                  {t('no_achievements') || 'No achievements available'}
                </p>
              </div>
            ) : (
              // 真实数据
              displayAchievements.map((achievement: Achievement, index: number) => {
                const IconComponent = getAchievementIcon(achievement.category);
                const achievementColor = getAchievementColor(achievement.category);
                
                return (
                  <motion.div
                    key={achievement.public_id}
                    className={`p-3 rounded-lg border transition-all duration-300 ${
                      achievement.isUnlocked 
                        ? 'bg-white/10 border-white/20' 
                        : 'bg-white/5 border-white/10'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${achievementColor} ${
                        !achievement.isUnlocked ? 'opacity-50' : ''
                      }`}>
                        <IconComponent size={16} className="text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium text-sm ${
                            achievement.isUnlocked ? 'text-white' : 'text-white/60'
                          }`}>
                            {achievement.name}
                          </span>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                            {achievement.category}
                          </span>
                        </div>
                        
                        <p className="text-xs text-white/60 mb-2">{achievement.description}</p>
                        
                        {!achievement.isUnlocked && achievement.progress < 100 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-white/50">{t('progress_label')}</span>
                              <span className="text-white/70">{Math.round(achievement.progress)}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                              <motion.div
                                className={`h-1.5 rounded-full bg-gradient-to-r ${achievementColor}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${achievement.progress}%` }}
                                transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {achievement.isUnlocked && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Star size={12} fill="currentColor" />
                            {t('earned_label')} • +{achievement.pointsReward} {t('points_suffix')}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
