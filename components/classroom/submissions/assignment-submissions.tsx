'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Download,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useSubmissions, useGradeSubmission } from '@/hooks/classroom/use-submissions';
import { useCreateGrade, useAssignmentGrades } from '@/hooks/classroom/use-grades';
import { CreateAssignmentDialog } from '../Dialog/create-assignment-dialog';
import { SubmissionsSummary } from './submissions-summary';
import { BulkGradingDialog } from './bulk-grading-dialog';
import { SubmissionAttachments } from './submission-attachments';
import { SubmissionAIChecker } from '@/components/ai/submission-ai-checker';
import { ClassroomColor, getCardStyling, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  content: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  attachments_id?: number | null;
  profiles: {
    id: number;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
  classroom_attachments?: {
    id: number;
    file_name: string;
    file_url: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
  } | null;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  due_date: string;
  classroom_id: number;
}

interface AssignmentSubmissionsProps {
  assignment: Assignment;
  classroomSlug: string;
  userRole: string;
  currentUserId?: number;
  classroomColor?: ClassroomColor;
  onClose?: () => void;
}

export function AssignmentSubmissions({ 
  assignment, 
  classroomSlug, 
  userRole, 
  currentUserId,
  classroomColor,
  onClose 
}: AssignmentSubmissionsProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<number | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [showBulkGrading, setShowBulkGrading] = useState(false);
  const { toast } = useToast();
  
  // Use the new grading hooks
  const createGradeMutation = useCreateGrade();
  const { data: assignmentGrades } = useAssignmentGrades(classroomSlug, assignment?.id);

  const isOwnerOrTutor = ['owner', 'tutor'].includes(userRole);

  // Get classroom color styling
  const validColor = (classroomColor && CLASSROOM_COLORS.includes(classroomColor as ClassroomColor)) 
    ? classroomColor as ClassroomColor 
    : CLASSROOM_COLORS[0];
  const cardStyling = getCardStyling(validColor, 'light');

  // Fetch submissions for this assignment
  useEffect(() => {
    fetchSubmissions();
  }, [assignment.id, classroomSlug]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/classroom/${classroomSlug}/submissions?assignment_id=${assignment.id}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId: number) => {
    if (!gradeValue || isNaN(Number(gradeValue))) {
      toast({
        title: "Invalid Grade",
        description: "Please enter a valid grade (0-100)",
        variant: "destructive",
      });
      return;
    }

    const grade = Number(gradeValue);
    if (grade < 0 || grade > 100) {
      toast({
        title: "Invalid Grade",
        description: "Grade must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    // Find the submission to get the student_id
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
      toast({
        title: "Error",
        description: "Submission not found",
        variant: "destructive",
      });
      return;
    }

    try {
      await createGradeMutation.mutateAsync({
        classroomSlug,
        assignmentId: assignment.id,
        data: {
          student_id: submission.student_id,
          score: grade,
          feedback: feedbackValue || undefined
        }
      });

      // Update the submission in local state
      setSubmissions(prev => prev.map(s => 
        s.id === submissionId
          ? {
              ...s,
              grade: grade,
              feedback: feedbackValue
            }
          : s
      ));

      setGradingSubmission(null);
      setGradeValue('');
      setFeedbackValue('');

      toast({
        title: "Success",
        description: "Grade submitted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to grade submission",
        variant: "destructive",
      });
    }
  };

  const getSubmissionStatus = (submission: Submission) => {
    if (submission.grade !== null) {
      return {
        status: 'graded',
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    return {
      status: 'submitted',
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      icon: <Clock className="h-4 w-4" />
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    if (grade >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Grading Dialog */}
      <BulkGradingDialog
        isOpen={showBulkGrading}
        onClose={() => setShowBulkGrading(false)}
        submissions={submissions}
        assignment={assignment}
        classroomSlug={classroomSlug}
        classroomColor={classroomColor}
        onGradingComplete={() => {
          fetchSubmissions();
          setShowBulkGrading(false);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{assignment.title} - Submissions</h2>
          <p className="text-muted-foreground">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} received
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Summary Statistics for Tutors */}
      {isOwnerOrTutor && (
        <SubmissionsSummary
          assignmentId={assignment.id}
          classroomSlug={classroomSlug}
          dueDate={assignment.due_date}
          userRole={userRole as 'owner' | 'tutor' | 'student'}
          classroomColor={classroomColor as ClassroomColor}
          onGradeSubmission={(submissionId) => {
            if (submissionId === -1) {
              // Handle bulk grading - open bulk grading dialog
              setShowBulkGrading(true);
            } else {
              // Handle individual submission grading
              setGradingSubmission(submissionId);
            }
          }}
        />
      )}

      {/* Assignment Info */}
      <Card 
        className="border-l-4 hover:shadow-md transition-shadow"
        style={{ 
          borderLeftColor: validColor,
          backgroundColor: cardStyling.backgroundColor,
          borderColor: cardStyling.borderColor
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: validColor }} />
            Assignment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <p className="mt-1">{assignment.description}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
              <p className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: validColor }} />
                {formatDate(assignment.due_date)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card 
            className="border-l-4 hover:shadow-md transition-shadow"
            style={{ 
              borderLeftColor: validColor,
              backgroundColor: cardStyling.backgroundColor,
              borderColor: cardStyling.borderColor
            }}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 mb-4" style={{ color: validColor, opacity: 0.6 }} />
              <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
              <p className="text-muted-foreground text-center">
                No students have submitted this assignment yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => {
            const statusInfo = getSubmissionStatus(submission);
            const isExpanded = expandedSubmission === submission.id;
            const isGrading = gradingSubmission === submission.id;

            return (
              <Card 
                key={submission.id} 
                className="overflow-hidden border-l-4 hover:shadow-md transition-all duration-200"
                style={{ 
                  borderLeftColor: validColor,
                  backgroundColor: cardStyling.backgroundColor,
                  borderColor: cardStyling.borderColor
                }}
              >
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedSubmission(isExpanded ? null : submission.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage 
                          src={submission.profiles.avatar_url} 
                          alt={submission.profiles.display_name} 
                        />
                        <AvatarFallback>
                          {submission.profiles.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                           submission.profiles.email?.substring(0, 2).toUpperCase() || 'NA'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h3 className="font-semibold">{submission.profiles.display_name || submission.profiles.email || 'Unknown User'}</h3>
                        <p className="text-sm text-muted-foreground">{submission.profiles.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className={`${statusInfo.color} ${statusInfo.bg}`}>
                        {statusInfo.icon}
                        <span className="ml-1 capitalize">{statusInfo.status}</span>
                      </Badge>
                      
                      {submission.grade !== null && (
                        <Badge variant="outline" className={getGradeColor(submission.grade)}>
                          <Star className="h-3 w-3 mr-1" />
                          {submission.grade}%
                        </Badge>
                      )}

                      <div className="text-sm text-muted-foreground">
                        {formatDate(submission.submitted_at)}
                      </div>

                      {isExpanded ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Separator />
                      <CardContent className="pt-6">
                        {/* Submission Content */}
                        <div className="space-y-6">
                          <div>
                            <Label className="text-sm font-medium">Submission Content</Label>
                            <ScrollArea className="mt-2 h-40 w-full rounded-md bg-gray-100/5 hover:bg-gray-200/8 p-4">
                              <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
                            </ScrollArea>
                          </div>

                          {/* AI Content Detection - Tutors and Admins Only */}
                          {(userRole === 'tutor' || userRole === 'owner' || userRole === 'admin' || userRole === 'instructor') && (
                            <div>
                              <SubmissionAIChecker 
                                submissionText={submission.content}
                                submissionId={submission.id}
                                onDetectionResult={(result) => {
                                  console.log('AI Detection Result:', result);
                                }}
                              />
                            </div>
                          )}

                          {/* Submission Attachments */}
                          {submission.classroom_attachments && (
                            <div>
                              <SubmissionAttachments 
                                attachments={[submission.classroom_attachments]}
                                userRole="tutor"
                                showTitle={true}
                              />
                            </div>
                          )}

                          {/* Existing Grade and Feedback */}
                          {submission.grade !== null && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Grade</Label>
                                <div className={`text-2xl font-bold ${getGradeColor(submission.grade)}`}>
                                  {submission.grade}%
                                </div>
                              </div>
                              {submission.feedback && (
                                <div>
                                  <Label className="text-sm font-medium">Feedback</Label>
                                  <p className="mt-1 text-sm">{submission.feedback}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Grading Section for Tutors */}
                          {isOwnerOrTutor && (
                            <div className="space-y-4">
                              <Separator />
                              {isGrading ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor={`grade-${submission.id}`}>Grade (0-100)</Label>
                                      <Input
                                        id={`grade-${submission.id}`}
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={gradeValue}
                                        onChange={(e) => setGradeValue(e.target.value)}
                                        placeholder="Enter grade"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor={`feedback-${submission.id}`}>Feedback (Optional)</Label>
                                    <Textarea
                                      id={`feedback-${submission.id}`}
                                      value={feedbackValue}
                                      onChange={(e) => setFeedbackValue(e.target.value)}
                                      placeholder="Enter feedback for the student..."
                                      rows={3}
                                    />
                                  </div>

                                  <div className="flex space-x-2">
                                    <Button 
                                      onClick={() => handleGradeSubmission(submission.id)}
                                      size="sm"
                                    >
                                      <Star className="h-4 w-4 mr-2" />
                                      Submit Grade
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setGradingSubmission(null);
                                        setGradeValue('');
                                        setFeedbackValue('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setGradingSubmission(submission.id);
                                    setGradeValue(submission.grade?.toString() || '');
                                    setFeedbackValue(submission.feedback || '');
                                  }}
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  {submission.grade !== null ? 'Update Grade' : 'Grade Submission'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
