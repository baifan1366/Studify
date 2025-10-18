"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Users, 
  BookOpen, 
  Award,
  Zap,
  ChevronRight,
  Trophy,
  UserCheck,
  Calendar,
  Brain
} from 'lucide-react';
import CourseCard, { Course } from '../course/course-card';
import { useTranslations } from 'next-intl';

interface RecommendationPanelsProps {
  user: any;
  isLoading: boolean;
}

import { useRecommendations, transformRecommendationsData } from '@/hooks/recommendations/use-recommendations';

export default function RecommendationPanels({ user, isLoading }: RecommendationPanelsProps) {
  const t = useTranslations('RecommendationPanels');
  const [activeTab, setActiveTab] = useState('continue');
  
  // Fetch real recommendations
  const { data: recommendationsData, isLoading: recsLoading } = useRecommendations();
  const { courses, categories } = transformRecommendationsData(recommendationsData);
  
  // Use real-time stats from recommendations or defaults
  const [realtimeStats, setRealtimeStats] = useState({
    currentlyStudying: 1247,
    newCoursesThisWeek: courses.length || 8,
    teacherRecommendations: 3
  });

  // Update stats when recommendations load
  useEffect(() => {
    if (courses.length > 0) {
      setRealtimeStats(prev => ({
        ...prev,
        newCoursesThisWeek: courses.length
      }));
    }
  }, [courses.length]);

  // Simulate real-time updates for currently studying
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeStats(prev => ({
        ...prev,
        currentlyStudying: prev.currentlyStudying + Math.floor(Math.random() * 10) - 5
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCourseAction = (action: string, courseId: string) => {
    console.log(`${action} course:`, courseId);
  };

  const handlePathSelect = (pathId: string) => {
    console.log('Selected learning path:', pathId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-white/70">{t('loading_recommendations')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Personalized Recommendation Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Brain className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('personalized_title')}</h2>
          <span className="text-sm text-slate-600 dark:text-white/60 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-full">
            {t('powered_by_ai')}
          </span>
        </div>

        {/* Recommendation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'continue', label: t('tab_continue'), icon: Clock },
            { id: 'mistakes', label: t('tab_mistakes'), icon: Target },
            { id: 'peers', label: t('tab_peers'), icon: Users }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <IconComponent size={16} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recsLoading ? (
            [...Array(6)].map((_, index) => (
              <div key={index} className="bg-slate-100 dark:bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-white/20 animate-pulse">
                <div className="h-40 bg-slate-200 dark:bg-white/20 rounded-lg mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-white/20 rounded mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-white/20 rounded w-2/3" />
              </div>
            ))
          ) : courses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-600 dark:text-white/70">{t('no_recommendations') || 'No recommendations available'}</p>
            </div>
          ) : (
            courses.slice(0, 6).map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <CourseCard
                  course={course as any}
                  onEnroll={(id) => handleCourseAction('enroll', id)}
                  onPreview={(id) => handleCourseAction('preview', id)}
                  onContinue={(id) => handleCourseAction('continue', id)}
                  showProgress={activeTab === 'continue'}
                />
              </motion.div>
            ))
          )}
        </div>
      </motion.section>

      {/* Learning Paths Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Award className="text-purple-600 dark:text-purple-400" size={24} />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('learning_paths_title')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              id: '1', 
              icon: '🎯', 
              title: t('path_beginner_title') || 'Beginner Path',
              description: t('path_beginner_desc') || 'Start your learning journey',
              courses: 5,
              exercises: 50,
              estimatedTime: '2 weeks'
            },
            { 
              id: '2', 
              icon: '🚀', 
              title: t('path_intermediate_title') || 'Intermediate Path',
              description: t('path_intermediate_desc') || 'Level up your skills',
              courses: 8,
              exercises: 120,
              estimatedTime: '4 weeks'
            },
            { 
              id: '3', 
              icon: '⭐', 
              title: t('path_advanced_title') || 'Advanced Path',
              description: t('path_advanced_desc') || 'Master advanced concepts',
              courses: 10,
              exercises: 200,
              estimatedTime: '6 weeks'
            }
          ].map((path, index) => (
            <motion.div
              key={path.id}
              className="bg-slate-50 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/20 p-6 cursor-pointer group"
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => handlePathSelect(path.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 * index }}
            >
              <div className="text-4xl mb-4">{path.icon}</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{path.title}</h3>
              <p className="text-slate-600 dark:text-white/70 text-sm mb-4">{path.description}</p>
              
              <div className="space-y-2 text-sm text-slate-600 dark:text-white/60">
                <div className="flex justify-between">
                  <span>{t('label_courses')}</span>
                  <span>{path.courses}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('label_exercises')}</span>
                  <span>{path.exercises}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('label_est_time')}</span>
                  <span>{path.estimatedTime}</span>
                </div>
              </div>

              <motion.button
                className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('start_path_button')}
                <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Dynamic Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Zap className="text-yellow-600 dark:text-yellow-400" size={24} />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('live_activity_title')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Real-time Activity */}
          <div className="bg-slate-50 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('currently_studying_title')}</h3>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {realtimeStats.currentlyStudying.toLocaleString()}
            </div>
            <p className="text-slate-600 dark:text-white/60 text-sm">{t('students_online_now')}</p>
          </div>

          {/* New Courses */}
          <div className="bg-slate-50 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('new_this_week_title')}</h3>
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {realtimeStats.newCoursesThisWeek}
            </div>
            <p className="text-slate-600 dark:text-white/60 text-sm">{t('fresh_courses_added')}</p>
          </div>

          {/* Teacher Recommendations */}
          <div className="bg-slate-50 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="text-purple-600 dark:text-purple-400" size={20} />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('from_your_teacher_title')}</h3>
            </div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              {realtimeStats.teacherRecommendations}
            </div>
            <p className="text-slate-600 dark:text-white/60 text-sm">{t('recommendations_waiting')}</p>
          </div>
        </div>
      </motion.section>

      {/* Social & Interaction Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-orange-600 dark:text-orange-400" size={24} />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('community_progress_title')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Study Groups */}
          <div className="bg-slate-50 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/20 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Users size={20} />
              {t('recommended_groups_title')}
            </h3>
            <div className="space-y-3">
              {['SAT Math Prep Group', 'Physics Problem Solvers', 'AI Enthusiasts'].map((group, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-white/80">{group}</span>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm">{t('join_button')}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-50 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/20 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Trophy size={20} />
              {t('weekly_leaderboard_title')}
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Alex Chen', points: 2847, rank: 1 },
                { name: 'You', points: 2156, rank: 2 },
                { name: 'Sarah Kim', points: 1923, rank: 3 }
              ].map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      user.rank === 1 ? 'bg-yellow-500' : user.rank === 2 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {user.rank}
                    </span>
                    <span className={`${user.name === 'You' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-white/80'}`}>
                      {user.name}
                    </span>
                  </div>
                  <span className="text-slate-600 dark:text-white/60">{user.points} {t('points_suffix')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
