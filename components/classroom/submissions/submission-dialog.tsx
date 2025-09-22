'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  useSubmissions, 
  useSubmitAssignment, 
  useUpdateAssignmentSubmission 
} from '@/hooks/classroom/use-submissions';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Calendar, 
  User,
  AlertCircle 
} from 'lucide-react';

interface Assignment {
  id: number;
  title: string;
  description: string;
  due_date: string;
}

interface SubmissionDialogProps {
  assignment: Assignment | null;
  classroomSlug: string;
  currentUserId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function SubmissionDialog({ 
  assignment, 
  classroomSlug, 
  currentUserId,
  isOpen, 
  onClose 
}: SubmissionDialogProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch existing submissions for this assignment and current user
  const { data: submissionsData, refetch } = useSubmissions(
    classroomSlug, 
    assignment?.id || 0, 
    currentUserId
  );

  const submitAssignment = useSubmitAssignment();
  const updateSubmission = useUpdateAssignmentSubmission();

  // Get the current user's submission if it exists
  const existingSubmission = submissionsData?.submissions?.[0];
  const hasSubmitted = !!existingSubmission;

  // Check if deadline has passed
  const isOverdue = assignment ? new Date() > new Date(assignment.due_date) : false;
  const canSubmit = assignment && !isOverdue;
  const canUpdate = hasSubmitted && !isOverdue;

  // Load existing submission content
  useEffect(() => {
    if (existingSubmission) {
      setContent(existingSubmission.content);
    } else {
      setContent('');
    }
  }, [existingSubmission]);

  const handleSubmit = async () => {
    if (!assignment || !content.trim()) {
      toast({
        title: "Invalid Submission",
        description: "Please enter your submission content",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (hasSubmitted) {
        // Update existing submission
        await updateSubmission.mutateAsync({
          classroomSlug,
          assignmentId: assignment.id,
          content: content.trim()
        });
        
        toast({
          title: "Success",
          description: "Your submission has been updated",
        });
      } else {
        // Create new submission
        await submitAssignment.mutateAsync({
          classroomSlug,
          assignmentId: assignment.id,
          content: content.trim()
        });
        
        toast({
          title: "Success", 
          description: "Your assignment has been submitted",
        });
      }
      
      // Refresh the submissions data
      refetch();
      
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error?.message || "Failed to submit assignment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 bg-green-50';
    if (grade >= 80) return 'text-blue-600 bg-blue-50';
    if (grade >= 70) return 'text-yellow-600 bg-yellow-50';
    if (grade >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {assignment.title}
          </DialogTitle>
          <DialogDescription>
            Submit your work for this assignment
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Assignment Details */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Assignment Description</Label>
                  <p className="mt-1 text-sm">{assignment.description}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Due: {formatDate(assignment.due_date)}</span>
                  </div>
                  
                  {isOverdue && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Existing Submission Status */}
              {existingSubmission && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Your Submission</h3>
                    <div className="flex items-center gap-2">
                      {existingSubmission.grade !== null && existingSubmission.grade !== undefined ? (
                        <Badge className={getGradeColor(existingSubmission.grade)}>
                          Grade: {existingSubmission.grade}%
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 bg-blue-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Submitted
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Submitted on: {formatDate(existingSubmission.submitted_at)}
                  </div>

                  {existingSubmission.feedback && (
                    <div>
                      <Label className="text-sm font-medium">Instructor Feedback</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm">{existingSubmission.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Form */}
              {canSubmit && (
                <>
                  {existingSubmission && <Separator />}
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="submission-content" className="font-semibold">
                        {hasSubmitted ? 'Update Your Submission' : 'Your Submission'}
                      </Label>
                      {hasSubmitted && canUpdate && (
                        <Badge variant="outline" className="text-yellow-600 bg-yellow-50">
                          Can be updated before deadline
                        </Badge>
                      )}
                    </div>
                    
                    <Textarea
                      id="submission-content"
                      placeholder="Enter your assignment submission here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={10}
                      className="min-h-[200px]"
                    />
                    
                    <div className="text-sm text-muted-foreground">
                      {content.length} characters
                    </div>
                  </div>
                </>
              )}

              {/* Overdue Message */}
              {isOverdue && !hasSubmitted && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Assignment Overdue</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    The deadline for this assignment has passed. You can no longer submit your work.
                  </p>
                </div>
              )}

              {/* Already graded message */}
              {existingSubmission && existingSubmission.grade !== null && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-md">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Assignment Graded</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Your assignment has been graded. You received {existingSubmission.grade}% on this assignment.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {canSubmit && (content.trim() !== (existingSubmission?.content || '')) && (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {hasSubmitted ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                hasSubmitted ? 'Update Submission' : 'Submit Assignment'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
