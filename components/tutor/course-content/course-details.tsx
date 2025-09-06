'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import CourseModuleList from '@/components/tutor/course-content/course-module-list';
import CourseLessonGrid from '@/components/tutor/course-content/course-lesson-grid';
import CreateCourseLesson from '@/components/tutor/course-content/create-course-lesson';

interface CourseDetailsProps {
  courseId?: string;
}

export default function CourseDetails({ courseId = '1' }: CourseDetailsProps) {
  const t = useTranslations('CourseDetails');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('1');
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>();
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320); // Default width in pixels

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(undefined); // Reset lesson selection when module changes
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId);
  };

  const toggleLeftPanel = () => {
    setIsLeftPanelCollapsed(!isLeftPanelCollapsed);
  };

  return (
    <div className="h-full flex bg-transparent border-border rounded-lg">
      {/* Left Panel - Course Modules */}
      <div
        className={cn(
          "relative border-r border-border bg-transparent transition-all duration-300 ease-in-out flex-shrink-0",
          isLeftPanelCollapsed ? "w-0" : "w-80 min-w-[280px] max-w-[400px]"
        )}
        style={{
          width: isLeftPanelCollapsed ? 0 : `${leftPanelWidth}px`
        }}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={toggleLeftPanel}
          className={cn(
            "absolute -right-3 top-4 z-10 w-6 h-6 rounded-full border border-border bg-transparent shadow-md",
            "flex items-center justify-center hover:bg-transparent transition-colors duration-200",
            "text-muted-foreground hover:text-foreground"
          )}
          title={isLeftPanelCollapsed ? t('expandModulesPanel') : t('collapseModulesPanel')}
        >
          {isLeftPanelCollapsed ? (
            <PanelLeftOpen className="h-3 w-3" />
          ) : (
            <PanelLeftClose className="h-3 w-3" />
          )}
        </button>

        {/* Panel Content */}
        <div
          className={cn(
            "h-full overflow-hidden transition-opacity duration-300",
            isLeftPanelCollapsed ? "opacity-0" : "opacity-100"
          )}
        >
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <CourseModuleList
                courseId={courseId}
                onModuleSelect={handleModuleSelect}
                selectedModuleId={selectedModuleId}
              />
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        {!isLeftPanelCollapsed && (
          <div
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-primary/20 transition-colors duration-200 group"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = leftPanelWidth;

              const handleMouseMove = (e: MouseEvent) => {
                const newWidth = Math.max(280, Math.min(500, startWidth + (e.clientX - startX)));
                setLeftPanelWidth(newWidth);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className="w-0.5 h-full bg-border group-hover:bg-primary transition-colors duration-200 ml-0.25" />
          </div>
        )}
      </div>

      {/* Right Panel - Course Lessons */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-transparent px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLeftPanelCollapsed && (
                <button
                  onClick={toggleLeftPanel}
                  className="p-2 rounded-lg hover:bg-transparent transition-colors duration-200 text-muted-foreground hover:text-foreground"
                  title={t('showModulesPanel')}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              )}
              
              <div>
                <h1 className="text-xl font-bold text-foreground">{t('courseLessons')}</h1>
                <p className="text-sm text-muted-foreground">
                  {selectedModuleId ? t('moduleXLessons', { moduleId: selectedModuleId }) : t('selectModuleToViewLessons')}
                </p>
              </div>
             
            </div> 
            <CreateCourseLesson />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {selectedModuleId ? (
              <CourseLessonGrid
                moduleId={selectedModuleId}
                onLessonSelect={handleLessonSelect}
                selectedLessonId={selectedLessonId}
                isLoading={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ChevronLeft className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t('selectModule')}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {t('chooseModuleFromLeft')}
                </p>
                {isLeftPanelCollapsed && (
                  <button
                    onClick={toggleLeftPanel}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200"
                  >
                    {t('showModules')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}