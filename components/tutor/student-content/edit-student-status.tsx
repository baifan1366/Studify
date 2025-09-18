'use client';

import React, { useState, useEffect } from 'react';
import { useUpdateStudentStatus } from '@/hooks/students/use-student';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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
  Clock,
  ArrowLeft,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';

// Using the actual enrollment status from the interface
type EnrollmentStatus = Enrollment['status'];

interface StudentWithProfile extends Enrollment {
  student_profile?: Profile;
  course?: Course;
  progress?: number;
}

interface EditStudentStatusProps {
  studentId: string;
  onClose?: () => void;
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
  studentId, 
  onClose, 
  onSave 
}: EditStudentStatusProps) {
  const t = useTranslations('EditStudentStatus');
  const router = useRouter();
  const { toast } = useToast();
  const { mutateAsync: updateStatus, isPending } = useUpdateStudentStatus();

  // State management
  const [student, setStudent] = useState<StudentWithProfile | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EnrollmentStatus>('active');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Mock student data - replace with actual API call
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockStudent: StudentWithProfile = {
          id: Number(studentId),
          public_id: `pub_${studentId}`,
          course_id: 1,
          user_id: 123,
          role: 'student',
          status: 'active',
          started_at: '2024-01-15T00:00:00Z',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
          progress: 75,
          student_profile: {
            id: 123,
            public_id: 'prof_123',
            user_id: 'user_123',
            display_name: 'John Doe',
            full_name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'student',
            avatar_url: null,
            bio: null,
            timezone: 'UTC',
            status: 'active',
            banned_reason: null,
            banned_at: null,
            points: 0,
            onboarded: true,
            onboard_step: 0,
            is_deleted: false,
            preferences: '{}',
            theme: 'system',
            language: 'en',
            notification_settings: '{}',
            privacy_settings: '{}',
            two_factor_enabled: false,
            email_verified: true,
            profile_completion: 100,
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            last_login: '2024-09-17T00:00:00Z',
            deleted_at: null
          },
          course: {
            id: 1,
            public_id: 'course_123',
            owner_id: 1,
            title: 'Advanced React Development',
            description: 'Learn advanced React concepts',
            slug: 'advanced-react-development',
            visibility: 'public',
            price_cents: 9999,
            currency: 'USD',
            tags: ['react', 'javascript'],
            is_deleted: false,
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
            level: 'intermediate',
            category: 'Programming',
            language: 'en',
            total_lessons: 20,
            total_duration_minutes: 1200,
            requirements: ['Basic JavaScript knowledge'],
            learning_objectives: ['Master React hooks', 'Build complex applications'],
            average_rating: 4.5,
            total_students: 150,
            is_free: false,
            auto_create_classroom: true,
            auto_create_community: true,
            status: 'active'
          }
        };
        
        setStudent(mockStudent);
        setSelectedStatus(mockStudent.status);
      } catch (error) {
        toast({
          title: t('error'),
          description: t('failed_to_load_student'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [studentId, t, toast]);

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
        studentId: student.id,
        status: selectedStatus
      });

      toast({
        title: t('status_updated'),
        description: t('status_updated_desc', { 
          name: student.student_profile?.display_name || student.student_profile?.full_name || 'Student',
          status: t(`status_${selectedStatus}`)
        }),
      });

      // Update local state
      setStudent(prev => prev ? { ...prev, status: selectedStatus } : null);
      setHasChanges(false);
      
      // Callback for parent component
      onSave?.(selectedStatus);
      
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
        onClose?.();
      }
    } else {
      onClose?.();
    }
  };

  const handleReset = () => {
    if (student) {
      setSelectedStatus(student.status);
      setHasChanges(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('student_not_found')}
            </h3>
            <p className="text-muted-foreground text-center mb-6">
              {t('student_not_found_desc')}
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeft size={16} className="mr-2" />
              {t('go_back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentConfig = statusConfig[selectedStatus];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              {t('back')}
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {t('edit_student_status')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('edit_student_status_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Profile Card */}
            <Card>
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
            <Card>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('actions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleSave}
                  disabled={!hasChanges || isPending}
                  className="w-full flex items-center gap-2"
                  size="lg"
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
                
                <Button 
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="w-full flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  {t('reset_changes')}
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={handleCancel}
                  className="w-full flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  {t('cancel')}
                </Button>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info size={20} />
                  {t('status_information')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <div 
                      key={status}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedStatus === status 
                          ? config.bgColor + ' ring-2 ring-primary/20' 
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={config.color}>
                          {config.icon}
                        </span>
                        <span className="font-medium text-sm">
                          {t(`status_${status}`)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(`status_${status}_desc`)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
    </div>
  );
}