'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Play, Clock, CheckCircle, Circle, BookOpen, Star, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useLessonByCourseModuleId } from '@/hooks/course/use-course-lesson';
import { Lesson } from '@/interface/courses/lesson-interface';
import { useTranslations } from 'next-intl';

// Extended interface for UI display
interface CourseLesson extends Lesson {
  description?: string;
  duration: string;
  type: 'video' | 'reading' | 'quiz' | 'assignment';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isCompleted: boolean;
  isLocked: boolean;
  order: number;
  rating?: number;
}

interface CourseLessonGridProps {
  moduleId?: number;
  courseId?: number;
  onLessonSelect?: (lessonId: number) => void;
  selectedLessonId?: number;
}

type FilterType = 'all' | 'video' | 'reading' | 'quiz' | 'assignment';
type SortType = 'order' | 'duration' | 'difficulty' | 'completion';

export default function CourseLessonGrid({ 
  moduleId, 
  courseId,
  onLessonSelect,
  selectedLessonId
}: CourseLessonGridProps) {
  const t = useTranslations('CourseLessonGrid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('order');
  const [showCompleted, setShowCompleted] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Fetch lessons using the hook - only fetch if both IDs are available
  const { data: rawLessons = [], isLoading, error } = useLessonByCourseModuleId(
    courseId?.toString() || '',
    moduleId?.toString() || ''
  );
  
  // Transform API data to UI format
  const lessons: CourseLesson[] = useMemo(() => {
    return (rawLessons as Lesson[]).map((lesson, index) => ({
      ...lesson,
      description: `Lesson ${index + 1} content`,
      duration: lesson.duration_sec ? `${Math.ceil(lesson.duration_sec / 60)}m` : '15m',
      type: lesson.kind === 'video' ? 'video' : 
            lesson.kind === 'document' ? 'reading' : 
            lesson.kind === 'quiz' ? 'quiz' : 
            lesson.kind === 'assignment' ? 'assignment' : 'reading',
      difficulty: 'intermediate' as const,
      isCompleted: false,
      isLocked: false,
      order: index + 1,
      rating: 4.5
    }));
  }, [rawLessons]);


  const filteredAndSortedLessons = useMemo(() => {
    let filtered = lessons.filter((lesson: CourseLesson) => {
      const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (lesson.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || lesson.type === filterType;
      const matchesCompletion = showCompleted || !lesson.isCompleted;
      
      return matchesSearch && matchesType && matchesCompletion;
    });

    filtered.sort((a: CourseLesson, b: CourseLesson) => {
      switch (sortBy) {
        case 'order':
          return a.order - b.order;
        case 'duration':
          return parseInt(a.duration) - parseInt(b.duration);
        case 'difficulty':
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'completion':
          return Number(b.isCompleted) - Number(a.isCompleted);
        default:
          return 0;
      }
    });

    return filtered;
  }, [lessons, searchTerm, filterType, sortBy, showCompleted]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'reading': return <BookOpen className="h-4 w-4" />;
      case 'quiz': return <Circle className="h-4 w-4" />;
      case 'assignment': return <Star className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'intermediate': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 border-border">
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search lessons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 h-10 px-4 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm">{t('filters')}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
            </button>

            {/* Filter Dropdown */}
            {showFilters && (
              <div className="absolute top-12 right-0 z-10 w-64 p-4 bg-background border border-border rounded-lg shadow-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t('type')}</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">{t('allTypes')}</option>
                    <option value="video">{t('video')}</option>
                    <option value="reading">{t('reading')}</option>
                    <option value="quiz">{t('quiz')}</option>
                    <option value="assignment">{t('assignment')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t('sort_by')}</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="order">{t('sortByOrder')}</option>
                    <option value="duration">{t('sortByDuration')}</option>
                    <option value="difficulty">{t('sortByDifficulty')}</option>
                    <option value="completion">{t('sortByCompletion')}</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    {t('showCompleted')}
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Button */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex items-center gap-2 h-10 px-4 border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="text-sm">{t(viewMode === 'grid' ? 'list' : 'grid')}</span>
          </button>
        </div>
      </div>

      {/* Lessons Grid/List */}
      <div className={cn(
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-3"
      )}>
        {filteredAndSortedLessons.map((lesson: CourseLesson) => (
          <div
            key={lesson.id}
            className={cn(
              "border rounded-lg transition-all duration-200 cursor-pointer",
              "border-border hover:border-primary/50",
              "hover:shadow-sm dark:hover:shadow-primary/10",
              lesson.isLocked && "opacity-60",
              selectedLessonId === lesson.id && "ring-2 ring-primary ring-opacity-50 border-primary",
              viewMode === 'list' && "flex items-center gap-4 p-4"
            )}
            onClick={() => !lesson.isLocked && onLessonSelect?.(lesson.id)}
          >
            {viewMode === 'grid' ? (
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(lesson.type)}
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {lesson.type}
                    </span>
                  </div>
                  {lesson.isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : lesson.isLocked ? (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                  {lesson.title}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                  </div>
                  
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getDifficultyColor(lesson.difficulty)
                  )}>
                    {lesson.difficulty}
                  </span>
                </div>

                {lesson.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="text-xs text-muted-foreground">{lesson.rating}</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {lesson.isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : lesson.isLocked ? (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  
                  <div className="flex items-center gap-2">
                    {getTypeIcon(lesson.type)}
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {lesson.type}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground mb-1 truncate">
                    {lesson.title}
                  </h3>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                  </div>
                  
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getDifficultyColor(lesson.difficulty)
                  )}>
                    {lesson.difficulty}
                  </span>

                  {lesson.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs text-muted-foreground">{lesson.rating}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {!isLoading && filteredAndSortedLessons.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{t('no_lessons_found')}</h3>
          <p className="text-muted-foreground">
            {lessons.length === 0 ? 'No lessons available for this module' : 'Try adjusting your search or filter criteria'}
          </p>
        </div>
      )}
    </div>
  );
}