'use client';

import React, { useState, useEffect } from 'react';
import { useUpdateStudentStatus, useEnrollmentById } from '@/hooks/students/use-student';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Enrollment } from '@/interface/courses/enrollment-interface';
import { Profile } from '@/interface/user/profile-interface';
import { Course } from '@/interface/courses/course-interface';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Save,
  RotateCcw,
  Info,
  Edit
} from 'lucide-react';

// Using the actual enrollment status from the interface
type EnrollmentStatus = Enrollment['status'];

interface StudentWithProfile extends Enrollment {
  student_profile?: Profile;
  course?: Course;
  progress?: number;
}

interface EditStudentStatusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  courseId?: string;
  onSave?: (status: EnrollmentStatus) => void;
}

const statusConfig: Record<EnrollmentStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
  severity: 'low' | 'medium' | 'high';
}> = {
  active: {
    label: 'Active',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: <CheckCircle size={16} />,
    description: 'Student has full access to course materials and can participate in all activities',
    severity: 'low'
  },
  completed: {
    label: 'Completed',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: <CheckCircle size={16} />,
    description: 'Student has successfully completed the course with all requirements met',
    severity: 'low'
  },
  dropped: {
    label: 'Dropped',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
    icon: <XCircle size={16} />,
    description: 'Student has dropped out of the course',
    severity: 'high'
  },
  locked: {
    label: 'Locked',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: <XCircle size={16} />,
    description: 'Student access is restricted due to policy violations or non-payment',
    severity: 'high'
  }
};

export default function EditStudentStatus({ 
  open,
  onOpenChange,
  studentId,
  courseId,
  onSave 
}: EditStudentStatusProps) {
  const t = useTranslations('EditStudentStatus');
  const { toast } = useToast();
  const { mutateAsync: updateStatus, isPending } = useUpdateStudentStatus();

  // State management
  const [selectedStatus, setSelectedStatus] = useState<EnrollmentStatus>('active');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch enrollment data using real API
  const { 
    data: student, 
    isLoading, 
    error 
  } = useEnrollmentById(
    studentId ? parseInt(studentId) : 0,
    courseId ? parseInt(courseId) : 0
  );

  // Initialize selected status when student data loads
  useEffect(() => {
    if (student && student.status) {
      setSelectedStatus(student.status);
    }
  }, [student]);

  // Track changes
  useEffect(() => {
    if (student) {
      setHasChanges(selectedStatus !== student.status);
    }
  }, [selectedStatus, student]);

  const handleStatusChange = (newStatus: EnrollmentStatus) => {
    setSelectedStatus(newStatus);
  };

  const handleSave = async () => {
    if (!student || !hasChanges) return;

    const config = statusConfig[selectedStatus];
    if (config.severity === 'high') {
      setIsConfirmDialogOpen(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    if (!student) return;

    try {
      await updateStatus({
        courseId: student.course_id,
        studentId: student.user_id,  // Use user_id instead of enrollment id
        status: selectedStatus
      });

      // Reset local state
      setHasChanges(false);
      
      // Callback for parent component
      onSave?.(selectedStatus);
      
      // Close dialog
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: t('update_failed'),
        description: t('update_failed_desc'),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm(t('unsaved_changes_warning'))) {
        setSelectedStatus(student?.status || 'active');
        setHasChanges(false);
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    if (student) {
      setSelectedStatus(student.status);
      setHasChanges(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedStatus('active');
      setHasChanges(false);
    }
  }, [open]);

  const currentConfig = statusConfig[selectedStatus];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={20} />
              {t('edit_student_status')}
            </DialogTitle>
            <DialogDescription>
              {student ? 
                t('edit_student_status_desc', { name: student.student_profile?.display_name || student.student_profile?.full_name || 'Student' }) :
                t('loading_student_data')
              }
            </DialogDescription>
          </DialogHeader>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-6 py-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* Error state */}
          {!isLoading && (error || !student) && (
            <div className="flex flex-col items-center justify-center py-12">
              <XCircle size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {error ? t('error_loading_student') : t('student_not_found')}
              </h3>
              <p className="text-muted-foreground text-center mb-6">
                {error ? t('error_loading_student_desc') : t('student_not_found_desc')}
              </p>
              {error && (
                <Button variant="outline" onClick={() => window.location.reload()}>
                  {t('retry')}
                </Button>
              )}
            </div>
          )}

          {/* Main Content */}
          {!isLoading && student && (
            <div className="space-y-6">
              {/* Student Profile Card */}
              <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={20} />
                  {t('student_information')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={student.student_profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {(student.student_profile?.display_name || student.student_profile?.full_name || 'U')
                          .split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-foreground">
                        {student.student_profile?.display_name || student.student_profile?.full_name || 'Unknown Student'}
                      </h3>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail size={14} />
                        <span className="text-sm">{student.student_profile?.email || 'No email'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('enrolled_course')}
                      </div>
                      <Badge variant="outline" className="justify-start">
                        <BookOpen size={12} className="mr-1" />
                        {student.course?.title || 'Unknown Course'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('current_status')}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`justify-start ${statusConfig[student.status]?.color || 'text-gray-600'}`}
                      >
                        {statusConfig[student.status]?.icon}
                        <span className="ml-1">{t(`status_${student.status}`)}</span>
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('enrollment_date')}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar size={14} />
                        {new Date(student.started_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('progress')}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{student.progress}%</div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>

              {/* Status Change Section */}
              <Card className="bg-transparent p-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw size={20} />
                  {t('change_enrollment_status')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    {t('new_status')}
                  </label>
                  <Select value={selectedStatus} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <span className={config.color}>
                              {config.icon}
                            </span>
                            <span>{t(`status_${status}`)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Preview */}
                {selectedStatus && (
                  <Alert className={currentConfig.bgColor}>
                    <div className={currentConfig.color}>
                      {currentConfig.icon}
                    </div>
                    <AlertDescription className="ml-2">
                      <div className="space-y-2">
                        <div className="font-medium">
                          {t(`status_${selectedStatus}`)}
                        </div>
                        <div className="text-sm">
                          {t(`status_${selectedStatus}_desc`)}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warning for High Severity Changes */}
                {currentConfig.severity === 'high' && hasChanges && (
                  <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                    <AlertTriangle className="text-amber-600 dark:text-amber-400" size={16} />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <div className="font-medium mb-1">{t('important_notice')}</div>
                      <div className="text-sm">{t('high_severity_warning')}</div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dialog Footer with Action Buttons */}
        {!isLoading && student && (
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <RotateCcw size={16} />
              {t('reset_changes')}
            </Button>
            
            <Button 
              variant="ghost"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <XCircle size={16} />
              {t('cancel')}
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || isPending}
              className="flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {t('save_changes')}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              {t('confirm_status_change')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_status_change_desc', {
                name: student?.student_profile?.display_name || student?.student_profile?.full_name || 'Student',
                status: t(`status_${selectedStatus}`)
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={performSave}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {t('confirm_change')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
