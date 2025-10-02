'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Award, 
  User, 
  Calendar,
  Filter,
  Download,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertTriangle,
  Trophy
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuizSubmissions, useSubmissionGrading } from '@/hooks/course/use-quiz';

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';
type SubmissionStatus = 'completed' | 'in_progress' | 'not_started';
type GradingStatus = 'auto_graded' | 'pending_review' | 'manually_graded';

interface QuizQuestion {
  id: number;
  public_id: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer: any;
  explanation?: string;
  points: number;
  difficulty: number;
  position: number;
}

interface QuizSubmission {
  id: number;
  public_id: string;
  quiz_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  student_avatar?: string;
  status: SubmissionStatus;
  grading_status: GradingStatus;
  score: number | null;
  total_points: number;
  time_spent: number; // in seconds
  submitted_at: string;
  graded_at?: string;
  graded_by?: string;
  feedback?: string;
  answers: QuizAnswer[];
}

interface QuizAnswer {
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  student_answer: any;
  correct_answer: any;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
  time_spent: number;
  feedback?: string;
}

interface ViewQuizSubmissionProps {
  quiz: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewQuizSubmission({ quiz, open, onOpenChange }: ViewQuizSubmissionProps) {
  const t = useTranslations('ViewQuizSubmission');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  const [gradingFilter, setGradingFilter] = useState<GradingStatus | 'all'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);
  
  // State for grading
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Use quiz prop to get lessonId and quizId
  const lessonId = quiz?.lesson_id?.toString() || '';
  const quizId = quiz?.id?.toString() || '';

  console.log('🔍 [ViewQuizSubmission] Quiz prop analysis:', {
    quiz,
    lessonId,
    quizId,
    quizKeys: quiz ? Object.keys(quiz) : 'No quiz'
  });

  // Fetch real submissions data
  const { submissions: realSubmissions, isLoading: submissionsLoading, error: submissionsError } = useQuizSubmissions({ lessonId });
  
  // Grading hook for selected submission
  const selectedSubmissionId = selectedSubmission?.public_id || '';
  const { updateGrade, isUpdating } = useSubmissionGrading({ 
    lessonId, 
    quizId, 
    submissionId: selectedSubmissionId 
  });
  
  console.log('📊 [ViewQuizSubmission] Real submissions data:', {
    lessonId,
    quizId,
    submissions: realSubmissions,
    isLoading: submissionsLoading,
    error: submissionsError
  });

  // Transform the submissions to match expected format
  const transformedSubmissions = (realSubmissions || []).map((submission: any) => {
    // Map submission data to expected format
    const profile = submission.profiles || {};
    return {
      id: submission.id,
      public_id: submission.public_id,
      quiz_id: submission.quiz_id || null,
      student_id: submission.student_id || submission.profiles?.id,
      student_name: profile.display_name || profile.full_name || 'Unknown Student',
      student_email: submission.student_email || 'No email',
      student_avatar: submission.student_avatar,
      status: submission.status || 'completed', // Default to completed since they submitted
      grading_status: submission.grading_status || 'pending_review',
      score: submission.score,
      total_points: submission.total_points || 0,
      time_spent: submission.time_spent || 0,
      submitted_at: submission.created_at || submission.submitted_at,
      graded_at: submission.graded_at,
      graded_by: submission.graded_by,
      feedback: submission.feedback,
      answers: submission.answers || []
    };
  });

  const filteredSubmissions = transformedSubmissions.filter((submission: any) => {
    const matchesSearch = searchTerm === '' || 
                         submission.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.student_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    const matchesGrading = gradingFilter === 'all' || submission.grading_status === gradingFilter;
    
    const shouldInclude = matchesSearch && matchesStatus && matchesGrading;
    
    if (!shouldInclude) {
      console.log('Excluding submission:', {
        id: submission.id,
        student_name: submission.student_name,
        status: submission.status,
        grading_status: submission.grading_status,
        matchesSearch,
        matchesStatus,
        matchesGrading
      });
    }
    
    return shouldInclude;
  });
  
  console.log('📊 [ViewQuizSubmission] Processed submissions:', {
    rawSubmissions: realSubmissions,
    transformedSubmissions,
    filteredSubmissions,
    searchTerm,
    statusFilter,
    gradingFilter
  });

  const getStatusBadge = (status: SubmissionStatus) => {
    const badges = {
      completed: { label: t('completed'), className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      in_progress: { label: t('in_progress'), className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
      not_started: { label: t('not_started'), className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' }
    };
    const badge = badges[status];
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getGradingBadge = (status: GradingStatus) => {
    const badges = {
      auto_graded: { label: t('auto_graded'), className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
      manually_graded: { label: t('manually_graded'), className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
      pending_review: { label: t('pending_review'), className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' }
    };
    const badge = badges[status];
    return <Badge variant="outline" className={badge.className}>{badge.label}</Badge>;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatScore = (score: number | null, total: number) => {
    if (score === null) return t('not_graded');
    const percentage = Math.round((score / total) * 100);
    return `${score}/${total} (${percentage}%)`;
  };

  const handleViewSubmission = (submission: QuizSubmission) => {
    setSelectedSubmission(submission);
    setGradingFeedback(submission.feedback || '');
  };

  const handleSubmitGrading = async () => {
    if (!selectedSubmission) return;
    
    setIsSubmittingGrade(true);
    try {
      await updateGrade({
        feedback: gradingFeedback,
        grading_status: 'manually_graded'
      });
      
      setSelectedSubmission(null);
      setGradingFeedback('');
    } catch (error) {
      console.error('Error submitting grade:', error);
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const calculateStats = () => {
    if (!transformedSubmissions || transformedSubmissions.length === 0) {
      return { total: 0, completed: 0, graded: 0, averageScore: 0 };
    }
    
    const total = transformedSubmissions.length;
    const completed = transformedSubmissions.filter((s: any) => s.status === 'completed').length;
    const graded = transformedSubmissions.filter((s: any) => s.grading_status !== 'pending_review').length;
    const gradedSubmissions = transformedSubmissions.filter((s: any) => s.score !== null);
    const averageScore = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((acc: number, s: any) => acc + (s.score || 0), 0) / gradedSubmissions.length 
      : 0;
    
    return { total, completed, graded, averageScore };
  };

  const stats = calculateStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('title')} - {quiz?.question_text || 'Quiz Submissions'}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_submissions')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{stats.graded}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('graded')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{Math.round(stats.averageScore)}%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('average_score')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>{t('submissions')}</CardTitle>
          <CardDescription>{t('submissions_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search_students')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filter_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_statuses')}</SelectItem>
                <SelectItem value="completed">{t('completed')}</SelectItem>
                <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                <SelectItem value="not_started">{t('not_started')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={gradingFilter} onValueChange={(value: any) => setGradingFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filter_grading')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_grading')}</SelectItem>
                <SelectItem value="auto_graded">{t('auto_graded')}</SelectItem>
                <SelectItem value="manually_graded">{t('manually_graded')}</SelectItem>
                <SelectItem value="pending_review">{t('pending_review')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading and Error States */}
      {submissionsLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">{t('loading')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {submissionsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('error_loading')}: {submissionsError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Submissions Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('student')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('grading_status')}</TableHead>
                <TableHead>{t('score')}</TableHead>
                <TableHead>{t('time_spent')}</TableHead>
                <TableHead>{t('submitted_at')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length > 0 ? filteredSubmissions.map((submission: any) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{submission.student_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{submission.student_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(submission.status)}</TableCell>
                  <TableCell>{getGradingBadge(submission.grading_status)}</TableCell>
                  <TableCell>
                    <span className={submission.score !== null ? '' : 'text-gray-400'}>
                      {formatScore(submission.score, submission.total_points)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(submission.time_spent)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(submission.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('view_submission')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400">No submissions match current filters</p>
                      <p className="text-sm text-gray-500">Total raw submissions: {realSubmissions?.length || 0}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

          {/* Submission Detail Section - Inline instead of nested dialog */}
          {selectedSubmission && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('submission_details')} - {selectedSubmission.student_name}
                </CardTitle>
                <CardDescription>
                  {t('submitted')} {new Date(selectedSubmission.submitted_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="answers" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="answers">{t('answers')}</TabsTrigger>
                    <TabsTrigger value="grading">{t('grading')}</TabsTrigger>
                    <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="answers" className="space-y-4">
                    {/* Student answers would be rendered here */}
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-gray-600 dark:text-gray-400">{t('answers_placeholder')}</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="grading" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('manual_grading')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t('feedback')}</Label>
                          <Textarea
                            placeholder={t('feedback_placeholder')}
                            value={gradingFeedback}
                            onChange={(e) => setGradingFeedback(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedSubmission(null)}
                          >
                            {t('close')}
                          </Button>
                          {selectedSubmission?.grading_status === 'pending_review' && (
                            <Button
                              onClick={handleSubmitGrading}
                              disabled={isSubmittingGrade || isUpdating}
                            >
                              {(isSubmittingGrade || isUpdating) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                  {t('saving')}
                                </>
                              ) : (
                                t('save_grading')
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-gray-600 dark:text-gray-400">{t('analytics_placeholder')}</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}