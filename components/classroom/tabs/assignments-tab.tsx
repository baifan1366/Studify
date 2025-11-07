'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCardStyling, getClassroomColor, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { AssignmentSubmissions } from '../submissions/assignment-submissions';
import { SubmissionDialog } from '../submissions/submission-dialog';
import { CreateAssignmentDialog } from '../Dialog/create-assignment-dialog';
import { useClassroomAssignments } from '@/hooks/classroom/use-classroom-assignments';
import { useSubmissions } from '@/hooks/classroom/use-submissions';

interface AssignmentsTabProps {
  assignmentsData: any;
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  classroom?: any;
  userRole?: string; // Add user role prop to check for tutor specifically
  currentUserId?: number;
}

export function AssignmentsTab({ assignmentsData, isOwnerOrTutor, classroomSlug, navigateToSection, classroom, userRole, currentUserId }: AssignmentsTabProps) {
  const t = useTranslations('AssignmentsTab');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Use the assignments hook to get fresh data
  const { data: assignmentsResponse, refetch: refetchAssignments } = useClassroomAssignments(classroomSlug);

  // Use hook data if available, fallback to prop data
  // Ensure we always have an array
  const currentAssignmentsData = Array.isArray(assignmentsResponse?.assignments)
    ? assignmentsResponse.assignments
    : Array.isArray(assignmentsData)
      ? assignmentsData
      : [];

  // Debug logging
  React.useEffect(() => {
    if (assignmentsResponse && !Array.isArray(assignmentsResponse?.assignments)) {
      console.warn('⚠️ assignmentsResponse.assignments is not an array:', {
        assignmentsResponse,
        type: typeof assignmentsResponse?.assignments,
        isArray: Array.isArray(assignmentsResponse?.assignments)
      });
    }
    if (assignmentsData && !Array.isArray(assignmentsData)) {
      console.warn('⚠️ assignmentsData is not an array:', {
        assignmentsData,
        type: typeof assignmentsData,
        isArray: Array.isArray(assignmentsData)
      });
    }
  }, [assignmentsResponse, assignmentsData]);

  // Get classroom color
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');

  // Handle viewing submissions (for tutors)
  const handleViewSubmissions = (assignment: any) => {
    setSelectedAssignment(assignment);
    setShowSubmissions(true);
  };

  // Handle submitting assignment (for students)
  const handleSubmitAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    setShowSubmissionDialog(true);
  };

  // Close submissions view
  const handleCloseSubmissions = () => {
    setShowSubmissions(false);
    setSelectedAssignment(null);
  };

  // Close submission dialog and refresh status
  const handleCloseSubmissionDialog = () => {
    setShowSubmissionDialog(false);
    if (selectedAssignment && userRole === 'student') {
      // Refresh both submission and grading status for the assignment
      checkSubmissionStatus(selectedAssignment.id);
      checkGradingStatus(selectedAssignment.id);
    }
    setSelectedAssignment(null);
  };

  // Handle assignment creation completion
  const handleAssignmentCreated = () => {
    // Refetch assignments data to show the new assignment
    refetchAssignments();
    console.log('Assignment created successfully - data refreshed');
  };

  // Handle submission completion (to refresh status)
  const handleSubmissionCompleted = () => {
    // Refresh assignments data to update submission status
    refetchAssignments();
    console.log('Assignment submitted successfully - status refreshed');
  };

  const [submissionStatusMap, setSubmissionStatusMap] = useState<Record<number, boolean>>({});

  // Create a simple state to track grading status  
  const [gradingStatusMap, setGradingStatusMap] = useState<Record<number, boolean>>({});

  // Function to check if assignment is overdue
  const isAssignmentOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due < now;
  };

  // Function to get days overdue
  const getDaysOverdue = (dueDate: string | null) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = now.getTime() - due.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Filter out assignments overdue by more than 3 days
  const filteredAssignments = currentAssignmentsData.filter((assignment: any) => {
    const daysOverdue = getDaysOverdue(assignment.due_date || assignment.due_on);
    return daysOverdue <= 3; // Only show assignments that are not overdue or overdue by 3 days or less
  });

  // Function to check submission status without using hooks
  const checkSubmissionStatus = async (assignmentId: number) => {
    if (userRole !== 'student' || !currentUserId) return false;

    try {
      const response = await fetch(`/api/classroom/${classroomSlug}/submissions?assignment_id=${assignmentId}`);
      if (response.ok) {
        const data = await response.json();
        const submissions = Array.isArray(data) ? data : data?.submissions || [];
        const hasSubmitted = submissions.some((submission: any) =>
          submission.student_id === currentUserId
        );

        // Update the status map
        setSubmissionStatusMap(prev => ({
          ...prev,
          [assignmentId]: hasSubmitted
        }));

        return hasSubmitted;
      }
    } catch (error) {
      console.error('Error checking submission status:', error);
    }
    return false;
  };

  // Function to check if assignment is already graded
  const checkGradingStatus = async (assignmentId: number) => {
    if (userRole !== 'student' || !currentUserId) return false;

    try {
      const response = await fetch(`/api/classroom/${classroomSlug}/assignments/${assignmentId}/grade`);
      if (response.ok) {
        const data = await response.json();
        const grades = Array.isArray(data?.grades) ? data.grades : [];
        const isGraded = grades.some((grade: any) =>
          grade.user_id === currentUserId
        );

        // Update the grading status map
        setGradingStatusMap(prev => ({
          ...prev,
          [assignmentId]: isGraded
        }));

        return isGraded;
      }
    } catch (error) {
      console.error('Error checking grading status:', error);
    }
    return false;
  };

  // Load submission and grading statuses when component mounts or data changes
  React.useEffect(() => {
    if (userRole === 'student' && currentUserId && Array.isArray(filteredAssignments) && filteredAssignments.length > 0) {
      filteredAssignments.forEach((assignment: any) => {
        checkSubmissionStatus(assignment.id);
        checkGradingStatus(assignment.id);
      });
    }
  }, [userRole, currentUserId, filteredAssignments.length, classroomSlug]);

  // If showing submissions, render the submissions component
  if (showSubmissions && selectedAssignment) {
    return (
      <AssignmentSubmissions
        assignment={selectedAssignment}
        classroomSlug={classroomSlug}
        userRole={userRole || 'student'}
        currentUserId={currentUserId}
        classroomColor={classroomColor}
        onClose={handleCloseSubmissions}
      />
    );
  }

  return (
    <>
      <SubmissionDialog
        assignment={selectedAssignment}
        classroomSlug={classroomSlug}
        currentUserId={currentUserId || 0}
        isOpen={showSubmissionDialog}
        onClose={handleCloseSubmissionDialog}
      />
      <Card
        style={{
          backgroundColor: cardStyling.backgroundColor,
          borderColor: cardStyling.borderColor
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('assignments')}</CardTitle>
            <CardDescription>{t('assignments_description')}</CardDescription>
          </div>
          {isOwnerOrTutor && (
            <CreateAssignmentDialog
              classroomSlug={classroomSlug}
              isOpen={showCreateDialog}
              onOpenChange={setShowCreateDialog}
              onAssignmentCreated={handleAssignmentCreated}
              showTrigger={true}
            />
          )}
        </CardHeader>
        <CardContent>
          {!Array.isArray(filteredAssignments) || filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('no_active_assignments')}</p>
              {isOwnerOrTutor && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('create_assignment_to_start')}
                </p>
              )}
              {userRole === 'student' && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('assignments_overdue_hidden')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.slice(0, 5).map((assignment: any) => {
                const isSubmitted = submissionStatusMap[assignment.id] || false;
                const isGraded = gradingStatusMap[assignment.id] || false;
                const isOverdue = isAssignmentOverdue(assignment.due_date || assignment.due_on);
                // Show overdue if past due date, unless it's explicitly a draft
                const showOverdue = isOverdue && assignment.status !== 'draft';

                return (
                  <div
                    key={assignment.id}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${showOverdue
                      ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-800'
                      : 'bg-gray-100/5 hover:bg-gray-200/8 dark:bg-gray-100/5 dark:hover:bg-gray-200/8 '
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${showOverdue
                        ? 'bg-red-100 dark:bg-red-900/50'
                        : 'bg-blue-100 dark:bg-blue-900/50'
                        }`}>
                        <FileText className={`h-5 w-5 ${showOverdue
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                          }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{assignment.title}</p>

                          {/* Priority 1: Show OVERDUE status (highest priority) */}
                          {showOverdue && (
                            <Badge variant="destructive" className="bg-red-600 dark:bg-red-700 text-white">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t('overdue')}
                            </Badge>
                          )}

                          {/* Priority 2: Show graded status (only if not overdue) */}
                          {!showOverdue && userRole === 'student' && isGraded && (
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('graded')}
                            </Badge>
                          )}

                          {/* Priority 3: Show submission status (only if not overdue and not graded) */}
                          {!showOverdue && userRole === 'student' && !isGraded && (
                            <>
                              {isSubmitted ? (
                                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('submitted')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {t('pending')}
                                </Badge>
                              )}
                            </>
                          )}

                          {/* Additional context badge when overdue: show submission/grade status as secondary */}
                          {showOverdue && userRole === 'student' && (
                            <>
                              {isGraded && (
                                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('graded')}
                                </Badge>
                              )}
                              {!isGraded && isSubmitted && (
                                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('submitted_late')}
                                </Badge>
                              )}
                              {!isGraded && !isSubmitted && (
                                <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {t('not_submitted')}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <p className={`text-sm ${showOverdue
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-muted-foreground'
                          }`}>
                          {(assignment.due_date || assignment.due_on) ? `${t('due')}: ${new Date(assignment.due_date || assignment.due_on).toLocaleDateString()}` : t('no_due_date')}
                          {showOverdue && (
                            <span className="ml-2 text-red-700 dark:text-red-300">
                              {t('overdue_by_days', { days: Math.ceil((new Date().getTime() - new Date(assignment.due_date || assignment.due_on).getTime()) / (1000 * 60 * 60 * 24)) })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Tutor/Owner actions */}
                      {isOwnerOrTutor && userRole !== 'student' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSubmissions(assignment)}
                            className="flex items-center gap-1"
                          >
                            <Users className="h-3 w-3" />
                            {t('submissions')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateToSection('assignment')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {t('view')}
                          </Button>
                        </>
                      )}

                      {/* Student actions */}
                      {userRole === 'student' && (
                        <>
                          <Button
                            size="sm"
                            variant={isGraded ? "default" : isSubmitted ? "secondary" : "outline"}
                            onClick={() => handleSubmitAssignment(assignment)}
                            className="flex items-center gap-1"
                            disabled={(showOverdue && !isSubmitted) || isGraded}
                            title={
                              isGraded
                                ? t('assignment_graded_cannot_resubmit')
                                : showOverdue && !isSubmitted
                                  ? t('assignment_overdue_cannot_submit')
                                  : ""
                            }
                          >
                            <FileText className="h-3 w-3" />
                            {isGraded
                              ? t('graded')
                              : showOverdue && isSubmitted
                                ? t('view_submission')
                                : isSubmitted
                                  ? t('resubmit')
                                  : showOverdue
                                    ? t('overdue')
                                    : t('submit_assignment')
                            }
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateToSection('assignment')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {t('view')}
                          </Button>
                        </>
                      )}

                      {/* Default view button for other roles */}
                      {!userRole && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigateToSection('assignment')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredAssignments.length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => navigateToSection('assignment')}>
                  {t('view_all_assignments', { count: filteredAssignments.length })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}