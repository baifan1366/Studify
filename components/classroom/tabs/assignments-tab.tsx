'use client';

import React, { useState } from 'react';
import { FileText, Plus, Eye, Users, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { AssignmentSubmissions } from '../submissions/assignment-submissions';
import { SubmissionDialog } from '../submissions/submission-dialog';
import { CreateAssignmentDialog } from '../Dialog/create-assignment-dialog';
import { useClassroomAssignments } from '@/hooks/classroom/use-classroom-assignments';

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
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Use the assignments hook to get fresh data
  const { data: assignmentsResponse, refetch: refetchAssignments } = useClassroomAssignments(classroomSlug);
  
  // Use hook data if available, fallback to prop data
  const currentAssignmentsData = assignmentsResponse?.assignments || assignmentsData || [];
  // Get classroom color
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');

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

  // Close submission dialog
  const handleCloseSubmissionDialog = () => {
    setShowSubmissionDialog(false);
    setSelectedAssignment(null);
  };

  // Handle assignment creation completion
  const handleAssignmentCreated = () => {
    // Refetch assignments data to show the new assignment
    refetchAssignments();
    console.log('Assignment created successfully - data refreshed');
  };

  // If showing submissions, render the submissions component
  if (showSubmissions && selectedAssignment) {
    return (
      <AssignmentSubmissions
        assignment={selectedAssignment}
        classroomSlug={classroomSlug}
        userRole={userRole || 'student'}
        currentUserId={currentUserId}
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
          <CardTitle>Assignments</CardTitle>
          <CardDescription>View and manage classroom assignments</CardDescription>
        </div>
        {userRole === 'tutor' && (
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
        {!currentAssignmentsData?.length ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No assignments yet</p>
            {userRole === 'tutor' && (
              <p className="text-sm text-muted-foreground mt-2">
                Create an assignment to get started
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentAssignmentsData.slice(0, 5).map((assignment: any) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {(assignment.due_date || assignment.due_on) ? new Date(assignment.due_date || assignment.due_on).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Tutor actions */}
                  {userRole === 'tutor' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewSubmissions(assignment)}
                        className="flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        Submissions
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigateToSection('assignment')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </>
                  )}
                  
                  {/* Student actions */}
                  {userRole === 'student' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSubmitAssignment(assignment)}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Submit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigateToSection('assignment')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
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
            ))}
            {currentAssignmentsData.length > 5 && (
              <Button variant="outline" className="w-full" onClick={() => navigateToSection('assignment')}>
                View All Assignments ({currentAssignmentsData.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}