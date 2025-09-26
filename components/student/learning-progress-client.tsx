'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayCircle, 
  Clock, 
  BookOpen,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  MoreVertical,
  CheckCircle2,
  Pause,
  RotateCcw
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useContinueWatching, useContinueWatchingActions } from '@/hooks/learning/use-learning-progress';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LearningProgressClientProps {
  type?: string;
}

type FilterType = 'all' | 'in-progress' | 'completed' | 'not-started';
type SortType = 'recent' | 'progress' | 'duration' | 'alphabetical';

export default function LearningProgressClient({ type }: LearningProgressClientProps) {
  const t = useTranslations('LearningProgress');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: continueWatchingItems, isLoading: continueWatchingLoading } = useContinueWatching();
  const { generateContinueWatchingUrl, formatProgress, formatTimeRemaining, formatLastAccessed } = useContinueWatchingActions();

  // Filter and sort items
  const filteredAndSortedItems = React.useMemo(() => {
    if (!continueWatchingItems) return [];

    let filtered = continueWatchingItems;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.lesson_title.toLowerCase().includes(query) ||
        item.course_title.toLowerCase().includes(query) ||
        item.module_title.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(item => {
        if (filter === 'in-progress') return item.progress_pct > 0 && item.progress_pct < 100;
        if (filter === 'completed') return item.progress_pct >= 100;
        if (filter === 'not-started') return item.progress_pct === 0;
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime();
        case 'progress':
          return b.progress_pct - a.progress_pct;
        case 'duration':
          return b.video_duration_sec - a.video_duration_sec;
        case 'alphabetical':
          return a.lesson_title.localeCompare(b.lesson_title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [continueWatchingItems, filter, sortBy, searchQuery]);

  const getProgressIcon = (progress: number) => {
    if (progress >= 100) return <CheckCircle2 size={20} className="text-green-500" />;
    if (progress > 0) return <Pause size={20} className="text-orange-500" />;
    return <PlayCircle size={20} className="text-blue-500" />;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'from-green-400 to-green-600';
    if (progress > 0) return 'from-orange-400 to-red-500';
    return 'from-blue-400 to-purple-500';
  };

  const getStatusBadge = (progress: number) => {
    if (progress >= 100) return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">{t('completed')}</Badge>;
    if (progress > 0) return <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">{t('in_progress')}</Badge>;
    return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{t('not_started')}</Badge>;
  };

  if (continueWatchingLoading) {
    return (
      <div className="min-h-screen p-6 pb-32">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    );
  }

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {type === 'continue-watching' ? t('continue_watching') : t('learning_progress')}
              </h1>
              <p className="text-white/70">
                {type === 'continue-watching' ? t('continue_watching_subtitle') : t('track_your_learning_journey')}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw size={16} className="mr-2" />
                {t('refresh')}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { 
                label: t('total_lessons'), 
                value: filteredAndSortedItems.length, 
                icon: BookOpen, 
                color: 'blue' 
              },
              { 
                label: t('in_progress'), 
                value: filteredAndSortedItems.filter(item => item.progress_pct > 0 && item.progress_pct < 100).length, 
                icon: Pause, 
                color: 'orange' 
              },
              { 
                label: t('completed'), 
                value: filteredAndSortedItems.filter(item => item.progress_pct >= 100).length, 
                icon: CheckCircle2, 
                color: 'green' 
              },
              { 
                label: t('total_time'), 
                value: `${Math.round(filteredAndSortedItems.reduce((sum, item) => sum + item.video_duration_sec, 0) / 3600)}h`, 
                icon: Clock, 
                color: 'purple' 
              }
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm p-6 hover:from-white/15 hover:to-white/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white/70 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon size={24} className={`text-${stat.color}-400`} />
                </div>
              </div>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
              <Input
                placeholder={t('search_lessons')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
              />
            </div>
            
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_lessons')}</SelectItem>
                <SelectItem value="in-progress">{t('in_progress')}</SelectItem>
                <SelectItem value="completed">{t('completed')}</SelectItem>
                <SelectItem value="not-started">{t('not_started')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                <TrendingUp size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('sort_recent')}</SelectItem>
                <SelectItem value="progress">{t('sort_progress')}</SelectItem>
                <SelectItem value="duration">{t('sort_duration')}</SelectItem>
                <SelectItem value="alphabetical">{t('sort_alphabetical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Learning Progress List */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={64} className="text-white/30 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-2">
                {searchQuery ? t('no_results_found') : t('no_learning_progress')}
              </h3>
              <p className="text-white/60 mb-6">
                {searchQuery ? t('try_different_search') : t('start_learning_to_see_progress')}
              </p>
              {!searchQuery && (
                <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <Link href="/courses">
                    {t('browse_courses')}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            filteredAndSortedItems.map((item, index) => (
              <motion.div
                key={`${item.course_slug}-${item.lesson_public_id}`}
                className="relative bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm p-6 hover:from-white/15 hover:to-white/10 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
              >
                <Link href={generateContinueWatchingUrl(item)} className="block">
                  <div className="flex items-start gap-6">
                    {/* Thumbnail */}
                    <div className="relative w-32 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.course_thumbnail ? (
                        <img
                          src={item.course_thumbnail}
                          alt={item.course_title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlayCircle size={24} className="text-white/50" />
                      )}
                      
                      {/* Progress overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
                        <div 
                          className={`h-full bg-gradient-to-r ${getProgressColor(item.progress_pct)} transition-all duration-300`}
                          style={{ width: `${item.progress_pct}%` }}
                        />
                      </div>
                      
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        {getProgressIcon(item.progress_pct)}
                      </div>
                    </div>
                    
                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-lg mb-1 truncate">
                            {item.lesson_title}
                          </h3>
                          <p className="text-white/60 text-sm truncate">
                            {item.course_title}
                          </p>
                          <p className="text-white/50 text-xs">
                            {item.module_title}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {getStatusBadge(item.progress_pct)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:text-white">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <PlayCircle size={16} className="mr-2" />
                                {t('continue_lesson')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <RotateCcw size={16} className="mr-2" />
                                {t('restart_lesson')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <BookOpen size={16} className="mr-2" />
                                {t('view_course')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-white/70">
                            {formatProgress(item.progress_pct)} {t('complete')}
                          </span>
                          <span className="text-xs text-white/50">
                            {formatTimeRemaining(item.progress_pct, item.video_duration_sec)}
                          </span>
                        </div>
                        <Progress value={item.progress_pct} className="h-2" />
                      </div>
                      
                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-xs text-white/50">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {Math.ceil(item.video_duration_sec / 60)} {t('minutes')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {t('last_watched')}: {formatLastAccessed(item.last_accessed_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
