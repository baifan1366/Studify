'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, BookOpen, Clock, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import CreateCourseModule from './create-course-module';
import { useModuleByCourseId } from '@/hooks/course/use-course-module';
import { Module } from '@/interface/courses/module-interface';

// Extended interface for UI display
interface CourseModule extends Module {
  description?: string;
  lessonCount: number;
}

interface CourseModuleListProps {
  courseId: number;
  onModuleSelect?: (moduleId: number) => void;
  selectedModuleId?: number;
}

export default function CourseModuleList({ 
  courseId, 
  onModuleSelect,
  selectedModuleId
}: CourseModuleListProps) {
  const t = useTranslations('CourseModuleList');
  const { data: rawModules = [], isLoading, error } = useModuleByCourseId(courseId);
  
  // Transform API data to UI format
  const modules: CourseModule[] = useMemo(() => {
    return (rawModules as Module[]).map((module, index) => ({
      ...module,
      lessonCount: 5,
    }));
  }, [rawModules]);

  const handleModuleClick = (moduleId: number) => {
    onModuleSelect?.(moduleId);
  };


  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4 flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">{t('courseModules')}</h1>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
        
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 bg-transparent border-border">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <div className="flex items-center gap-4 mb-2">
              <Skeleton className="h-3 w-12" />
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
        <CreateCourseModule courseId={courseId} />
      </div>
      
      {modules.map((module) => (
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
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span>{module.lessonCount} {t('lessons')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {!isLoading && modules.length === 0 && (
        <div className="text-center py-8">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('noModulesFound')}</p>
        </div>
      )}
    </div>
  );
}