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
  Zap
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import AchievementsSection from '@/components/student/achievements-section';
import StudentAchievementStats from '@/components/student/achievement-stats';

interface LearningPathProps {
  onGenerateStudyPlan?: () => void;
}

export default function homLearningPath({ onGenerateStudyPlan }: LearningPathProps) {
  const t = useTranslations('LearningPath');
  const progress = 65; // Example progress percentage
  
  const milestones = [
    { id: 1, title: "Basic Concepts", completed: true, progress: 100 },
    { id: 2, title: "Intermediate Skills", completed: true, progress: 100 },
    { id: 3, title: "Advanced Topics", completed: false, progress: 30 },
    { id: 4, title: "Expert Level", completed: false, progress: 0 },
  ];

  const badges = [
    { name: "Quick Learner", icon: Zap, earned: true, color: "text-yellow-400" },
    { name: "Consistent", icon: Target, earned: true, color: "text-blue-400" },
    { name: "Problem Solver", icon: Trophy, earned: false, color: "text-gray-400" },
  ];

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
        <AchievementsSection />
      </div>
    </motion.section>
  );
}
