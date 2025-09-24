'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, HardDrive, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import CourseModuleList from '@/components/tutor/course-content/course-module-list';
import CourseLessonGrid from '@/components/tutor/course-content/course-lesson-grid';
import CreateCourseLesson from '@/components/tutor/course-content/create-course-lesson';
import { StorageDialog } from '@/components/tutor/storage/storage-dialog';
import { useSearchParams } from 'next/navigation';
import { useModuleByCourseId } from '@/hooks/course/use-course-module';
import { useCourse } from '@/hooks/course/use-courses';
import { useUser } from '@/hooks/profile/use-user';
import { useBanByTarget } from '@/hooks/ban/use-ban';
import { useUpdateCourseStatus } from '@/hooks/course/use-course-status';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CourseDetails() {
  const t = useTranslations('CourseDetails');
  const params = useSearchParams();
  const id = params.get('id');
  const courseId = id ? parseInt(id) : 0;
  const { data: courseModule, isLoading, error } = useModuleByCourseId(courseId);
  const { data: course } = useCourse(courseId || undefined);
  const [selectedModuleId, setSelectedModuleId] = useState<number | undefined>(undefined);
  const [selectedLessonId, setSelectedLessonId] = useState<number | undefined>();
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320); // Default width in pixels
  const { data: userData } = useUser();
  const userId = userData?.profile?.id || "0";
  
  // Get ban information if course status is 'ban'
  const { data: banInfo } = useBanByTarget('course', courseId);
  const activeBan = banInfo && banInfo.length > 0 ? banInfo[0] : null;

  // Hook for updating course status
  const updateCourseStatusMutation = useUpdateCourseStatus();

  // Handle acknowledgment of rejection
  const handleAcknowledgeRejection = () => {
    if (course?.id) {
      updateCourseStatusMutation.mutate({
        courseId: course.id,
        status: 'inactive'
      });
    }
  };

  const handleModuleSelect = (moduleId: number) => {
    setSelectedModuleId(moduleId);
    setSelectedLessonId(undefined); // Reset lesson selection when module changes
  };

  const handleLessonSelect = (lessonId: number) => {
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
                courseStatus={course?.status}
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
            <div className="flex items-center gap-2">
              {/* Storage Dialog Button */}
              <StorageDialog ownerId={parseInt(userId)}>
                <Button
                  variant="default"
                  size="sm"
                  className="border-border hover:bg-accent hover:text-accent-foreground"
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  {t('storage')}
                </Button>
              </StorageDialog>
              {course?.status === 'inactive' && selectedModuleId && (
                <CreateCourseLesson courseId={courseId} moduleId={selectedModuleId} courseStatus={course?.status} />
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Ban Information Alert */}
            {course?.status === 'ban' && activeBan && (
              <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <div className="space-y-2">
                    <div className="font-semibold">{t('courseBanned')}</div>
                    <div><strong>{t('reason')}:</strong> {activeBan.reason}</div>
                    {activeBan.expires_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span><strong>{t('expiresAt')}:</strong> {new Date(activeBan.expires_at).toLocaleString()}</span>
                      </div>
                    )}
                    {!activeBan.expires_at && (
                      <div className="text-red-900 dark:text-red-100 font-medium">{t('permanentBan')}</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Rejection Information Alert */}
            {course?.status === 'rejected' && course.rejected_message && (
              <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <div className="space-y-3">
                    <div className="font-semibold">{t('courseRejected')}</div>
                    <div><strong>{t('rejectionMessage')}:</strong> {course.rejected_message}</div>
                    <div className="pt-2">
                      <Button
                        onClick={handleAcknowledgeRejection}
                        disabled={updateCourseStatusMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-800/50"
                      >
                        {updateCourseStatusMutation.isPending ? t('acknowledgeRejection') : t('noted')}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {selectedModuleId ? (
              <CourseLessonGrid
                moduleId={selectedModuleId}
                courseId={courseId}
                onLessonSelect={handleLessonSelect}
                selectedLessonId={selectedLessonId}
                courseStatus={course?.status}
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