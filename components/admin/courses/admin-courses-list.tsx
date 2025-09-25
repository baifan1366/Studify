'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  BookOpen,
  Users,
  Star,
  Clock,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  PlayCircle,
  FileText,
} from 'lucide-react';
import { useAdminCourses, useApproveCourse, useRejectCourse } from '@/hooks/admin/use-admin-courses';
import { useCourse } from '@/hooks/course/use-courses';
import { useModuleByCourseId } from '@/hooks/course/use-course-module';
import { useFormat } from '@/hooks/use-format';
import { useTranslations } from 'next-intl';
import type { AdminCourse, AdminCourseFilters } from '@/interface/admin/admin-interface';

const statusColors = {
  active: 'default',
  pending: 'secondary',
  inactive: 'outline',
} as const;

const levelColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
} as const;

export default function AdminCoursesList() {
  const t = useTranslations('AdminCoursesList');
  const [filters, setFilters] = useState<AdminCourseFilters>({
    page: 1,
    limit: 20,
    status: 'all',
    category: 'all',
  });
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { formatNumber, formatPrice: formatCurrency } = useFormat();
  const { data: coursesData, isLoading, error } = useAdminCourses(filters);
  const approveCourse = useApproveCourse();
  const rejectCourse = useRejectCourse();
  
  // Course preview data
  const { data: courseDetails } = useCourse(selectedCourse?.id);
  const { data: courseModules } = useModuleByCourseId(selectedCourse?.id || 0);

  const handleFilterChange = (key: keyof AdminCourseFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'page' ? (typeof value === 'string' ? parseInt(value) || 1 : value) : value,
    }));
  };


  const handleApprove = async () => {
    if (!selectedCourse) return;
    await approveCourse.mutateAsync({
      courseId: selectedCourse.public_id,
      notes: approvalNotes
    });
    setShowApprovalDialog(false);
    setApprovalNotes('');
    setSelectedCourse(null);
  };

  const handleReject = async () => {
    if (!selectedCourse || !rejectionReason) return;
    await rejectCourse.mutateAsync({
      courseId: selectedCourse.public_id,
      rejected_message: rejectionReason
    });
    setShowRejectionDialog(false);
    setRejectionReason('');
    setSelectedCourse(null);
  };

  const handlePreview = (course: AdminCourse) => {
    setSelectedCourse(course);
    setShowPreviewDialog(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (isLoading) {
    return (
      <Card className="bg-transparent p-2">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-transparent p-2">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <BookOpen className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('failed_to_load_courses')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('page_title')}</h2>
        <p className="text-muted-foreground">
          {t('page_subtitle')}
        </p>
      </div>

      {/* Compact Filters */}
      <div className="flex items-center gap-4 bg-transparent border rounded-lg p-4">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder={t('search_courses_placeholder')}
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              {t('filters')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">{t('status')}</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('all_statuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_statuses')}</SelectItem>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-filter">{t('category')}</Label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) => handleFilterChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('all_categories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_categories')}</SelectItem>
                    <SelectItem value="programming">{t('programming')}</SelectItem>
                    <SelectItem value="design">{t('design')}</SelectItem>
                    <SelectItem value="business">{t('business')}</SelectItem>
                    <SelectItem value="marketing">{t('marketing')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit-filter">{t('per_page')}</Label>
              <Select
                value={filters.limit?.toString() || '20'}
                onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setFilters({
                page: 1,
                limit: 20,
                status: 'all',
                category: 'all',
                search: ''
              })}
            >
              {t('clear_filters')}
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Courses Table */}
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>{t('courses_count', { count: coursesData?.pagination.total || 0 })}</CardTitle>
          <CardDescription>
            {t('review_manage_courses')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coursesData?.courses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('no_courses_found')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('course')}</TableHead>
                    <TableHead>{t('instructor')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('students')}</TableHead>
                    <TableHead>{t('price')}</TableHead>
                    <TableHead>{t('rating')}</TableHead>
                    <TableHead>{t('created')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coursesData?.courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <BookOpen className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={levelColors[course.level]}>
                                {course.level}
                              </Badge>
                              {course.category && (
                                <span className="text-xs text-muted-foreground">
                                  {course.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {t('lessons_count', { count: course.total_lessons })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(course.total_duration_minutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-3 w-3" />
                          </div>
                          <span className="text-sm">
                            {course.profiles.display_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[course.status]}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{course.total_students}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatCurrency(course.price_cents, course.currency, course.is_free)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{course.average_rating ? formatNumber(course.average_rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : t('n_a')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(course.created_at), 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handlePreview(course)}
                            aria-label={t('preview_course')}
                            title={t('preview_course')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {course.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setShowApprovalDialog(true);
                                }}
                                aria-label={t('approve_course')}
                                title={t('approve_course')}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setShowRejectionDialog(true);
                                }}
                                aria-label={t('reject_course')}
                                title={t('reject_course')}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {coursesData && coursesData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('showing_entries', {
                      from: ((coursesData.pagination.page - 1) * coursesData.pagination.limit) + 1,
                      to: Math.min(coursesData.pagination.page * coursesData.pagination.limit, coursesData.pagination.total),
                      total: coursesData.pagination.total
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', Math.max(1, (filters.page || 1) - 1))}
                      disabled={!filters.page || filters.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('previous')}
                    </Button>
                    <span className="text-sm">
                      {t('page_of', { current: filters.page || 1, total: coursesData.pagination.totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                      disabled={!filters.page || filters.page >= coursesData.pagination.totalPages}
                    >
                      {t('next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approve_course_title')}</DialogTitle>
            <DialogDescription>
              {t('approve_course_desc', { title: selectedCourse?.title || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-notes">{t('approval_notes')}</Label>
              <Textarea
                id="approval-notes"
                placeholder={t('approval_notes_placeholder')}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={approveCourse.isPending}
              >
                {approveCourse.isPending ? t('approving') : t('approve')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reject_course_title')}</DialogTitle>
            <DialogDescription>
              {t('reject_course_desc', { title: selectedCourse?.title || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">{t('rejection_reason_required')}</Label>
              <Textarea
                id="rejection-reason"
                placeholder={t('rejection_reason_placeholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectCourse.isPending}
              >
                {rejectCourse.isPending ? t('rejecting') : t('reject')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('course_preview')}
            </DialogTitle>
            <DialogDescription>
              {t('course_preview_desc')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="space-y-6">
              {/* Course Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedCourse.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCourse.description || t('no_description')}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge className={levelColors[selectedCourse.level]}>
                      {selectedCourse.level}
                    </Badge>
                    {selectedCourse.category && (
                      <Badge variant="outline">
                        {selectedCourse.category}
                      </Badge>
                    )}
                    <Badge variant={statusColors[selectedCourse.status]}>
                      {selectedCourse.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{t('students')}: {selectedCourse.total_students}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{t('lessons_count', { count: selectedCourse.total_lessons })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(selectedCourse.total_duration_minutes)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(selectedCourse.price_cents, selectedCourse.currency, selectedCourse.is_free)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedCourse.thumbnail_url && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selectedCourse.thumbnail_url}
                        alt={selectedCourse.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">{t('instructor')}</h4>
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedCourse.profiles.display_name}</p>
                        <p className="text-xs text-muted-foreground">{t('course_instructor')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Modules */}
              {courseModules && courseModules.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('course_modules')} ({courseModules.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {courseModules.map((module, index) => (
                      <div key={module.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">
                              {index + 1}. {module.title}
                            </h5>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {module.lessons?.length || 0} {t('lessons')}
                          </Badge>
                        </div>
                        
                        {module.lessons && module.lessons.length > 0 && (
                          <div className="mt-2 pl-4 space-y-1">
                            {module.lessons.slice(0, 3).map((lesson, lessonIndex) => (
                              <div key={lesson.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <PlayCircle className="h-3 w-3" />
                                <span>{lessonIndex + 1}. {lesson.title}</span>
                              </div>
                            ))}
                            {module.lessons.length > 3 && (
                              <p className="text-xs text-muted-foreground pl-5">
                                +{module.lessons.length - 3} {t('more_lessons')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                  {t('close')}
                </Button>
                {selectedCourse.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        setShowPreviewDialog(false);
                        setShowApprovalDialog(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('approve')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowPreviewDialog(false);
                        setShowRejectionDialog(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('reject')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
