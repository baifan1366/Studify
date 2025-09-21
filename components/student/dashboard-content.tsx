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
  MessageSquare
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useFullProfile } from '@/hooks/profile/use-profile';
import { useDashboard, RecentCourse, UpcomingEvent } from '@/hooks/dashboard/use-dashboard';
import AnimatedBackground from '@/components/ui/animated-background';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardContent() {
  const t = useTranslations('Dashboard');
  const { data: userData } = useUser();
  const { data: fullProfileData, isLoading: profileLoading } = useFullProfile();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();

  const user = userData;
  const profile = fullProfileData?.profile || user?.profile;

  if (profileLoading || dashboardLoading) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen p-6">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="w-full h-96" />
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  // Fallback data if dashboard data is not available
  const stats = dashboardData?.stats || {
    coursesEnrolled: 0,
    coursesCompleted: 0,
    totalStudyTime: 0,
    currentStreak: 0,
    points: profile?.points || 0
  };

  const recentCourses = dashboardData?.recentCourses || [];
  const upcomingEvents = dashboardData?.upcomingEvents || [];

  return (
    <AnimatedBackground>
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
              { label: 'Courses Enrolled', value: stats.coursesEnrolled, icon: BookOpen, color: 'blue' },
              { label: 'Completed', value: stats.coursesCompleted, icon: Award, color: 'green' },
              { label: 'Study Hours', value: `${stats.totalStudyTime}h`, icon: Clock, color: 'purple' },
              { label: 'Current Streak', value: `${stats.currentStreak} days`, icon: TrendingUp, color: 'orange' },
              { label: 'Points', value: stats.points, icon: Star, color: 'yellow' }
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon size={24} className={`text-${stat.color}-400`} />
                </div>
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
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award size={18} />
                  Achievements
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🎓</span>
                      <div>
                        <h4 className="font-medium text-white text-sm">First Course Completed</h4>
                        <p className="text-xs text-white/60">Complete your first course</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🔥</span>
                      <div>
                        <h4 className="font-medium text-white text-sm">Week Warrior</h4>
                        <p className="text-xs text-white/60">Study for 7 consecutive days</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🤝</span>
                      <div>
                        <h4 className="font-medium text-white/50 text-sm">Community Helper</h4>
                        <p className="text-xs text-white/40">Help 10 fellow students</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
