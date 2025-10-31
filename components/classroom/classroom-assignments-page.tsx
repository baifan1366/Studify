'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
import { useClassroomAssignments } from '@/hooks/classroom/use-classroom-assignments';
import { useClassroomMembers } from '@/hooks/classroom/use-update-classroom-member';
import { useSubmissions } from '@/hooks/classroom/use-submissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getCardStyling, getClassroomColor, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { CreateAssignmentDialog } from './Dialog/create-assignment-dialog';
import { SubmissionsSummary } from './submissions/submissions-summary';
import { StudentSubmissionSummary } from './submissions/student-submission-summary';

interface ClassroomAssignmentsPageProps {
  classroomSlug: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  submissions_count: number;
  total_students: number;
}

export function ClassroomAssignmentsPage({ classroomSlug }: ClassroomAssignmentsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('ClassroomAssignments');
  const { data: currentUser } = useUser();
  const [classroom, setClassroom] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showSubmissionsSummary, setShowSubmissionsSummary] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    total_points: 100,
    status: 'draft' as 'draft' | 'published' | 'closed'
  });

  // Get assignments data from API
  const { data: assignmentsResponse, isLoading: assignmentsLoading, error: assignmentsError } = useClassroomAssignments(classroomSlug);
  
  // Debug: log the data
  console.log('Assignments Response:', assignmentsResponse);
  console.log('Assignments Loading:', assignmentsLoading);
  console.log('Assignments Error:', assignmentsError);
  
  // Get classroom members to calculate total students
  const { data: membersData } = useClassroomMembers(classroomSlug);
  const totalStudents = React.useMemo(() => {
    const members = Array.isArray(membersData) ? membersData : membersData?.members || [];
    return members.filter((m: any) => m.role === 'student').length;
  }, [membersData]);

  // Convert API assignment data to match the local interface
  const assignments = assignmentsResponse?.assignments?.map(assignment => ({
    id: String(assignment.id),
    title: assignment.title,
    description: assignment.description || '',
    due_date: assignment.due_date,
    total_points: 100, // TODO: Add total_points field to API
    status: 'published' as 'draft' | 'published' | 'closed', // TODO: Add status field to API
    created_at: assignment.created_at,
    submissions_count: 0, // Will be updated below
    total_students: totalStudents
  })) || [];

  const { data: classroomsData } = useClassrooms();

  // State to store submissions count for each assignment
  const [submissionsCounts, setSubmissionsCounts] = React.useState<Record<string, number>>({});

  // Fetch submissions count for each assignment
  React.useEffect(() => {
    if (!assignments || assignments.length === 0) return;

    const fetchSubmissionsCounts = async () => {
      const counts: Record<string, number> = {};
      
      for (const assignment of assignments) {
        try {
          const response = await fetch(`/api/classroom/${classroomSlug}/submissions?assignment_id=${assignment.id}`);
          if (response.ok) {
            const data = await response.json();
            counts[assignment.id] = data.submissions?.length || 0;
          }
        } catch (error) {
          console.error(`Error fetching submissions for assignment ${assignment.id}:`, error);
          counts[assignment.id] = 0;
        }
      }
      
      setSubmissionsCounts(counts);
    };

    fetchSubmissionsCounts();
  }, [assignments?.length, classroomSlug]);

  // Update assignments with real submissions count
  const assignmentsWithCounts = React.useMemo(() => {
    return assignments.map(assignment => ({
      ...assignment,
      submissions_count: submissionsCounts[assignment.id] || 0
    }));
  }, [assignments, submissionsCounts]);

  useEffect(() => {
    if (classroomsData?.classrooms) {
      const foundClassroom = classroomsData.classrooms.find(c => c.slug === classroomSlug);
      setClassroom(foundClassroom);
    }
  }, [classroomsData, classroomSlug]);

  // Debug: Log classroom data to verify color
  useEffect(() => {
    if (classroom) {
      console.log('🎨 [AssignmentsPage] Classroom data:', {
        slug: classroom.slug,
        name: classroom.name,
        color: classroom.color,
        hasColor: !!classroom.color,
        rawClassroom: classroom
      });
    }
  }, [classroom]);

  const handleBack = () => {
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? `/tutor/classroom/${classroomSlug}`
      : `/classroom/${classroomSlug}`;
    router.push(route);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      total_points: 100,
      status: 'draft'
    });
    setEditingAssignment(null);
  };


  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      due_date: new Date(assignment.due_date).toISOString().slice(0, 16),
      total_points: assignment.total_points,
      status: assignment.status
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      // TODO: Implement actual API call for updating assignment
      // For now, just close the dialog
      toast({
        title: t('info'),
        description: t('update_functionality_coming'),
      });
      
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('failed_to_update'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      // TODO: Implement actual API call for deleting assignment
      toast({
        title: t('info'),
        description: t('delete_functionality_coming'),
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('failed_to_delete'),
        variant: "destructive",
      });
    }
  };

  const handleViewSubmissions = (assignmentId: string) => {
    // Toggle showing submissions summary for this assignment
    setShowSubmissionsSummary(showSubmissionsSummary === assignmentId ? null : assignmentId);
  };

  const handleViewFullSubmissions = (assignmentId: string) => {
    // Navigate to full submissions page
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? `/tutor/classroom/${classroomSlug}/assignment/${assignmentId}/submissions`
      : `/classroom/${classroomSlug}/assignment/${assignmentId}/submissions`;
    router.push(route);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'draft':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const canManageAssignments = classroom?.user_role === 'owner' || classroom?.user_role === 'tutor';

  // Get classroom color styling early for loading/error states
  // Use the same approach as classroom-dashboard.tsx
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');

  if (!classroom || assignmentsLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2" style={{ borderColor: classroomColor }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (assignmentsError) {
    return (
      <div className="min-h-screen" >
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">{t('error_loading', { message: assignmentsError.message })}</p>
              <Button onClick={() => window.location.reload()} style={{ backgroundColor: classroomColor }}>{t('retry')}</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const publishedAssignments = assignmentsWithCounts.filter(a => a.status === 'published');
  const draftAssignments = assignmentsWithCounts.filter(a => a.status === 'draft');
  const closedAssignments = assignmentsWithCounts.filter(a => a.status === 'closed');

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8">
        <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back_to_dashboard')}
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('assignments')}</h1>
            <p className="text-muted-foreground">
              {t('manage_assignments_for', { classroom: classroom.name })}
            </p>
          </div>
          {canManageAssignments && (
            <CreateAssignmentDialog
              classroomSlug={classroomSlug}
              onAssignmentCreated={() => {
                // Refresh assignments list after creation
                // You could trigger a data refetch here
                toast({
                  title: t('assignment_created'),
                  description: t('assignment_created_desc'),
                });
              }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_assignments')}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignmentsWithCounts.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('published')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{publishedAssignments.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('drafts')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{draftAssignments.length}</div>
            </CardContent>
          </Card>
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('avg_submission_rate')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {publishedAssignments.length > 0 && totalStudents > 0
                  ? Math.round(
                      (publishedAssignments.reduce((acc, a) => acc + a.submissions_count, 0) / 
                      (publishedAssignments.length * totalStudents)) * 100
                    )
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {publishedAssignments.reduce((acc, a) => acc + a.submissions_count, 0)} / {publishedAssignments.length * totalStudents} submissions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
          <CardHeader>
            <CardTitle>{t('all_assignments')}</CardTitle>
            <CardDescription>
              {t('view_and_manage_assignments')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignmentsWithCounts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{t('no_assignments_yet')}</h3>
                <p className="text-muted-foreground">
                  {canManageAssignments ? t('create_first_assignment') : t('no_assignments_created')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignmentsWithCounts.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-4 rounded-lg hover:shadow-md transition-shadow ${
                      isOverdue(assignment.due_date) && assignment.status === 'published' 
                        ? 'bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500 dark:border-l-red-600' 
                        : 'border-l-4'
                    }`}
                    style={{
                      borderLeftColor: isOverdue(assignment.due_date) && assignment.status === 'published' 
                        ? undefined // Let className handle it
                        : cardStyling.borderColor,
                      backgroundColor: isOverdue(assignment.due_date) && assignment.status === 'published' 
                        ? undefined // Let className handle it
                        : cardStyling.backgroundColor,
                      borderColor: cardStyling.borderColor
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(assignment.status)}
                          <h3 className="font-semibold">{assignment.title}</h3>
                          <Badge variant={getStatusBadgeVariant(assignment.status)}>
                            {assignment.status === 'draft' ? t('draft') : assignment.status === 'closed' ? t('closed') : t('published').toUpperCase()}
                          </Badge>
                          {isOverdue(assignment.due_date) && assignment.status === 'published' && (
                            <Badge variant="destructive">{t('overdue')}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{assignment.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('due')}:</span>
                            <p className="font-medium">
                              {new Date(assignment.due_date).toLocaleDateString()} at{' '}
                              {new Date(assignment.due_date).toLocaleTimeString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('points')}:</span>
                            <p className="font-medium">{assignment.total_points}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('submissions')}:</span>
                            <p className="font-medium">
                              {assignment.submissions_count}/{assignment.total_students}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('progress')}:</span>
                            <Progress 
                              value={(assignment.submissions_count / assignment.total_students) * 100} 
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {assignment.status === 'published' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSubmissions(assignment.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {showSubmissionsSummary === assignment.id ? t('hide_summary') : t('view_summary')}
                            </Button>
                            {currentUser?.profile?.role !== 'student' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFullSubmissions(assignment.id)}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                {t('submissions_button')}
                              </Button>
                            )}
                          </>
                        )}
                        {canManageAssignments && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAssignment(assignment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('edit_assignment')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('delete_assignment')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Submissions Summary - shows when expanded */}
                    {showSubmissionsSummary === assignment.id && (
                      <div className="mt-4 pt-4 border-t">
                        {classroom?.user_role === 'student' ? (
                          <StudentSubmissionSummary
                            assignmentId={parseInt(assignment.id)}
                            classroomSlug={classroomSlug}
                            dueDate={assignment.due_date}
                            assignmentTitle={assignment.title}
                            totalPoints={assignment.total_points}
                            classroomColor={classroom?.color}
                            onEditSubmission={() => {
                              // Navigate to assignment submission page
                              const isTutor = currentUser?.profile?.role === 'tutor';
                              const route = isTutor 
                                ? `/tutor/classroom/${classroomSlug}/assignment/${assignment.id}/submit`
                                : `/classroom/${classroomSlug}/assignment/${assignment.id}/submit`;
                              router.push(route);
                            }}
                            onViewAssignment={() => {
                              // Navigate to full assignment view
                              const isTutor = currentUser?.profile?.role === 'tutor';
                              const route = isTutor 
                                ? `/tutor/classroom/${classroomSlug}/assignment/${assignment.id}`
                                : `/classroom/${classroomSlug}/assignment/${assignment.id}`;
                              router.push(route);
                            }}
                          />
                        ) : (
                          <SubmissionsSummary
                            assignmentId={parseInt(assignment.id)}
                            classroomSlug={classroomSlug}
                            dueDate={assignment.due_date}
                            userRole={classroom?.user_role || 'student'}
                            classroomColor={classroom?.color}
                            onGradeSubmission={(submissionId) => {
                              // Handle grading action - could navigate to full submissions page
                              const isTutor = currentUser?.profile?.role === 'tutor';
                              const route = isTutor 
                                ? `/tutor/classroom/${classroomSlug}/assignment/${assignment.id}/submissions`
                                : `/classroom/${classroomSlug}/assignment/${assignment.id}/submissions`;
                              router.push(route);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('edit_assignment')}</DialogTitle>
            <DialogDescription>
              {t('edit_assignment_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">{t('title')}</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('title_placeholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t('description')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('description_placeholder')}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due_date">{t('due_date')}</Label>
              <Input
                id="edit-due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-total_points">{t('total_points')}</Label>
              <Input
                id="edit-total_points"
                type="number"
                value={formData.total_points}
                onChange={(e) => setFormData(prev => ({ ...prev, total_points: parseInt(e.target.value) || 0 }))}
                min="1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">{t('status')}</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('draft')}</SelectItem>
                  <SelectItem value="published">{t('published')}</SelectItem>
                  <SelectItem value="closed">{t('closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleUpdateAssignment}
              disabled={!formData.title || !formData.due_date}
            >
              {t('update_assignment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
