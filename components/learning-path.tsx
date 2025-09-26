"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Trophy, 
  Star, 
  ArrowRight, 
  CheckCircle, 
  Circle,
  Award,
  Zap,
  Loader2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLearningMilestones, useLearningBadges } from '@/hooks/dashboard/use-learning-milestones';
import { Skeleton } from '@/components/ui/skeleton';

interface LearningPathProps {
  onGenerateStudyPlan?: () => void;
}

export default function homLearningPath({ onGenerateStudyPlan }: LearningPathProps) {
  const t = useTranslations('LearningPath');
  
  // 获取真实的里程碑数据
  const { data: milestonesData, isLoading: milestonesLoading } = useLearningMilestones();
  const { data: badgesData, isLoading: badgesLoading } = useLearningBadges();

  // 使用真实数据或显示加载状态
  const progress = milestonesData?.overallProgress || 0;
  const milestones = milestonesData?.generatedMilestones || [];
  
  // 从成就数据中提取徽章信息
  const badges = React.useMemo(() => {
    if (!badgesData?.achievements) return [];
    
    return badgesData.achievements
      .filter((achievement: any) => achievement.category === 'learning')
      .slice(0, 3)
      .map((achievement: any) => ({
        name: achievement.name,
        icon: getAchievementIcon(achievement.code),
        earned: achievement.isUnlocked,
        color: achievement.isUnlocked ? getAchievementColor(achievement.code) : "text-gray-400"
      }));
  }, [badgesData]);

  // 加载状态
  if (milestonesLoading || badgesLoading) {
    return (
      <motion.section
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Overview Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Progress Bar Skeleton */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="w-full h-4 rounded-full mb-4" />
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Milestones Skeleton */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="w-full h-2 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Achievements & CTA Skeleton */}
          <div className="space-y-6">
            {/* Badges Skeleton */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <Skeleton className="h-5 w-28 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>

            {/* Next Milestone Skeleton */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-center space-y-3">
                <Skeleton className="w-12 h-12 rounded-full mx-auto" />
                <Skeleton className="h-5 w-32 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                <Skeleton className="w-full h-2 rounded-full" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </div>
            </div>

            {/* CTA Button Skeleton */}
            <Skeleton className="w-full h-12 rounded-xl" />
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
          <Target className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
          <p className="text-white/70">{t('subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Progress Bar */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{t('overall_progress_title')}</h3>
              <span className="text-2xl font-bold text-green-400">{progress}%</span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-white/10 rounded-full h-4 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full relative overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </motion.div>
              </div>
              
              <p className="text-sm text-white/70">
                {t('badge_unlock_hint', { remaining: 100 - progress, badge: 'Advanced Learner' })}
              </p>
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">{t('milestones_title')}</h3>
            
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.id}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={`p-2 rounded-full ${
                    milestone.completed ? 'bg-green-500' : 'bg-white/10'
                  }`}>
                    {milestone.completed ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : (
                      <Circle size={16} className="text-white/50" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${
                        milestone.completed ? 'text-white' : 'text-white/70'
                      }`}>
                        {milestone.title}
                      </span>
                      <span className="text-sm text-white/60">
                        {milestone.progress}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          milestone.completed 
                            ? 'bg-green-500' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${milestone.progress}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Achievements & CTA */}
        <div className="space-y-6">
          {/* Badges */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">{t('achievements_title')}</h3>
            
            <div className="space-y-3">
              {badges.map((badge: any, index: number) => {
                const IconComponent = badge.icon;
                return (
                  <motion.div
                    key={badge.name}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      badge.earned ? 'bg-white/10' : 'bg-white/5'
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className={`p-2 rounded-full ${
                      badge.earned ? 'bg-yellow-500/20' : 'bg-white/10'
                    }`}>
                      <IconComponent size={16} className={badge.color} />
                    </div>
                    <span className={`text-sm font-medium ${
                      badge.earned ? 'text-white' : 'text-white/50'
                    }`}>
                      {badge.name}
                    </span>
                    {badge.earned && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <Star size={14} className="text-yellow-400" fill="currentColor" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Next Milestone */}
          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-400/30">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award size={24} className="text-white" />
              </div>
              <h4 className="font-semibold text-white mb-2">{t('next_milestone_title')}</h4>
              <p className="text-sm text-white/70 mb-4">
                {t('next_milestone_desc', { count: 3, badge: 'Problem Solver' })}
              </p>
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full w-2/3" />
              </div>
              <span className="text-xs text-white/60">{t('progress_completed_short', { done: 2, total: 3 })}</span>
            </div>
          </div>

          {/* CTA Button */}
          <motion.button
            onClick={onGenerateStudyPlan}
            className="group w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-2">
              <Target size={20} />
              {t('cta_generate_study_plan')}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}

// 辅助函数：根据成就代码获取图标
function getAchievementIcon(code: string) {
  if (code.includes('quick') || code.includes('fast')) return Zap;
  if (code.includes('consistent') || code.includes('streak')) return Target;
  if (code.includes('problem') || code.includes('quiz')) return Trophy;
  if (code.includes('course') || code.includes('lesson')) return Award;
  return Star;
}

// 辅助函数：根据成就代码获取颜色
function getAchievementColor(code: string) {
  if (code.includes('quick') || code.includes('fast')) return "text-yellow-400";
  if (code.includes('consistent') || code.includes('streak')) return "text-blue-400";
  if (code.includes('problem') || code.includes('quiz')) return "text-purple-400";
  if (code.includes('course') || code.includes('lesson')) return "text-green-400";
  return "text-orange-400";
}
