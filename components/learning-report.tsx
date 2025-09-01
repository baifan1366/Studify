"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  ArrowRight,
  Calendar,
  Award,
  Zap
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LearningReportProps {
  onViewProgress?: () => void;
}

export default function LearningReport({ onViewProgress }: LearningReportProps) {
  const t = useTranslations('LearningReport');
  // Mock data for charts
  const weeklyData = [
    { day: 'Mon', hours: 2.5 },
    { day: 'Tue', hours: 3.2 },
    { day: 'Wed', hours: 1.8 },
    { day: 'Thu', hours: 4.1 },
    { day: 'Fri', hours: 2.9 },
    { day: 'Sat', hours: 3.7 },
    { day: 'Sun', hours: 2.3 }
  ];

  const masteryLevels = [
    { subject: 'Math', level: 85, color: 'text-blue-400' },
    { subject: 'Physics', level: 72, color: 'text-green-400' },
    { subject: 'Chemistry', level: 68, color: 'text-purple-400' },
    { subject: 'Biology', level: 91, color: 'text-orange-400' },
    { subject: 'English', level: 79, color: 'text-pink-400' }
  ];

  const maxHours = Math.max(...weeklyData.map(d => d.hours));

  return (
    <motion.section
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
          <BarChart3 className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
          <p className="text-white/70">{t('subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Duration Chart */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{t('weekly_learning_duration_title')}</h3>
            <div className="flex items-center gap-1 text-sm text-green-400">
              <TrendingUp size={16} />
              {t('trend_vs_last_week', { value: 12 })}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="space-y-3">
            {weeklyData.map((data, index) => (
              <motion.div
                key={data.day}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <span className="text-sm text-white/70 w-8">{t(`days.${data.day}`)}</span>
                <div className="flex-1 bg-white/10 rounded-full h-6 relative overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                    initial={{ width: 0 }}
                    animate={{ width: `${(data.hours / maxHours) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  >
                    <span className="text-xs text-white font-medium">
                      {data.hours}{t('hours_suffix')}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                <Clock size={16} />
                <span className="text-lg font-bold">20.5h</span>
              </div>
              <span className="text-xs text-white/60">{t('total_this_week')}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <Target size={16} />
                <span className="text-lg font-bold">2.9h</span>
              </div>
              <span className="text-xs text-white/60">{t('daily_average')}</span>
            </div>
          </div>
        </div>

        {/* Mastery Level Radar */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{t('subject_mastery_levels_title')}</h3>
            <div className="flex items-center gap-1 text-sm text-orange-400">
              <Award size={16} />
              {t('top_performer_label')}
            </div>
          </div>

          {/* Mastery Bars */}
          <div className="space-y-4">
            {masteryLevels.map((subject, index) => (
              <motion.div
                key={subject.subject}
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{subject.subject}</span>
                  <span className={`text-sm font-bold ${subject.color}`}>
                    {subject.level}%
                  </span>
                </div>
                
                <div className="w-full bg-white/10 rounded-full h-3 relative overflow-hidden">
                  <motion.div
                    className={`h-3 rounded-full bg-gradient-to-r ${
                      subject.level >= 80 
                        ? 'from-green-500 to-emerald-500'
                        : subject.level >= 60
                        ? 'from-yellow-500 to-orange-500'
                        : 'from-red-500 to-pink-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${subject.level}%` }}
                    transition={{ duration: 1.5, delay: 0.5 + index * 0.1 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 1 + index * 0.2
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Insights */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-400/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm font-semibold text-white">{t('ai_insight_label')}</span>
            </div>
            <p className="text-sm text-white/80">
              {t('ai_insight_text')}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <motion.div
          className="bg-white/5 rounded-lg p-4 text-center border border-white/10"
          whileHover={{ scale: 1.05 }}
        >
          <div className="text-2xl font-bold text-blue-400 mb-1">47</div>
          <div className="text-xs text-white/60">{t('lessons_completed')}</div>
        </motion.div>
        
        <motion.div
          className="bg-white/5 rounded-lg p-4 text-center border border-white/10"
          whileHover={{ scale: 1.05 }}
        >
          <div className="text-2xl font-bold text-green-400 mb-1">12</div>
          <div className="text-xs text-white/60">{t('streak_days')}</div>
        </motion.div>
        
        <motion.div
          className="bg-white/5 rounded-lg p-4 text-center border border-white/10"
          whileHover={{ scale: 1.05 }}
        >
          <div className="text-2xl font-bold text-purple-400 mb-1">89%</div>
          <div className="text-xs text-white/60">{t('accuracy_rate')}</div>
        </motion.div>
        
        <motion.div
          className="bg-white/5 rounded-lg p-4 text-center border border-white/10"
          whileHover={{ scale: 1.05 }}
        >
          <div className="text-2xl font-bold text-orange-400 mb-1">156</div>
          <div className="text-xs text-white/60">{t('points_earned')}</div>
        </motion.div>
      </div>

      {/* CTA Button */}
      <motion.div
        className="text-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.button
          onClick={onViewProgress}
          className="group bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={20} />
            {t('cta_view_complete_progress')}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>
      </motion.div>
    </motion.section>
  );
}
