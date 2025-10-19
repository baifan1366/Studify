'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, Lock, CheckCircle, Calendar, Hash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import useAchievements, { Achievement, useUserAchievements } from '@/hooks/community/use-achievements';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/profile/use-user';
import { AchievementCardSkeleton, StatsCardSkeleton } from '@/components/community/skeletons';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';

// Helper function to format dates
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AchievementsContent() {
  const t = useTranslations('Achievements');
  const { data: userData } = useUser();
  const userId = userData?.id || '';
  const [filterMode, setFilterMode] = useState<'all' | 'unlocked' | 'locked'>('all');
  
  // Fetch all achievements and user progress
  const { achievements: allAchievements, isLoading: isLoadingAll } = useAchievements();
  const { achievements: userAchievements, isLoading: isLoadingUser } = useUserAchievements(userId);
  
  const isLoading = isLoadingAll || isLoadingUser;
  
  // Merge all achievements with user progress
  const achievements = useMemo(() => {
    if (!allAchievements) return [];
    
    // Create a map of user achievements for quick lookup
    const userAchievementMap = new Map(
      (userAchievements || []).map(ua => [ua.id, ua])
    );
    
    // Merge all achievements with user data
    return allAchievements.map(achievement => {
      const userProgress = userAchievementMap.get(achievement.id);
      return {
        ...achievement,
        current_value: userProgress?.current_value || 0,
        unlocked: userProgress?.unlocked || false,
        unlocked_at: userProgress?.unlocked_at,
      };
    });
  }, [allAchievements, userAchievements]);
  
  // Filter achievements based on selected filter
  const filteredAchievements = useMemo(() => {
    if (filterMode === 'unlocked') {
      return achievements.filter(a => a.unlocked);
    } else if (filterMode === 'locked') {
      return achievements.filter(a => !a.unlocked);
    }
    return achievements;
  }, [achievements, filterMode]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const unlocked = achievements.filter(a => a.unlocked);
    const total = achievements.length;
    const progressPercentage = total > 0 ? (unlocked.length / total) * 100 : 0;
    
    return {
      unlockedCount: unlocked.length,
      totalCount: total,
      progressPercentage,
      totalPoints: unlocked.reduce((sum, a) => {
        // Extract points from rule if available
        const points = a.rule?.points || 0;
        return sum + points;
      }, 0)
    };
  }, [achievements]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatsCardSkeleton />
                <div className="space-y-2">
                  <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          </div>
          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <AchievementCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy size={32} className="text-yellow-400" />
              <div>
                <h1 className="text-4xl font-bold">Achievements</h1>
                <p className="text-muted-foreground mt-1">
                  Track your learning milestones and unlock rewards
                </p>
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  filterMode === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                All ({achievements.length})
              </button>
              <button
                onClick={() => setFilterMode('unlocked')}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  filterMode === 'unlocked'
                    ? 'bg-green-600 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Unlocked ({stats.unlockedCount})
              </button>
              <button
                onClick={() => setFilterMode('locked')}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  filterMode === 'locked'
                    ? 'bg-orange-600 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Locked ({stats.totalCount - stats.unlockedCount})
              </button>
            </div>
          </div>

          {/* Progress Stats Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>
                Your achievement statistics and overall completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.unlockedCount}</div>
                  <div className="text-sm text-muted-foreground">Unlocked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalCount}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Points</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">{Math.round(stats.progressPercentage)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <motion.div 
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progressPercentage}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>


        {/* Achievements Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {filteredAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index, duration: 0.4 }}
            >
              <Card
                className={`relative overflow-hidden transition-all hover:scale-105 border border-white/10 ${
                  achievement.unlocked
                    ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                    : 'border-border'
                }`}
              >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      achievement.unlocked 
                        ? 'bg-yellow-500/20 text-yellow-600' 
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {achievement.unlocked ? (
                        <Trophy size={24} />
                      ) : (
                        <Lock size={24} />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {achievement.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Hash className="w-3 h-3 mr-1" />
                          {achievement.code}
                        </Badge>
                        {achievement.unlocked && (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Unlocked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Description */}
                {achievement.description && (
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                )}
                
                {/* Schema Fields Display */}
                <div className="space-y-2 text-sm">
                  {/* Current Value (from community_user_achievement) */}
                  {achievement.current_value !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="font-medium">
                        {achievement.current_value}
                        {achievement.rule?.target && ` / ${achievement.rule.target}`}
                      </span>
                    </div>
                  )}
                  
                  {/* Points from rule */}
                  {achievement.rule?.points && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Points:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {achievement.rule.points}
                      </span>
                    </div>
                  )}
                  
                  {/* Unlock Date */}
                  {achievement.unlocked_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Unlocked:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(achievement.unlocked_at)}
                      </span>
                    </div>
                  )}
                  
                  {/* Progress Bar for Locked Achievements */}
                  {!achievement.unlocked && achievement.rule?.target && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {Math.round((achievement.current_value / achievement.rule.target) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((achievement.current_value / achievement.rule.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Rule Details (if complex) */}
                {achievement.rule && typeof achievement.rule === 'object' && Object.keys(achievement.rule).length > 2 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View Rule Details
                    </summary>
                    <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-auto">
                      {JSON.stringify(achievement.rule, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
              
              {/* Unlock Effect */}
              {achievement.unlocked && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                />
              )}
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {filteredAchievements.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Award size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filterMode === 'unlocked' && "You haven't unlocked any achievements yet. Keep learning!"}
                {filterMode === 'locked' && "Congratulations! You've unlocked all achievements!"}
                {filterMode === 'all' && "No achievements found in the system."}
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
  );
}
