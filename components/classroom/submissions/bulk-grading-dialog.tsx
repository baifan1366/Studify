'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useCreateGrade } from '@/hooks/classroom/use-grades';
import { 
  Star, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  Clock,
  Download
} from 'lucide-react';
import { ClassroomColor, getCardStyling, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { SubmissionAttachments } from './submission-attachments';
import { SubmissionAIChecker } from '@/components/ai/submission-ai-checker';

interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  content: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  profiles: {
    id: number;
    display_name: string | null;
    email: string;
    avatar_url?: string | null;
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

interface BulkGradingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
  assignment: {
    id: number;
    title: string;
    total_points?: number;
  };
  classroomSlug: string;
  classroomColor?: ClassroomColor;
  onGradingComplete?: () => void;
}

export function BulkGradingDialog({
  isOpen,
  onClose,
  submissions,
  assignment,
  classroomSlug,
  classroomColor = CLASSROOM_COLORS[0],
  onGradingComplete
}: BulkGradingDialogProps) {
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(new Set());
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [individualGrades, setIndividualGrades] = useState<Record<number, { grade: string; feedback: string }>>({});
  const [gradingMode, setGradingMode] = useState<'bulk' | 'individual'>('bulk');
  const [processing, setProcessing] = useState(false);
  
  const { toast } = useToast();
  const createGradeMutation = useCreateGrade();
  const cardStyling = getCardStyling(classroomColor, 'light');

  // Filter ungraded submissions
  const ungradedSubmissions = submissions.filter(s => s.grade === null);
  const gradedSubmissions = submissions.filter(s => s.grade !== null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setSelectedSubmissions(new Set());
      setBulkGrade('');
      setBulkFeedback('');
      setIndividualGrades({});
      setGradingMode('bulk');
      setProcessing(false);
    }
  }, [isOpen]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubmissions(new Set(ungradedSubmissions.map(s => s.id)));
    } else {
      setSelectedSubmissions(new Set());
    }
  };

  const handleSelectSubmission = (submissionId: number, checked: boolean) => {
    const newSelected = new Set(selectedSubmissions);
    if (checked) {
      newSelected.add(submissionId);
    } else {
      newSelected.delete(submissionId);
    }
    setSelectedSubmissions(newSelected);
  };

  const handleIndividualGradeChange = (submissionId: number, field: 'grade' | 'feedback', value: string) => {
    setIndividualGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        grade: field === 'grade' ? value : prev[submissionId]?.grade || '',
        feedback: field === 'feedback' ? value : prev[submissionId]?.feedback || ''
      }
    }));
  };

  const validateGrade = (grade: string): boolean => {
    const numGrade = parseFloat(grade);
    return !isNaN(numGrade) && numGrade >= 0 && numGrade <= 100;
  };

  const handleBulkGrading = async () => {
    if (selectedSubmissions.size === 0) {
      toast({
        title: "No Submissions Selected",
        description: "Please select submissions to grade",
        variant: "destructive",
      });
      return;
    }

    if (!validateGrade(bulkGrade)) {
      toast({
        title: "Invalid Grade",
        description: "Grade must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    
    try {
      const grade = parseFloat(bulkGrade);
      const selectedSubmissionsList = ungradedSubmissions.filter(s => selectedSubmissions.has(s.id));
      
      // Submit grades in parallel
      await Promise.all(
        selectedSubmissionsList.map(submission =>
          createGradeMutation.mutateAsync({
            classroomSlug,
            assignmentId: assignment.id,
            data: {
              student_id: submission.student_id,
              score: grade,
              feedback: bulkFeedback || undefined
            }
          })
        )
      );

      toast({
        title: "Success",
        description: `Graded ${selectedSubmissions.size} submissions`,
      });

      onGradingComplete?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit grades",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleIndividualGrading = async () => {
    const validGrades = Object.entries(individualGrades).filter(([_, data]) => 
      validateGrade(data.grade)
    );

    if (validGrades.length === 0) {
      toast({
        title: "No Valid Grades",
        description: "Please enter valid grades (0-100) for at least one submission",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    
    try {
      // Submit individual grades in parallel
      await Promise.all(
        validGrades.map(([submissionIdStr, data]) => {
          const submissionId = parseInt(submissionIdStr);
          const submission = ungradedSubmissions.find(s => s.id === submissionId);
          if (!submission) return Promise.resolve();

          return createGradeMutation.mutateAsync({
            classroomSlug,
            assignmentId: assignment.id,
            data: {
              student_id: submission.student_id,
              score: parseFloat(data.grade),
              feedback: data.feedback || undefined
            }
          });
        })
      );

      toast({
        title: "Success",
        description: `Graded ${validGrades.length} submissions`,
      });

      onGradingComplete?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit grades",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const exportGrades = () => {
    const csvContent = [
      ['Student Name', 'Email', 'Grade', 'Feedback', 'Submitted At'],
      ...submissions.map(s => [
        s.profiles.display_name || 'Unknown',
        s.profiles.email,
        s.grade?.toString() || 'Not Graded',
        s.feedback || '',
        new Date(s.submitted_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assignment.title.replace(/[^a-z0-9]/gi, '_')}_grades.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: classroomColor }} />
            Bulk Grading - {assignment.title}
          </DialogTitle>
          <DialogDescription>
            Grade multiple submissions at once or assign individual grades to each student
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div 
            className="p-3 rounded-lg border-l-4"
            style={{ 
              borderLeftColor: classroomColor,
              backgroundColor: cardStyling.backgroundColor 
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4" style={{ color: classroomColor }} />
              <span className="font-medium">Total Submissions</span>
            </div>
            <div className="text-2xl font-bold">{submissions.length}</div>
          </div>

          <div 
            className="p-3 rounded-lg border-l-4"
            style={{ 
              borderLeftColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)' 
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">Graded</span>
            </div>
            <div className="text-2xl font-bold">{gradedSubmissions.length}</div>
          </div>

          <div 
            className="p-3 rounded-lg border-l-4"
            style={{ 
              borderLeftColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)' 
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold">{ungradedSubmissions.length}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button 
            variant={gradingMode === 'bulk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGradingMode('bulk')}
            style={{ 
              backgroundColor: gradingMode === 'bulk' ? classroomColor : undefined,
              borderColor: classroomColor
            }}
          >
            Bulk Grading
          </Button>
          <Button 
            variant={gradingMode === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGradingMode('individual')}
            style={{ 
              backgroundColor: gradingMode === 'individual' ? classroomColor : undefined,
              borderColor: classroomColor
            }}
          >
            Individual Grading
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportGrades}
            className="ml-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {gradingMode === 'bulk' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grade (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                  placeholder="Enter grade"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  Select All
                  <Checkbox
                    checked={selectedSubmissions.size === ungradedSubmissions.length && ungradedSubmissions.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Label>
              </div>
            </div>
            
            <div>
              <Label>Feedback (Optional)</Label>
              <Textarea
                value={bulkFeedback}
                onChange={(e) => setBulkFeedback(e.target.value)}
                placeholder="Enter feedback for all selected submissions..."
                rows={3}
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 max-h-96">
          <div className="space-y-2">
            {ungradedSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2" style={{ color: classroomColor }} />
                <p>All submissions have been graded!</p>
              </div>
            ) : (
              ungradedSubmissions.map((submission) => (
                <div 
                  key={submission.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {gradingMode === 'bulk' && (
                      <Checkbox
                        checked={selectedSubmissions.has(submission.id)}
                        onChange={(e) => handleSelectSubmission(submission.id, e.target.checked)}
                      />
                    )}
                    
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={submission.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {submission.profiles.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                         submission.profiles.email?.substring(0, 2).toUpperCase() || 'NA'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="font-medium">
                        {submission.profiles.display_name || submission.profiles.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                      </div>
                      
                      {/* Show attachments if any exist */}
                      {submission.classroom_attachments && (
                        <div className="mt-2">
                          <SubmissionAttachments 
                            attachments={[submission.classroom_attachments]}
                            userRole="tutor"
                            showTitle={false}
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {gradingMode === 'individual' && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Grade"
                          className="w-20"
                          value={individualGrades[submission.id]?.grade || ''}
                          onChange={(e) => handleIndividualGradeChange(submission.id, 'grade', e.target.value)}
                        />
                        <Input
                          placeholder="Feedback"
                          className="w-32"
                          value={individualGrades[submission.id]?.feedback || ''}
                          onChange={(e) => handleIndividualGradeChange(submission.id, 'feedback', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {gradedSubmissions.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Already Graded ({gradedSubmissions.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {gradedSubmissions.slice(0, 6).map(submission => (
                  <div key={submission.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {submission.profiles.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1">{submission.profiles.display_name || submission.profiles.email}</span>
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      {submission.grade}%
                    </Badge>
                  </div>
                ))}
                {gradedSubmissions.length > 6 && (
                  <div className="text-xs text-muted-foreground p-2">
                    +{gradedSubmissions.length - 6} more...
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={gradingMode === 'bulk' ? handleBulkGrading : handleIndividualGrading}
            disabled={processing || ungradedSubmissions.length === 0}
            style={{ backgroundColor: classroomColor }}
          >
            <Star className="h-4 w-4 mr-2" />
            {processing ? 'Grading...' : `Grade ${gradingMode === 'bulk' ? selectedSubmissions.size : Object.keys(individualGrades).length} Submissions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
