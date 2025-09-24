'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Star,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Edit3,
  User
} from 'lucide-react';
import { useSubmissions } from '@/hooks/classroom/use-submissions';
import { useAssignmentGrades } from '@/hooks/classroom/use-grades';
import { useUser } from '@/hooks/profile/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassroomColor, getCardStyling, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { SubmissionAttachments } from './submission-attachments';
import { SubmissionAIChecker } from '@/components/ai/submission-ai-checker';

interface StudentSubmissionSummaryProps {
  assignmentId: number;
  classroomSlug: string;
  dueDate: string;
  assignmentTitle: string;
  totalPoints?: number;
  className?: string;
  classroomColor?: ClassroomColor;
  onEditSubmission?: () => void;
  onViewAssignment?: () => void;
}

export function StudentSubmissionSummary({
  assignmentId,
  classroomSlug,
  dueDate,
  assignmentTitle,
  totalPoints,
  className,
  classroomColor = CLASSROOM_COLORS[0],
  onEditSubmission,
  onViewAssignment
}: StudentSubmissionSummaryProps) {
  const { data: user } = useUser();
  
  // Fetch student's submission for this assignment
  const { data: submissionsData, isLoading: isSubmissionsLoading } = useSubmissions(classroomSlug, assignmentId);
  
  // Fetch student's grade for this assignment
  const { data: gradesData, isLoading: isGradesLoading } = useAssignmentGrades(classroomSlug, assignmentId);

  // Find current user's submission and grade
  const submissions = Array.isArray(submissionsData) ? submissionsData : submissionsData?.submissions || [];
  const grades = Array.isArray(gradesData?.grades) ? gradesData.grades : [];
  
  const mySubmission = submissions.find(s => s.student_id === parseInt(user?.profile?.id || '0'));
  const myGrade = grades.find(g => g.user_id === parseInt(user?.profile?.id || '0'));

  const validColor = (classroomColor && CLASSROOM_COLORS.includes(classroomColor as ClassroomColor)) 
    ? classroomColor as ClassroomColor 
    : CLASSROOM_COLORS[0];
  const cardStyling = getCardStyling(validColor, 'light');

  const isOverdue = new Date(dueDate) < new Date();
  const hasSubmitted = !!mySubmission;
  const isGraded = !!myGrade;
  const canResubmit = hasSubmitted && !isGraded && !isOverdue;

  if (isSubmissionsLoading || isGradesLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Submission Status Card */}
      <Card 
        className="border-l-4 hover:shadow-md transition-shadow"
        style={{ 
          borderLeftColor: validColor,
          backgroundColor: cardStyling.backgroundColor,
          borderColor: cardStyling.borderColor
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" style={{ color: validColor }} />
            Your Submission Status
          </CardTitle>
          <CardDescription>
            {assignmentTitle} - Due: {new Date(dueDate).toLocaleDateString()} at {new Date(dueDate).toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              {hasSubmitted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <div className="font-medium">
                  {hasSubmitted ? 'Submitted' : 'Not Submitted'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {hasSubmitted 
                    ? `On ${new Date(mySubmission.submitted_at).toLocaleDateString()}`
                    : isOverdue ? 'Assignment is overdue' : 'Pending submission'
                  }
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              {isGraded ? (
                <Star className="h-5 w-5 text-blue-600" />
              ) : (
                <Clock className="h-5 w-5 text-gray-600" />
              )}
              <div>
                <div className="font-medium">
                  {isGraded ? `${myGrade.score}%` : 'Not Graded'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isGraded 
                    ? `Grade: ${myGrade.score}/${totalPoints || 100}`
                    : hasSubmitted ? 'Waiting for grade' : 'No submission yet'
                  }
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">              
              {isOverdue ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Calendar className="h-5 w-5 text-green-600" />
              )}
              <div>
                <div className="font-medium">
                  {isOverdue ? 'Overdue' : 'On Time'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isOverdue 
                    ? 'Past due date' 
                    : `${Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={hasSubmitted ? "default" : "secondary"} className="flex items-center gap-1">
              <div className={`w-2 h-2 ${hasSubmitted ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
              {hasSubmitted ? 'Submitted' : 'Not Submitted'}
            </Badge>
            
            {isGraded && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Graded: {myGrade.score}%
              </Badge>
            )}
            
            {isOverdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {!hasSubmitted && !isOverdue && (
              <Button onClick={onEditSubmission} style={{ backgroundColor: validColor }}>
                <Edit3 className="h-4 w-4 mr-2" />
                Submit Assignment
              </Button>
            )}
            
            {canResubmit && (
              <Button variant="outline" onClick={onEditSubmission}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Submission
              </Button>
            )}

            <Button variant="outline" onClick={onViewAssignment}>
              <FileText className="h-4 w-4 mr-2" />
              View Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Card - Only show if graded */}
      {isGraded && myGrade.feedback && (
        <Card 
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{ 
            borderLeftColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderColor: '#10b981'
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Instructor Feedback
            </CardTitle>
            <CardDescription>
              Feedback from your instructor on this assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Instructor Feedback
                  </div>
                  <div className="text-sm leading-relaxed">
                    {myGrade.feedback}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Details - Only show if submitted */}
      {hasSubmitted && (
        <Card 
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{ 
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" style={{ color: validColor }} />
              Your Submission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Submitted At:</div>
                <div className="text-sm">
                  {new Date(mySubmission.submitted_at).toLocaleDateString()} at{' '}
                  {new Date(mySubmission.submitted_at).toLocaleTimeString()}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Content:</div>
                <div className="bg-muted/30 p-3 rounded-lg text-sm max-h-32 overflow-y-auto">
                  {mySubmission.content || 'No content provided'}
                </div>
              </div>
              
              
              {/* Show attachments if any exist */}
              {mySubmission.classroom_attachments && (
                <>
                  <Separator />
                  <SubmissionAttachments 
                    attachments={[mySubmission.classroom_attachments]}
                    userRole="student"
                    showTitle={false}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
