'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  useAttachments, 
  useAssignmentAttachments,
  formatFileSize,
  getFileIcon,
  ClassroomAttachment
} from '@/hooks/classroom/use-attachments';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Calendar, 
  User,
  AlertCircle,
  Upload,
  X,
  Download,
  Paperclip,
  Plus
} from 'lucide-react';
import { SubmissionAttachments } from './submission-attachments';

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
  const [attachments, setAttachments] = useState<ClassroomAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  // Fetch existing submissions for this assignment and current user
  const { data: submissionsData, refetch } = useSubmissions(
    classroomSlug, 
    assignment?.id || 0, 
    currentUserId
  );

  const submitAssignment = useSubmitAssignment();
  const updateSubmission = useUpdateAssignmentSubmission();
  
  // Attachment functionality
  const { uploadFile } = useAttachments(classroomSlug);
  const { data: existingAttachments, refetch: refetchAttachments } = useAssignmentAttachments(
    classroomSlug, 
    assignment?.id
  );

  // Get the current user's submission if it exists
  const existingSubmission = submissionsData?.submissions?.[0];
  const hasSubmitted = !!existingSubmission;

  // Check if deadline has passed
  const isOverdue = assignment ? new Date() > new Date(assignment.due_date) : false;
  const canSubmit = assignment && !isOverdue;
  const canUpdate = hasSubmitted && !isOverdue;

  // Load existing submission content and attachments
  useEffect(() => {
    if (existingSubmission) {
      setContent(existingSubmission.content);
    } else {
      setContent('');
    }
    
    // Load existing attachments for this assignment and user
    if (existingAttachments && currentUserId) {
      const userAttachments = existingAttachments.filter(
        (att: any) => att.owner_id === currentUserId
      );
      setAttachments(userAttachments);
    } else {
      setAttachments([]);
    }
  }, [existingSubmission, existingAttachments, currentUserId]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!assignment) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { promise } = uploadFile(file, {
        contextType: 'assignment',
        assignmentId: assignment.id,
        customMessage: file.name,
        onProgress: (progress) => setUploadProgress(progress)
      });

      const newAttachment = await promise;
      setAttachments(prev => [...prev, newAttachment]);
      refetchAttachments();
      
      toast({
        title: "File Uploaded",
        description: `${file.name} has been attached to your submission`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(handleFileUpload);
    }
    // Reset input
    event.target.value = '';
  };

  // Remove attachment
  const removeAttachment = (attachmentId: number) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    // When resubmitting, the attachment will be removed from the submission
    // by not including it in the attachmentIds array
  };

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
      // Get attachment IDs from current attachments
      const attachmentIds = attachments.map(att => att.id);
      if (hasSubmitted) {
        // Update existing submission
        await updateSubmission.mutateAsync({
          classroomSlug,
          assignmentId: assignment.id,
          content: content.trim(),
          attachmentIds
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
          content: content.trim(),
          attachmentIds
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

                  {/* Show existing submission attachments */}
                  {existingSubmission && existingSubmission.classroom_attachments && (
                    <div>
                      <Label className="text-sm font-medium">Submitted Attachments</Label>
                      <div className="mt-2">
                        <SubmissionAttachments 
                          attachments={[existingSubmission.classroom_attachments]}
                          userRole="student"
                          showTitle={false}
                        />
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
                      placeholder="Enter your submission here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />

                    {/* Attachment Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          Attachments
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileInputChange}
                            className="hidden"
                            id="file-upload"
                            disabled={isUploading || isOverdue}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            disabled={isUploading || isOverdue}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Files
                          </Button>
                        </div>
                      </div>

                      {/* Upload Progress */}
                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4" />
                            Uploading... {uploadProgress}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Attachment List */}
                      {attachments.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {attachments.map((attachment) => (
                            <div 
                              key={attachment.id}
                              className="flex items-center justify-between p-2 bg-gray-100/5 rounded-lg border"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-lg">{getFileIcon(attachment.mime_type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {attachment.file_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(attachment.size_bytes)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(attachment.file_url, '_blank')}
                                  className="h-6 w-6 p-0"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(attachment.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  disabled={isOverdue}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {attachments.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed border-gray-200 rounded-lg">
                          {hasSubmitted 
                            ? "No files currently attached. Add files to include with your resubmission."
                            : "No files attached. Click \"Add Files\" to upload documents, images, or other files."
                          }
                        </div>
                      )}

                      {/* Resubmission notice */}
                      {hasSubmitted && attachments.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                          <p className="text-xs text-blue-700">
                            💡 Resubmitting will update your submission with these {attachments.length} file{attachments.length !== 1 ? 's' : ''}. 
                            You can add new files or remove existing ones before resubmitting.
                          </p>
                        </div>
                      )}
                    </div>
                    
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
