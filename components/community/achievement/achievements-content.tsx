'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, Lock, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAchievements, Achievement } from '@/hooks/achievements/use-achievements';
import AnimatedBackground from '@/components/ui/animated-background';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const categoryColors = {
  learning: 'bg-blue-500',
  consistency: 'bg-orange-500', 
  community: 'bg-green-500',
  performance: 'bg-purple-500',
  habits: 'bg-yellow-500'
};

const categoryLabels = {
  learning: 'Learning',
  consistency: 'Consistency',
  community: 'Community',
  performance: 'Performance',
  habits: 'Habits'
};

export default function AchievementsContent() {
  const t = useTranslations('Achievements');
  const { data: achievementsData, isLoading } = useAchievements();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (isLoading) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen p-6">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="w-full h-96" />
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const achievements = achievementsData?.achievements || [];
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const categories = ['all', ...Object.keys(categoryLabels)] as const;
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const progressPercentage = achievements.length > 0 ? (unlockedAchievements.length / achievements.length) * 100 : 0;

  return (
    <AnimatedBackground>
      <div className="min-h-screen p-6 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy size={32} className="text-yellow-400" />
              <h1 className="text-4xl font-bold text-white">Achievements</h1>
            </div>
            <p className="text-white/70 mb-6">
              Track your learning milestones and unlock rewards
            </p>

            {/* Progress Stats */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{achievementsData?.unlockedCount || 0}</div>
                <div className="text-sm text-white/60">Unlocked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{achievementsData?.totalCount || 0}</div>
                <div className="text-sm text-white/60">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{achievementsData?.totalPoints || 0}</div>
                <div className="text-sm text-white/60">Points</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Progress</span>
                <span className="text-sm text-white/70">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <motion.div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Category Filter */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-white text-gray-900'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {category === 'all' ? 'All' : categoryLabels[category as keyof typeof categoryLabels]}
              </button>
            ))}
          </motion.div>

          {/* Achievements Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                className={`relative rounded-2xl border backdrop-blur-sm p-6 transition-all hover:scale-105 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-white/15 to-white/10 border-white/30 shadow-lg'
                    : 'bg-gradient-to-br from-white/5 to-white/2 border-white/10'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.6 }}
              >
                {/* Achievement Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
                    achievement.unlocked ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                    {achievement.unlocked ? achievement.icon : <Lock size={24} className="text-white/40" />}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {achievement.unlocked && (
                      <CheckCircle size={20} className="text-green-400" />
                    )}
                    <Badge 
                      variant="secondary" 
                      className={`${categoryColors[achievement.category]} text-white border-0`}
                    >
                      {categoryLabels[achievement.category]}
                    </Badge>
                  </div>
                </div>

                {/* Achievement Info */}
                <div className="mb-4">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    achievement.unlocked ? 'text-white' : 'text-white/60'
                  }`}>
                    {achievement.title}
                  </h3>
                  <p className={`text-sm ${
                    achievement.unlocked ? 'text-white/80' : 'text-white/50'
                  }`}>
                    {achievement.description}
                  </p>
                </div>

                {/* Points */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-400" />
                    <span className={`text-sm font-medium ${
                      achievement.unlocked ? 'text-yellow-400' : 'text-white/50'
                    }`}>
                      {achievement.points} points
                    </span>
                  </div>
                  
                  {achievement.unlocked && (
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      Unlocked
                    </Badge>
                  )}
                </div>

                {/* Unlock Effect */}
                {achievement.unlocked && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/20 to-orange-500/20 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-12">
              <Award size={48} className="text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No achievements found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
}
