'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
  FileText,
  Maximize2,
  X
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useDashboard, RecentCourse, UpcomingEvent } from '@/hooks/dashboard/use-dashboard';
import { useLearningStats, useAchievements, formatStudyTime } from '@/hooks/profile/use-learning-stats';
import { useUserPreferences } from '@/hooks/profile/use-user-preferences';
import { useDashboardTrends } from '@/hooks/dashboard/use-dashboard-trends';
import { useLearningPaths } from '@/hooks/dashboard/use-learning-paths';
import { useContinueWatching, useContinueWatchingActions } from '@/hooks/learning/use-learning-progress';
import { useAINotes } from '@/hooks/dashboard/use-ai-notes';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Mermaid from '@/components/ui/mermaid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import UniversalSearch from '@/components/search/universal-search';
import DailyCoachCard from '@/components/ai-coach/daily-coach-card';
import EveningReflectionModal from '@/components/ai-coach/evening-reflection-modal';

export default function DashboardContent() {
  const t = useTranslations('Dashboard');
  const { data: userData, isLoading: userLoading } = useUser();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();
  const { data: learningStats, isLoading: statsLoading } = useLearningStats('week');
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements();
  const { data: learningPaths, isLoading: learningPathsLoading } = useLearningPaths({ limit: 3, activeOnly: true });
  const { data: continueWatchingItems, isLoading: continueWatchingLoading } = useContinueWatching();
  const { generateContinueWatchingUrl, formatProgress, formatTimeRemaining, formatLastAccessed } = useContinueWatchingActions();
  const { data: userPreferences, isLoading: preferencesLoading } = useUserPreferences();
  const { data: trendsData, isLoading: trendsLoading } = useDashboardTrends();
  const { data: aiNotes, isLoading: aiNotesLoading } = useAINotes({ limit: 5 });
  
  // Modal states
  const [showReflectionModal, setShowReflectionModal] = React.useState(false);
  const [selectedLearningPath, setSelectedLearningPath] = React.useState<any>(null);
  const [showLearningPathModal, setShowLearningPathModal] = React.useState(false);
  const [selectedAINote, setSelectedAINote] = React.useState<any>(null);
  const [showAINoteModal, setShowAINoteModal] = React.useState(false);

  const user = userData;
  const profile = user?.profile;

  if (userLoading || dashboardLoading || statsLoading || preferencesLoading || trendsLoading) {
    return (
        <div className="min-h-screen p-6">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="w-full h-96" />
          </div>
        </div>
    );
  }

  // Combine dashboard data with learning stats
  const learningData = learningStats?.summary;
  const dashStats = dashboardData?.stats;
  
  // Prioritize API data and provide better fallbacks
  const stats = {
    // Courses enrolled - prefer dashboard data as it queries actual enrollments
    coursesEnrolled: dashStats?.coursesEnrolled ?? 0,
    
    // Courses completed - prefer learning stats (more accurate)
    coursesCompleted: learningData?.completedCourses ?? dashStats?.coursesCompleted ?? 0,
    
    // Study time - prefer learning stats (aggregated from study sessions)
    totalStudyTime: learningData?.totalStudyHours ?? dashStats?.totalStudyTime ?? 0,
    
    // Streak - prefer learning stats
    currentStreak: learningData?.studyStreak ?? dashStats?.currentStreak ?? 0,
    
    // Points - prefer profile points (most authoritative source)
    points: profile?.points ?? learningData?.currentPoints ?? dashStats?.points ?? 0,
    
    // Additional stats from learning data
    lessonsCompleted: learningData?.completedLessons ?? 0,
    avgProgress: learningData?.avgProgress ?? 0,
    pointsEarned: learningData?.pointsEarned ?? 0,
    achievements: learningData?.unlockedAchievements ?? 0
  };
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Dashboard Stats Debug:', {
      dashStats,
      learningData,
      profilePoints: profile?.points,
      computedStats: stats,
      dataSources: {
        coursesEnrolled: 'dashStats (from course_enrollment)',
        coursesCompleted: 'learningData or dashStats',
        totalStudyTime: 'learningData (from study_session) or dashStats',
        currentStreak: 'learningData or dashStats (from study_session)',
        points: 'profile.points or learningData or dashStats'
      }
    });
  }
  
  const recentAchievements = achievementsData?.stats?.recentUnlocks || [];
  const dailyStats = learningStats?.charts?.dailyStudyTime || [];

  const recentCourses = dashboardData?.recentCourses || [];
  const upcomingEvents = dashboardData?.upcomingEvents || [];


  return (
      <div className="min-h-screen p-6 pb-32">
        <div className="max-w-7xl mx-auto">


          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {profile?.display_name || user?.email?.split('@')[0] ? 
                t('welcome_back', { name: profile?.display_name || user?.email?.split('@')[0] || 'Student' }) : 
                t('welcome_back_default')
              }
            </h1>
            <p className="text-gray-600 dark:text-white/70">
              {t('learning_journey')}
            </p>
          </motion.div>

          {/* Universal Search */}
          <motion.div
            className="mb-8 relative z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('search_title')}
                  </h2>
                  <p className="text-gray-600 dark:text-white/70 text-sm">
                    {t('search_description')}
                  </p>
                </div>
              </div>
              
              <UniversalSearch
                placeholder={t('search_placeholder')}
                className="max-w-2xl relative"
              />
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {[
              { label: t('courses_enrolled'), value: stats.coursesEnrolled, icon: BookOpen, color: 'blue', trend: null },
              { label: t('completed'), value: stats.coursesCompleted, icon: Award, color: 'green', trend: trendsData?.courseCompletion?.trend || t('no_change_week') },
              { label: t('study_hours'), value: `${stats.totalStudyTime}h`, icon: Clock, color: 'purple', trend: trendsData?.studyTime?.trend || t('same_last_week') },
              { label: t('current_streak'), value: `${stats.currentStreak} ${t('days')}`, icon: TrendingUp, color: 'orange', trend: trendsData?.streak?.trend || (stats.currentStreak > 0 ? t('keep_going') : t('start_today')) },
              { label: t('points'), value: stats.points, icon: Star, color: 'yellow', trend: trendsData?.points?.trend || t('no_points_earned') }
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm p-6 hover:from-white/15 hover:to-white/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-white/70 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    {stat.trend && (
                      <p className="text-xs text-green-400 mt-1">{stat.trend}</p>
                    )}
                  </div>
                  <stat.icon size={24} className={`text-${stat.color}-400`} />
                </div>
                {stat.label === t('study_hours') && stats.avgProgress > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-white/60 mb-1">
                      <span>{t('avg_progress')}</span>
                      <span>{stats.avgProgress}%</span>
                    </div>
                    <Progress value={stats.avgProgress} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          {/* Continue Learning Section - Full Width */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
              <div className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <PlayCircle size={20} />
                  {continueWatchingItems && continueWatchingItems.length > 0 ? t('continue_watching') : t('continue_learning')}
                </h3>
                
                <div className="space-y-4">
                  {/* Continue Watching Items */}
                  {continueWatchingItems && continueWatchingItems.length > 0 ? (
                    continueWatchingItems.slice(0, 3).map((item) => (
                      <Link
                        key={`${item.course_slug}-${item.lesson_public_id}`}
                        href={generateContinueWatchingUrl(item)}
                        className="block"
                      >
                        <div className="flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer group">
                          {/* Thumbnail */}
                          <div className="relative w-16 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center overflow-hidden">
                            {item.course_thumbnail ? (
                              <img
                                src={item.course_thumbnail}
                                alt={item.course_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PlayCircle size={20} className="text-white/70" />
                            )}
                            {/* Continue watching indicator */}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <PlayCircle size={16} className="text-white" />
                            </div>
                          </div>
                          
                          {/* Content Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">{item.lesson_title}</h4>
                            <p className="text-sm text-gray-600 dark:text-white/60 truncate">{item.course_title}</p>
                            <p className="text-xs text-orange-400">{item.module_title}</p>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                              <div 
                                className="bg-gradient-to-r from-orange-400 to-red-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${item.progress_pct}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Progress Info */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatProgress(item.progress_pct)}</p>
                            <p className="text-xs text-gray-600 dark:text-white/60">{formatTimeRemaining(item.progress_pct, item.video_duration_sec)}</p>
                            <p className="text-xs text-gray-500 dark:text-white/40">{formatLastAccessed(item.last_accessed_at)}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    /* Fallback to recent courses if no continue watching items */
                    recentCourses.map((course: RecentCourse) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        <div className="w-16 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                          <BookOpen size={20} className="text-white/70" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{course.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-white/60">{t('last_accessed')} {course.lastAccessed}</p>
                          <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{course.progress}%</p>
                          <p className="text-xs text-gray-600 dark:text-white/60">{t('complete')}</p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* Show message when no items to continue */}
                  {!continueWatchingLoading && (!continueWatchingItems || continueWatchingItems.length === 0) && recentCourses.length === 0 && (
                    <div className="text-center py-8">
                      <PlayCircle size={48} className="text-gray-400 dark:text-white/30 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-white/60">{t('no_courses_progress')}</p>
                      <p className="text-sm text-gray-500 dark:text-white/40 mt-1">{t('start_course_hint')}</p>
                    </div>
                  )}
                </div>
              </div>
          </motion.div>

          {/* Cards Grid - 2 columns on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {/* Daily Learning Coach */}
              <DailyCoachCard 
                onReflectionClick={() => setShowReflectionModal(true)}
              />
              
              {/* My Learning Paths */}
              {learningPaths && learningPaths.length > 0 && (
                <div className="relative bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Route size={18} />
                    {t('my_learning_paths')}
                  </h3>
                  
                  <div className="space-y-4">
                    {learningPaths.slice(0, 2).map((path) => (
                      <div 
                        key={path.id} 
                        className="p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedLearningPath(path);
                          setShowLearningPathModal(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Target size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">{path.title}</h4>
                              <Maximize2 size={14} className="text-gray-500 dark:text-white/40 group-hover:text-gray-700 dark:group-hover:text-white/70 transition-colors" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-white/60 mb-2">{path.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="text-xs bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                {path.learning_goal}
                              </Badge>
                              <Badge className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                                {path.current_level}
                              </Badge>
                              <Badge className="text-xs bg-pink-500/20 text-pink-300 border-pink-500/30">
                                <Clock className="h-3 w-3 mr-1" />
                                {path.time_constraint}
                              </Badge>
                            </div>
                            {path.mermaid_diagram && (
                              <div className="mt-3 p-3 bg-white/5 rounded-lg">
                                <div className="text-xs text-gray-600 dark:text-white/60 mb-2">{t('learning_path_preview')}</div>
                                <div className="max-h-32 overflow-hidden relative">
                                  <Mermaid 
                                    chart={path.mermaid_diagram}
                                    className="w-full scale-75 origin-top-left"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
                                </div>
                                <div className="text-xs text-gray-500 dark:text-white/50 mt-1 flex items-center gap-1">
                                  <Maximize2 size={12} />
                                  {t('click_to_view_full_path')}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {learningPaths.length > 2 && (
                      <div className="text-center pt-2">
                        <button className="text-xs text-gray-600 dark:text-white/60 hover:text-gray-800 dark:hover:text-white/80 transition-colors">
                          {t('view_all_learning_paths', { count: learningPaths.length })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Saved AI Notes */}
              {aiNotes && aiNotes.length > 0 && (
                <div className="relative bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-purple-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText size={18} />
                    {t('my_ai_notes')}
                  </h3>
                  
                  <div className="space-y-3">
                    {aiNotes.slice(0, 4).map((note) => (
                      <div 
                        key={note.id} 
                        className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedAINote(note);
                          setShowAINoteModal(true);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">{note.title}</h4>
                              <Maximize2 size={14} className="text-gray-500 dark:text-white/40 group-hover:text-gray-700 dark:group-hover:text-white/70 transition-colors" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-white/60 line-clamp-2 mb-2">
                              {note.ai_summary || note.content}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {note.tags && note.tags.slice(0, 3).map((tag, idx) => (
                                <Badge 
                                  key={idx} 
                                  className="text-xs bg-violet-500/20 text-violet-300 border-violet-500/30"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              <span className="text-xs text-gray-500 dark:text-white/40">
                                {new Date(note.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {aiNotes.length > 4 && (
                      <div className="text-center pt-2">
                        <button className="text-xs text-gray-600 dark:text-white/60 hover:text-gray-800 dark:hover:text-white/80 transition-colors">
                          {t('view_all_notes', { count: aiNotes.length })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right Column */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {/* Upcoming Events */}
              <div className="relative bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-blue-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar size={18} />
                  {t('upcoming')}
                </h3>
                
                <div className="space-y-3">
                  {upcomingEvents.map((event: UpcomingEvent) => (
                    <div key={event.id} className="p-3 bg-white/10 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{event.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-white/60">{event.date} at {event.time}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Achievements */}
              <div className="relative bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Award size={18} />
                    {t('recent_achievements')}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {stats.achievements} {t('unlocked')}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {recentAchievements.length > 0 ? (
                    recentAchievements.slice(0, 3).map((achievement, index) => (
                      <div key={achievement.id || index} className="p-3 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{achievement.category === 'learning' ? '📚' : achievement.category === 'consistency' ? '🔥' : '⭐'}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">{achievement.name}</h4>
                              <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                                +{achievement.pointsReward} pts
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-white/60">{achievement.description}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-600 dark:text-white/60 text-sm">Complete your first lesson to unlock achievements!</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Weekly Progress Chart */}
              <div className="relative bg-gradient-to-br from-green-600/20 via-emerald-600/20 to-teal-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} />
                  {t('this_week_progress')}
                </h3>
                
                <div className="space-y-3">
                  {dailyStats.slice(-7).map((day, index) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-12 text-xs text-gray-600 dark:text-white/60">
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((day.minutes / 120) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-700 dark:text-white/70 w-12 text-right">
                            {day.hours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-white/60">
                    <span>Weekly Goal: {userPreferences?.preferences?.weekly_study_goal_hours || 10}h</span>
                    <span>{dailyStats.slice(-7).reduce((sum, day) => sum + day.hours, 0).toFixed(1)}h completed</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex-1 bg-white/10 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min((dailyStats.slice(-7).reduce((sum, day) => sum + day.hours, 0) / (userPreferences?.preferences?.weekly_study_goal_hours || 10)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
            </motion.div>
          </div>
        </div>
        
        {/* Evening Reflection Modal */}
        <EveningReflectionModal 
          isOpen={showReflectionModal}
          onClose={() => setShowReflectionModal(false)}
        />
        
        {/* Learning Path Full View Modal */}
        <Dialog open={showLearningPathModal} onOpenChange={setShowLearningPathModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-indigo-900/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Route className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedLearningPath?.title}
                    </DialogTitle>
                    <p className="text-sm text-gray-600 dark:text-white/60 mt-1">
                      {selectedLearningPath?.description}
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            {selectedLearningPath && (
              <div className="space-y-6 mt-4">
                {/* Path Details */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    <Target className="h-3 w-3 mr-1" />
                    {selectedLearningPath.learning_goal}
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {selectedLearningPath.current_level}
                  </Badge>
                  <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedLearningPath.time_constraint}
                  </Badge>
                </div>
                
                {/* Full Mermaid Diagram */}
                {selectedLearningPath.mermaid_diagram && (
                  <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-white/80 mb-4">{t('complete_learning_path')}</h4>
                    <div className="bg-white/90 rounded-lg p-6 overflow-x-auto">
                      <Mermaid 
                        chart={selectedLearningPath.mermaid_diagram}
                        className="w-full min-h-[400px]"
                      />
                    </div>
                  </div>
                )}
                
                {/* Additional Information */}
                {selectedLearningPath.ai_insights && (
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <h4 className="text-sm font-medium text-blue-300 mb-2">AI Insights</h4>
                    <p className="text-sm text-gray-700 dark:text-white/80">{selectedLearningPath.ai_insights}</p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Link 
                    href={`/student/learning-paths/${selectedLearningPath?.id || selectedLearningPath?.public_id}`}
                    className="flex-1"
                  >
                    <Button 
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                      onClick={() => setShowLearningPathModal(false)}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {t('start_learning_path')}
                    </Button>
                  </Link>
                  <Button 
                    variant="outline"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                    onClick={() => setShowLearningPathModal(false)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('close')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* AI Note Full View Modal */}
        <Dialog open={showAINoteModal} onOpenChange={setShowAINoteModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900/95 via-violet-900/95 to-fuchsia-900/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <FileText className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedAINote?.title}
                    </DialogTitle>
                    <p className="text-sm text-gray-600 dark:text-white/60 mt-1">
                      {t('created_on')} {selectedAINote && new Date(selectedAINote.created_at).toLocaleDateString('en', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            {selectedAINote && (
              <div className="space-y-6 mt-4">
                {/* Tags */}
                {selectedAINote.tags && selectedAINote.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 dark:text-white/60">{t('tags')}</span>
                    {selectedAINote.tags.map((tag: string, idx: number) => (
                      <Badge 
                        key={idx} 
                        className="bg-violet-500/20 text-violet-300 border-violet-500/30"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* AI Summary */}
                {selectedAINote.ai_summary && (
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-medium text-blue-300">{t('ai_summary')}</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-white/80 whitespace-pre-wrap">{selectedAINote.ai_summary}</p>
                  </div>
                )}
                
                {/* Full Content */}
                <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-white/80 mb-4">{t('full_content')}</h4>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <p className="text-gray-800 dark:text-white/90 whitespace-pre-wrap leading-relaxed">
                      {selectedAINote.content}
                    </p>
                  </div>
                </div>
                
                {/* Course/Lesson Info */}
                {(selectedAINote.course_id || selectedAINote.lesson_id) && (
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-medium text-purple-300">{t('related_content')}</h4>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-white/70">
                      {selectedAINote.course_id && (
                        <p>{t('course_id')}{selectedAINote.course_id}</p>
                      )}
                      {selectedAINote.lesson_id && (
                        <p>{t('lesson_id')}{selectedAINote.lesson_id}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Link 
                    href={`/student/notes/${selectedAINote?.id || selectedAINote?.public_id}`}
                    className="flex-1"
                  >
                    <Button 
                      variant="outline"
                      className="w-full bg-violet-500/20 border-violet-500/30 text-violet-300 hover:bg-violet-500/30"
                      onClick={() => setShowAINoteModal(false)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {t('edit_note')}
                    </Button>
                  </Link>
                  <Button 
                    variant="outline"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                    onClick={() => setShowAINoteModal(false)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('close')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}
