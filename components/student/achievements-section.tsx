'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Award, Trophy, Target, Star, Lock, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/hooks/profile/use-user';
import useAchievements, { Achievement, useUserAchievements } from '@/hooks/community/use-achievements';

interface AchievementsSectionProps {
  className?: string;
}

// Helper function to get achievement icon based on code or rule
const getAchievementIcon = (achievement: Achievement) => {
  // customized based on achievement code patterns
  const code = achievement.code?.toLowerCase() || '';
  
  if (code.includes('first') || code.includes('beginner')) return '🎯';
  if (code.includes('streak') || code.includes('consistency')) return '🔥';
  if (code.includes('complete') || code.includes('finish')) return '✅';
  if (code.includes('quiz') || code.includes('test')) return '📝';
  if (code.includes('course')) return '📚';
  if (code.includes('community') || code.includes('social')) return '👥';
  if (code.includes('expert') || code.includes('master')) return '🏆';
  if (code.includes('speed') || code.includes('fast')) return '⚡';
  
  // Default icon
  return '🌟';
};

// Helper to calculate progress percentage
const calculateProgress = (achievement: Achievement): number => {
  if (achievement.unlocked) return 100;
  
  const current = achievement.current_value || 0;
  const target = achievement.rule?.target || achievement.rule?.min || 0;
  
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};

export default function AchievementsSection({ className = '' }: AchievementsSectionProps) {
  const t = useTranslations('AchievementsSection');
  const { data: userData } = useUser();
  const userId = userData?.id || '';
  
  // Fetch user achievements
  const { achievements: userAchievements, isLoading } = useUserAchievements(userId);
  
  // Calculate statistics and categorize achievements
  const { stats, recentUnlocks, unlockedAchievements, inProgressAchievements } = useMemo(() => {
    if (!userAchievements) {
      return {
        stats: { unlocked: 0, total: 0, totalPoints: 0 },
        recentUnlocks: [],
        unlockedAchievements: [],
        inProgressAchievements: []
      };
    }
    
    const unlocked = userAchievements.filter(a => a.unlocked);
    const inProgress = userAchievements.filter(a => !a.unlocked && (a.current_value || 0) > 0);
    
    // Sort unlocked by unlock date for recent
    const recent = [...unlocked].sort((a, b) => {
      const dateA = a.unlocked_at ? new Date(a.unlocked_at).getTime() : 0;
      const dateB = b.unlocked_at ? new Date(b.unlocked_at).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);
    
    // Calculate total points from rules
    const totalPoints = unlocked.reduce((sum, a) => {
      const points = a.rule?.points || 0;
      return sum + points;
    }, 0);
    
    return {
      stats: {
        unlocked: unlocked.length,
        total: userAchievements.length,
        totalPoints
      },
      recentUnlocks: recent,
      unlockedAchievements: unlocked,
      inProgressAchievements: inProgress
    };
  }, [userAchievements]);
  
  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-white/10 rounded"></div>
            <div className="h-20 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 overflow-hidden ${className}`}>
      <div className="z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
            <Award size={18} className="sm:w-5 sm:h-5" />
            {t('title') || 'Achievements'}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
              {stats.unlocked} / {stats.total}
            </Badge>
            <Badge variant="outline" className="text-white/70 border-white/30">
              {t('points_earned', { points: stats.totalPoints }) || `${stats.totalPoints} pts earned`}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="recent">{t('recent') || 'Recent'}</TabsTrigger>
            <TabsTrigger value="unlocked">{t('unlocked') || 'Unlocked'}</TabsTrigger>
            <TabsTrigger value="progress">{t('in_progress') || 'In Progress'}</TabsTrigger>
          </TabsList>
          
          {/* Recent Tab */}
          <TabsContent value="recent" className="mt-4">
            <div className="space-y-3">
              {recentUnlocks.length > 0 ? (
                recentUnlocks.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    className="flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/15 transition-all duration-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="text-3xl">{getAchievementIcon(achievement)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{achievement.name}</h4>
                        {achievement.rule?.points && (
                          <Badge className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                            +{achievement.rule.points} pts
                          </Badge>
                        )}
                      </div>
                      {achievement.description && (
                        <p className="text-sm text-white/70">{achievement.description}</p>
                      )}
                      <p className="text-xs text-white/50 mt-1">
                        {t('unlocked_date', { date: achievement.unlocked_at ? new Date(achievement.unlocked_at).toLocaleDateString() : t('recently') || 'Recently' }) || `Unlocked ${achievement.unlocked_at ? new Date(achievement.unlocked_at).toLocaleDateString() : 'Recently'}`}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-white/60">
                  <Trophy size={48} className="mx-auto mb-4 text-white/30" />
                  <p>{t('no_recent_achievements') || 'No recent achievements. Keep learning to unlock more!'}</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Unlocked Tab */}
          <TabsContent value="unlocked" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedAchievements.length > 0 ? (
                unlockedAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    className="flex items-center gap-4 p-4 bg-white/10 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="text-2xl">{getAchievementIcon(achievement)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white text-sm">{achievement.name}</h4>
                        {achievement.rule?.points && (
                          <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                            +{achievement.rule.points}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Hash className="w-3 h-3 mr-1" />
                          {achievement.code}
                        </Badge>
                      </div>
                      {achievement.description && (
                        <p className="text-xs text-white/70 mt-1">{achievement.description}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-white/60">
                  <Award size={48} className="mx-auto mb-4 text-white/30" />
                  <p>No achievements unlocked yet. Start learning to earn your first badge!</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* In Progress Tab */}
          <TabsContent value="progress" className="mt-4">
            <div className="space-y-4">
              {inProgressAchievements.length > 0 ? (
                inProgressAchievements.map((achievement, index) => {
                  const progress = calculateProgress(achievement);
                  const target = achievement.rule?.target || achievement.rule?.min || 0;
                  
                  return (
                    <motion.div
                      key={achievement.id}
                      className="p-4 bg-white/5 rounded-lg border border-white/10"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-2xl opacity-50">{getAchievementIcon(achievement)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white/90">{achievement.name}</h4>
                            {achievement.rule?.points && (
                              <Badge variant="outline" className="text-xs text-white/60 border-white/30">
                                {achievement.rule.points} pts
                              </Badge>
                            )}
                          </div>
                          {achievement.description && (
                            <p className="text-sm text-white/70">{achievement.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-white/80">
                          <span>Progress: {achievement.current_value || 0} / {target}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-white/60">
                  <Target size={48} className="mx-auto mb-4 text-white/30" />
                  <p>No achievements in progress. Complete lessons and activities to start earning achievements!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
