'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Play, Clock, CheckCircle, Circle, BookOpen, Star, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import CreateCourseLesson from './create-course-lesson';

interface CourseLesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'video' | 'reading' | 'quiz' | 'assignment';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isCompleted: boolean;
  isLocked: boolean;
  moduleId: string;
  order: number;
  rating?: number;
}

interface CourseLessonGridProps {
  moduleId?: string;
  lessons?: CourseLesson[];
  onLessonSelect?: (lessonId: string) => void;
  selectedLessonId?: string;
  isLoading?: boolean;
}

type FilterType = 'all' | 'video' | 'reading' | 'quiz' | 'assignment';
type SortType = 'order' | 'duration' | 'difficulty' | 'completion';

export default function CourseLessonGrid({ 
  moduleId, 
  lessons = [], 
  onLessonSelect,
  selectedLessonId,
  isLoading = false 
}: CourseLessonGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('order');
  const [showCompleted, setShowCompleted] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data for demonstration
  const mockLessons: CourseLesson[] = lessons.length > 0 ? lessons : [
    {
      id: '1',
      title: 'Introduction to React Hooks',
      description: 'Learn the fundamentals of React Hooks and how they revolutionize state management',
      duration: '15m',
      type: 'video',
      difficulty: 'beginner',
      isCompleted: true,
      isLocked: false,
      moduleId: moduleId || '1',
      order: 1,
      rating: 4.8
    },
    {
      id: '2',
      title: 'useState and useEffect Deep Dive',
      description: 'Master the most commonly used hooks with practical examples',
      duration: '25m',
      type: 'video',
      difficulty: 'intermediate',
      isCompleted: true,
      isLocked: false,
      moduleId: moduleId || '1',
      order: 2,
      rating: 4.9
    },
    {
      id: '3',
      title: 'Custom Hooks Best Practices',
      description: 'Learn how to create reusable custom hooks for your applications',
      duration: '20m',
      type: 'reading',
      difficulty: 'intermediate',
      isCompleted: false,
      isLocked: false,
      moduleId: moduleId || '1',
      order: 3,
      rating: 4.7
    },
    {
      id: '4',
      title: 'Hooks Quiz Challenge',
      description: 'Test your understanding of React Hooks concepts',
      duration: '10m',
      type: 'quiz',
      difficulty: 'intermediate',
      isCompleted: false,
      isLocked: false,
      moduleId: moduleId || '1',
      order: 4
    },
    {
      id: '5',
      title: 'Build a Todo App with Hooks',
      description: 'Apply your knowledge by building a complete application',
      duration: '45m',
      type: 'assignment',
      difficulty: 'advanced',
      isCompleted: false,
      isLocked: true,
      moduleId: moduleId || '1',
      order: 5
    },
    {
      id: '6',
      title: 'Advanced Hook Patterns',
      description: 'Explore advanced patterns and optimization techniques',
      duration: '30m',
      type: 'video',
      difficulty: 'advanced',
      isCompleted: false,
      isLocked: true,
      moduleId: moduleId || '1',
      order: 6
    }
  ];

  const filteredAndSortedLessons = useMemo(() => {
    let filtered = mockLessons.filter(lesson => {
      const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lesson.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || lesson.type === filterType;
      const matchesCompletion = showCompleted || !lesson.isCompleted;
      
      return matchesSearch && matchesType && matchesCompletion;
    });

    filtered.sort((a, b) => {
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
  }, [mockLessons, searchTerm, filterType, sortBy, showCompleted]);

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
              <span className="text-sm">Filters</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
            </button>

            {/* Filter Dropdown */}
            {showFilters && (
              <div className="absolute top-12 right-0 z-10 w-64 p-4 bg-background border border-border rounded-lg shadow-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Types</option>
                    <option value="video">Video</option>
                    <option value="reading">Reading</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="order">Order</option>
                    <option value="duration">Duration</option>
                    <option value="difficulty">Difficulty</option>
                    <option value="completion">Completion</option>
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
                    Show Completed Lessons
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
            <span className="text-sm">{viewMode === 'grid' ? 'List' : 'Grid'}</span>
          </button>
        </div>
      </div>

      {/* Lessons Grid/List */}
      <div className={cn(
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-3"
      )}>
        {filteredAndSortedLessons.map((lesson) => (
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

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {lesson.description}
                </p>

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
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {lesson.description}
                  </p>
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

      {filteredAndSortedLessons.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No lessons found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}