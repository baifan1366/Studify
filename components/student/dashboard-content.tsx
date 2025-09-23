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
  Route
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useFullProfile } from '@/hooks/profile/use-profile';
import { useDashboard, RecentCourse, UpcomingEvent } from '@/hooks/dashboard/use-dashboard';
import { useLearningStats, useAchievements, formatStudyTime } from '@/hooks/profile/use-learning-stats';
import { useLearningPaths } from '@/hooks/dashboard/use-learning-paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Mermaid from '@/components/ui/mermaid';

export default function DashboardContent() {
  const t = useTranslations('Dashboard');
  const { data: userData } = useUser();
  const { data: fullProfileData, isLoading: profileLoading } = useFullProfile(userData?.id || '');
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();
  const { data: learningStats, isLoading: statsLoading } = useLearningStats('week');
  const { data: achievementsData, isLoading: achievementsLoading } = useAchievements();
  const { data: learningPaths, isLoading: learningPathsLoading } = useLearningPaths({ limit: 3, activeOnly: true });

  const user = userData;
  const profile = fullProfileData?.profile || user?.profile;

  if (profileLoading || dashboardLoading || statsLoading) {
    return (
        <div className="min-h-screen p-6">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="w-full h-96" />
          </div>
        </div>
    );
  }

  // Combine dashboard data with learning stats
  const learningData = learningStats?.data?.summary;
  const stats = {
    coursesEnrolled: dashboardData?.stats?.coursesEnrolled || 0,
    coursesCompleted: learningData?.completedCourses || dashboardData?.stats?.coursesCompleted || 0,
    totalStudyTime: learningData?.totalStudyHours || dashboardData?.stats?.totalStudyTime || 0,
    currentStreak: learningData?.studyStreak || dashboardData?.stats?.currentStreak || 0,
    points: learningData?.currentPoints || profile?.points || 0,
    lessonsCompleted: learningData?.completedLessons || 0,
    avgProgress: learningData?.avgProgress || 0,
    pointsEarned: learningData?.pointsEarned || 0,
    achievements: learningData?.unlockedAchievements || 0
  };
  
  const recentAchievements = achievementsData?.data?.stats?.recentUnlocks || [];
  const dailyStats = learningStats?.data?.charts?.dailyStudyTime || [];

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
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back, {profile?.display_name || user?.email?.split('@')[0] || 'Student'}! 👋
            </h1>
            <p className="text-white/70">
              Ready to continue your learning journey?
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {[
              { label: 'Courses Enrolled', value: stats.coursesEnrolled, icon: BookOpen, color: 'blue', trend: null },
              { label: 'Completed', value: stats.coursesCompleted, icon: Award, color: 'green', trend: '+2 this week' },
              { label: 'Study Hours', value: `${stats.totalStudyTime}h`, icon: Clock, color: 'purple', trend: '+5.2h this week' },
              { label: 'Current Streak', value: `${stats.currentStreak} days`, icon: TrendingUp, color: 'orange', trend: stats.currentStreak > 0 ? '🔥 Keep going!' : 'Start today!' },
              { label: 'Points', value: stats.points, icon: Star, color: 'yellow', trend: `+${stats.pointsEarned} earned` }
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm p-6 hover:from-white/15 hover:to-white/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-white/70 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    {stat.trend && (
                      <p className="text-xs text-green-400 mt-1">{stat.trend}</p>
                    )}
                  </div>
                  <stat.icon size={24} className={`text-${stat.color}-400`} />
                </div>
                {stat.label === 'Study Hours' && stats.avgProgress > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>Avg Progress</span>
                      <span>{stats.avgProgress}%</span>
                    </div>
                    <Progress value={stats.avgProgress} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Courses */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <PlayCircle size={20} />
                  Continue Learning
                </h3>
                
                <div className="space-y-4">
                  {recentCourses.map((course: RecentCourse) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <div className="w-16 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                        <BookOpen size={20} className="text-white/70" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{course.title}</h4>
                        <p className="text-sm text-white/60">Last accessed: {course.lastAccessed}</p>
                        <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{course.progress}%</p>
                        <p className="text-xs text-white/60">Complete</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {/* Upcoming Events */}
              <div className="relative bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-blue-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar size={18} />
                  Upcoming
                </h3>
                
                <div className="space-y-3">
                  {upcomingEvents.map((event: UpcomingEvent) => (
                    <div key={event.id} className="p-3 bg-white/10 rounded-lg">
                      <h4 className="font-medium text-white text-sm">{event.title}</h4>
                      <p className="text-xs text-white/60">{event.date} at {event.time}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Achievements */}
              <div className="relative bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Award size={18} />
                    Recent Achievements
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {stats.achievements} unlocked
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
                              <h4 className="font-medium text-white text-sm">{achievement.name}</h4>
                              <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                                +{achievement.pointsReward} pts
                              </Badge>
                            </div>
                            <p className="text-xs text-white/60">{achievement.description}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-white/60 text-sm">Complete your first lesson to unlock achievements!</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Weekly Progress Chart */}
              <div className="relative bg-gradient-to-br from-green-600/20 via-emerald-600/20 to-teal-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} />
                  This Week's Progress
                </h3>
                
                <div className="space-y-3">
                  {dailyStats.slice(-7).map((day, index) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-12 text-xs text-white/60">
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
                          <span className="text-xs text-white/70 w-12 text-right">
                            {day.hours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Weekly Goal: 10h</span>
                    <span>{dailyStats.reduce((sum, day) => sum + day.hours, 0).toFixed(1)}h completed</span>
                  </div>
                </div>
              </div>
              
              {/* My Learning Paths */}
              {learningPaths && learningPaths.length > 0 && (
                <div className="relative bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Route size={18} />
                    My Learning Paths
                  </h3>
                  
                  <div className="space-y-4">
                    {learningPaths.slice(0, 2).map((path) => (
                      <div key={path.id} className="p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Target size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white text-sm mb-1">{path.title}</h4>
                            <p className="text-xs text-white/60 mb-2">{path.description}</p>
                            <div className="flex items-center gap-2">
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
                                <div className="text-xs text-white/60 mb-2">学习路径图:</div>
                                <div className="max-h-32 overflow-hidden">
                                  <Mermaid 
                                    chart={path.mermaid_diagram}
                                    className="w-full scale-75 origin-top-left"
                                  />
                                </div>
                                <div className="text-xs text-white/50 mt-1">
                                  💡 点击查看完整路径图
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {learningPaths.length > 2 && (
                      <div className="text-center pt-2">
                        <button className="text-xs text-white/60 hover:text-white/80 transition-colors">
                          查看全部 {learningPaths.length} 个学习路径 →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
  );
}
