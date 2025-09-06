'use client';

import { useState } from 'react';
import { ChevronRight, BookOpen, Clock, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import CreateCourseModule from './create-course-module';

interface CourseModule {
  id: string;
  title: string;
  description: string;
  lessonCount: number;
  duration: string;
  isCompleted: boolean;
  progress: number;
}

interface CourseModuleListProps {
  courseId: string;
  modules?: CourseModule[];
  onModuleSelect?: (moduleId: string) => void;
  selectedModuleId?: string;
  isLoading?: boolean;
}

export default function CourseModuleList({ 
  courseId, 
  modules = [], 
  onModuleSelect,
  selectedModuleId,
  isLoading = false 
}: CourseModuleListProps) {
  const t = useTranslations('CourseModuleList');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleModuleClick = (moduleId: string) => {
    onModuleSelect?.(moduleId);
    toggleModule(moduleId);
  };

  // Mock data for demonstration
  const mockModules: CourseModule[] = modules.length > 0 ? modules : [
    {
      id: '1',
      title: 'Introduction to Course',
      description: 'Get started with the fundamentals',
      lessonCount: 5,
      duration: '2h 30m',
      isCompleted: true,
      progress: 100
    },
    {
      id: '2',
      title: 'Core Concepts',
      description: 'Deep dive into essential topics',
      lessonCount: 8,
      duration: '4h 15m',
      isCompleted: false,
      progress: 60
    },
    {
      id: '3',
      title: 'Advanced Topics',
      description: 'Master complex subjects',
      lessonCount: 12,
      duration: '6h 45m',
      isCompleted: false,
      progress: 25
    },
    {
      id: '4',
      title: 'Final Project',
      description: 'Apply your knowledge',
      lessonCount: 3,
      duration: '3h 00m',
      isCompleted: false,
      progress: 0
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t('courseModules')}</h2>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <div className="flex items-center gap-4 mb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between mb-4 flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">{t('courseModules')}</h1>
        </div>
        <CreateCourseModule />
      </div>
      
      {mockModules.map((module) => (
        <div
          key={module.id}
          className={cn(
            "border rounded-lg transition-all duration-200",
            "border-border hover:border-primary/50",
            "hover:shadow-sm dark:hover:shadow-primary/10",
            selectedModuleId === module.id && "ring-2 ring-primary ring-opacity-50 border-primary"
          )}
        >
          <div
            className={cn(
              "p-4 cursor-pointer flex items-center justify-between",
              "hover:bg-accent/30 dark:hover:bg-accent/20 transition-colors duration-200"
            )}
            onClick={() => handleModuleClick(module.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground truncate">
                  {module.title}
                </h3>
                {module.isCompleted && (
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {module.description}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span>{module.lessonCount} {t('lessons')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{module.duration}</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('progress')}</span>
                  <span>{module.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${module.progress}%` }}
                  />
                </div>
              </div>
            </div>
            
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2",
                expandedModules.has(module.id) && "rotate-90"
              )}
            />
          </div>
          
          {/* Expanded content */}
          {expandedModules.has(module.id) && (
            <div className="px-4 pb-4 border-t border-border">
              <div className="pt-3 space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('moduleDetails')}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-foreground">{t('status')}:</span>
                    <span className={cn(
                      "ml-2",
                      module.isCompleted ? "text-green-600" : "text-orange-600"
                    )}>
                      {module.isCompleted ? t('completed') : t('inProgress')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{t('duration')}:</span>
                    <span className="ml-2 text-muted-foreground">{module.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}