'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import {
  ArrowLeft,
  Plus,
  HelpCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Play,
  BarChart3,
  GripVertical,
  Save,
  XCircle,
  Calendar
} from 'lucide-react';
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { getCardStyling, getClassroomColor } from '@/utils/classroom/color-generator';
import {
  useClassroomQuizzes,
  useCreateQuiz,
  useUpdateQuiz,
  useDeleteQuiz,
  ClassroomQuiz,
  QuizQuestion
} from '@/hooks/classroom/use-classroom-quizzes';

interface ClassroomQuizPageProps {
  classroomSlug: string;
}

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export function ClassroomQuizPage({ classroomSlug }: ClassroomQuizPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: currentUser } = useUser();
  const [classroom, setClassroom] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<ClassroomQuiz | null>(null);
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<ClassroomQuiz | null>(null);
  const [selectedQuizForResults, setSelectedQuizForResults] = useState<ClassroomQuiz | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [studentSubmissionStatus, setStudentSubmissionStatus] = useState<Record<number, any>>({});
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuizQuestion>({
    question_text: '',
    question_type: 'multiple_choice',
    points: 1,
    order_index: 0,
    options: ['', '', '', ''],
    correct_answer: ''
  });
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    time_limit: 60,
    allow_multiple_attempts: false
  });

  const { data: classroomsData } = useClassrooms();
  const { data: quizzesData, isLoading: isQuizzesLoading } = useClassroomQuizzes(classroomSlug);
  const createQuizMutation = useCreateQuiz();
  const updateQuizMutation = useUpdateQuiz();
  const deleteQuizMutation = useDeleteQuiz();

  const quizzes = quizzesData?.quizzes || [];

  useEffect(() => {
    if (classroomsData?.classrooms) {
      const foundClassroom = classroomsData.classrooms.find(c => c.slug === classroomSlug);
      setClassroom(foundClassroom);
    }
  }, [classroomsData, classroomSlug]);

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
      due_date: '',
      time_limit: 60,
      allow_multiple_attempts: false
    });
    setEditingQuiz(null);
  };

  const handleCreateQuiz = async () => {
    try {
      // Validate due date
      if (formData.due_date) {
        const dueDate = new Date(formData.due_date);
        const now = new Date();
        if (dueDate < now) {
          toast({
            title: "Invalid Due Date",
            description: "Due date cannot be in the past. Please select a future date.",
            variant: "destructive",
          });
          return;
        }
      }

      // Validate time limit
      if (formData.time_limit < 10) {
        toast({
          title: "Invalid Time Limit",
          description: "Time limit must be at least 10 minutes.",
          variant: "destructive",
        });
        return;
      }

      if (formData.time_limit > 300) {
        toast({
          title: "Invalid Time Limit",
          description: "Time limit cannot exceed 300 minutes (5 hours).",
          variant: "destructive",
        });
        return;
      }

      // Clean up formData - convert empty strings to undefined
      const cleanedData = {
        ...formData,
        due_date: formData.due_date || undefined
      };

      const result = await createQuizMutation.mutateAsync({
        classroomSlug,
        data: cleanedData
      });

      toast({
        title: "Success",
        description: "Quiz created successfully. Now add questions to your quiz.",
      });

      setIsCreateDialogOpen(false);
      resetForm();

      // Automatically open the question editor for the newly created quiz
      if (result?.quiz) {
        handleEditQuestions(result.quiz);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz",
        variant: "destructive",
      });
    }
  };

  const handleEditQuiz = (quiz: ClassroomQuiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title,
      due_date: quiz.settings.due_date ? new Date(quiz.settings.due_date).toISOString().slice(0, 16) : '',
      time_limit: quiz.settings.time_limit || 60,
      allow_multiple_attempts: quiz.settings.allow_multiple_attempts || false
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz) return;

    try {
      // Validate due date
      if (formData.due_date) {
        const dueDate = new Date(formData.due_date);
        const now = new Date();
        if (dueDate < now) {
          toast({
            title: "Invalid Due Date",
            description: "Due date cannot be in the past. Please select a future date.",
            variant: "destructive",
          });
          return;
        }
      }

      // Validate time limit
      if (formData.time_limit < 10) {
        toast({
          title: "Invalid Time Limit",
          description: "Time limit must be at least 10 minutes.",
          variant: "destructive",
        });
        return;
      }

      if (formData.time_limit > 300) {
        toast({
          title: "Invalid Time Limit",
          description: "Time limit cannot exceed 300 minutes (5 hours).",
          variant: "destructive",
        });
        return;
      }

      // Clean up formData - convert empty strings to undefined
      const cleanedData = {
        ...formData,
        due_date: formData.due_date || undefined
      };

      await updateQuizMutation.mutateAsync({
        classroomSlug,
        quizId: editingQuiz.id,
        data: cleanedData
      });

      toast({
        title: "Success",
        description: "Quiz updated successfully",
      });

      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update quiz",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await deleteQuizMutation.mutateAsync({
        classroomSlug,
        quizId
      });

      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quiz",
        variant: "destructive",
      });
    }
  };

  const handleViewResults = async (quiz: ClassroomQuiz) => {
    setSelectedQuizForResults(quiz);
    setIsLoadingSubmissions(true);

    if (quiz.questions && Array.isArray(quiz.questions)) {
      // Parse questions and ensure options are arrays
      const parsedQuestions = quiz.questions.map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answer: typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[')
          ? JSON.parse(q.correct_answer)
          : q.correct_answer
      }));
      setQuestions(parsedQuestions);
    }

    // Fetch submissions
    try {
      const response = await fetch(`/api/classroom/${classroomSlug}/quizzes/${quiz.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setSubmissions([]);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleTakeQuiz = (quizId: number) => {
    // Navigate to quiz taking page
    router.push(`/classroom/${classroomSlug}/quiz/${quizId}`);
  };

  const canManageQuizzes = classroom?.user_role === 'owner' || classroom?.user_role === 'tutor';

  // Check if student has submitted a quiz
  useEffect(() => {
    const checkStudentSubmissions = async () => {
      if (!currentUser || canManageQuizzes) return;

      const statusMap: Record<number, any> = {};

      for (const quiz of quizzes) {
        try {
          const response = await fetch(`/api/classroom/${classroomSlug}/quizzes/${quiz.id}?checkStatus=true`);
          if (response.ok) {
            const data = await response.json();
            if (!data.canTakeQuiz && data.reason === 'already_submitted') {
              statusMap[quiz.id] = data.submission;
            }
          }
        } catch (error) {
          console.error('Error checking submission status:', error);
        }
      }

      setStudentSubmissionStatus(statusMap);
    };

    if (quizzes.length > 0) {
      checkStudentSubmissions();
    }
  }, [quizzes, currentUser, canManageQuizzes, classroomSlug]);

  const handleBackFromResults = () => {
    setSelectedQuizForResults(null);
    setSelectedSubmission(null);
    setQuestions([]);
  };

  const handleViewSubmissionDetail = (submission: any) => {
    setSelectedSubmission(submission);
  };

  const handleBackFromSubmissionDetail = () => {
    setSelectedSubmission(null);
  };

  const handleEditQuestions = async (quiz: ClassroomQuiz) => {
    setSelectedQuizForQuestions(quiz);
    // Load existing questions from the quiz
    if (quiz.questions && Array.isArray(quiz.questions)) {
      // Parse questions and ensure options are arrays
      const parsedQuestions = quiz.questions.map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answer: typeof q.correct_answer === 'string' && q.correct_answer.startsWith('[')
          ? JSON.parse(q.correct_answer)
          : q.correct_answer
      }));
      setQuestions(parsedQuestions);
    } else {
      setQuestions([]);
    }
  };

  const handleAddQuestion = () => {
    setIsAddingQuestion(true);
    setNewQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      order_index: questions.length,
      options: ['', '', '', ''],
      correct_answer: ''
    });
  };

  const handleSaveQuestion = () => {
    if (!newQuestion.question_text.trim()) {
      toast({
        title: "Error",
        description: "Question text is required",
        variant: "destructive",
      });
      return;
    }

    if (newQuestion.question_type === 'multiple_choice') {
      const validOptions = newQuestion.options?.filter(opt => opt.trim()) || [];
      if (validOptions.length < 2) {
        toast({
          title: "Error",
          description: "Multiple choice questions need at least 2 options",
          variant: "destructive",
        });
        return;
      }
      if (!newQuestion.correct_answer) {
        toast({
          title: "Error",
          description: "Please select the correct answer",
          variant: "destructive",
        });
        return;
      }
    }

    setQuestions([...questions, { ...newQuestion, order_index: questions.length }]);
    setIsAddingQuestion(false);
    toast({
      title: "Success",
      description: "Question added successfully",
    });
  };

  const handleDeleteQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions.map((q, i) => ({ ...q, order_index: i })));
    toast({
      title: "Success",
      description: "Question deleted successfully",
    });
  };

  const handleSaveAllQuestions = async () => {
    if (!selectedQuizForQuestions) return;

    try {
      // Save questions to the quiz
      await updateQuizMutation.mutateAsync({
        classroomSlug,
        quizId: selectedQuizForQuestions.id,
        data: {
          questions: questions
        }
      });

      toast({
        title: "Success",
        description: "Questions saved successfully",
      });

      setSelectedQuizForQuestions(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save questions",
        variant: "destructive",
      });
    }
  };

  const handleBackToQuizList = () => {
    setSelectedQuizForQuestions(null);
    setQuestions([]);
    setIsAddingQuestion(false);
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getQuizStatus = (quiz: ClassroomQuiz) => {
    // Three states: draft, published, closed
    if (quiz.total_questions === 0) {
      return 'draft';
    }
    if (quiz.settings.due_date && isOverdue(quiz.settings.due_date)) {
      return 'closed';
    }
    return 'published';
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
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  if (!classroom || isQuizzesLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  const publishedQuizzes = quizzes.filter((q: ClassroomQuiz) => getQuizStatus(q) === 'published');
  const draftQuizzes = quizzes.filter((q: ClassroomQuiz) => getQuizStatus(q) === 'draft');
  const closedQuizzes = quizzes.filter((q: ClassroomQuiz) => getQuizStatus(q) === 'closed');

  // Get classroom color
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');

  // If viewing submission detail
  if (selectedSubmission && selectedQuizForResults) {
    const studentAnswers = selectedSubmission.answers || {};

    return (
      <div className="min-h-screen">
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBackFromSubmissionDetail} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedQuizForResults.title}</h1>
              <p className="text-muted-foreground mt-2">
                {selectedSubmission.student?.display_name || selectedSubmission.student?.full_name || 'Student'}'s Submission
              </p>
            </div>
          </div>

          {/* Submission Summary */}
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }} className="mb-6">
            <CardHeader>
              <CardTitle>Submission Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">
                    {selectedSubmission.score}/{selectedSubmission.max_score}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({((selectedSubmission.score / selectedSubmission.max_score) * 100).toFixed(1)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                  <p className="text-lg font-medium">
                    {Math.floor((selectedSubmission.time_taken_seconds || 0) / 60)}m{' '}
                    {(selectedSubmission.time_taken_seconds || 0) % 60}s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Questions</p>
                  <p className="text-lg font-medium">{questions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Answers */}
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader>
              <CardTitle>Answer Details</CardTitle>
              <CardDescription>Review each question and answer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {questions.map((question, index) => {
                  const studentAnswer = studentAnswers[index];
                  const isCorrect = question.question_type === 'multiple_choice' || question.question_type === 'true_false'
                    ? studentAnswer === question.correct_answer
                    : null;
                  const isAnswered = studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

                  return (
                    <div key={index} className="pb-6 border-b last:border-b-0">
                      <div className="mb-3">
                        <div className="flex items-start gap-3">
                          <span className="font-semibold">Q{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-medium">{question.question_text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">({question.points} points)</span>
                              {isCorrect === true && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Correct
                                </Badge>
                              )}
                              {isCorrect === false && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Incorrect
                                </Badge>
                              )}
                              {!isAnswered && (
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Not Answered
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {question.question_type === 'multiple_choice' && question.options && Array.isArray(question.options) && (
                        <div className="ml-8 space-y-2">
                          {question.options.filter((opt: string) => opt && opt.trim()).map((option: string, optIndex: number) => {
                            const isStudentAnswer = option === studentAnswer;
                            const isCorrectAnswer = option === question.correct_answer;

                            return (
                              <div
                                key={optIndex}
                                className={`p-3 rounded border ${isCorrectAnswer
                                  ? 'bg-green-50 border-green-200'
                                  : isStudentAnswer
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-gray-100/5 hover:bg-gray-200/8'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${isCorrectAnswer ? 'text-green-700' : isStudentAnswer ? 'text-red-700' : ''
                                    }`}>
                                    {String.fromCharCode(65 + optIndex)}. {option}
                                  </span>
                                  {isCorrectAnswer && (
                                    <Badge className="bg-green-600 text-white">Correct Answer</Badge>
                                  )}
                                  {isStudentAnswer && !isCorrectAnswer && (
                                    <Badge className="bg-red-600 text-white">Student's Answer</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {question.question_type === 'true_false' && (
                        <div className="ml-8 space-y-2">
                          {['True', 'False'].map((option) => {
                            const isStudentAnswer = option === studentAnswer;
                            const isCorrectAnswer = option === question.correct_answer;

                            return (
                              <div
                                key={option}
                                className={`p-3 rounded border ${isCorrectAnswer
                                  ? 'bg-green-50 border-green-200'
                                  : isStudentAnswer
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-gray-50 border-gray-200'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${isCorrectAnswer ? 'text-green-700' : isStudentAnswer ? 'text-red-700' : ''
                                    }`}>
                                    {option}
                                  </span>
                                  {isCorrectAnswer && (
                                    <Badge className="bg-green-600 text-white">Correct Answer</Badge>
                                  )}
                                  {isStudentAnswer && !isCorrectAnswer && (
                                    <Badge className="bg-red-600 text-white">Student's Answer</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {question.question_type === 'short_answer' && (
                        <div className="ml-8 space-y-3">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Student's Answer:</p>
                            <div className={`p-3 rounded border ${isAnswered ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                              }`}>
                              <p className="text-sm">
                                {isAnswered ? studentAnswer : 'No answer provided'}
                              </p>
                            </div>
                          </div>
                          {question.correct_answer && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Sample Answer:</p>
                              <div className="p-3 bg-green-50 rounded border border-green-200">
                                <p className="text-sm text-green-700">{question.correct_answer}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If viewing results, show results view (Tutor only - no student answers shown)
  if (selectedQuizForResults) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBackFromResults} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quiz List
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedQuizForResults.title}</h1>
              <p className="text-muted-foreground mt-2">Quiz Answer Key</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{questions.length}</div>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedQuizForResults.total_points}</div>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{submissions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {submissions.length === 0 ? 'No submissions yet' : `${submissions.length} student${submissions.length > 1 ? 's' : ''}`}
                </p>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {submissions.length > 0
                    ? `${(submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length).toFixed(1)}%`
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {submissions.length > 0 && `out of ${selectedQuizForResults.total_points} pts`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Student Submissions */}
          {submissions.length > 0 && (
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }} className="mb-6">
              <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>Click on a student to view their detailed answers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submissions.map((submission: any) => {
                    const percentage = submission.max_score > 0
                      ? (submission.score / submission.max_score) * 100
                      : 0;
                    const timeMinutes = Math.floor((submission.time_taken_seconds || 0) / 60);
                    const timeSeconds = (submission.time_taken_seconds || 0) % 60;

                    return (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gray-100/5 dark:hover:bg-gray-200/8 cursor-pointer transition-colors"
                        onClick={() => handleViewSubmissionDetail(submission)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="font-medium">
                              {submission.student?.display_name || submission.student?.full_name || 'Unknown Student'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Submitted: {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Time Taken</p>
                            <p className="font-medium">{timeMinutes}m {timeSeconds}s</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Score</p>
                            <p className="text-lg font-bold">
                              {submission.score}/{submission.max_score}
                              <span className="text-sm text-muted-foreground ml-2">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </p>
                          </div>
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}


        </div>
      </div>
    );
  }

  // If editing questions, show question editor
  if (selectedQuizForQuestions) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto py-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBackToQuizList} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quiz List
            </Button>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{selectedQuizForQuestions.title}</h1>
                <p className="text-muted-foreground">
                  Add and manage questions for this quiz
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
                <Button onClick={handleSaveAllQuestions} disabled={updateQuizMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateQuizMutation.isPending ? 'Saving...' : 'Save All'}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Questions List */}
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader>
                <CardTitle>Questions ({questions.length})</CardTitle>
                <CardDescription>
                  Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={index} className="p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">Question {index + 1}</span>
                            <Badge variant="outline">{question.question_type.replace('_', ' ')}</Badge>
                            <Badge>{question.points} pts</Badge>
                          </div>
                          <p className="text-sm mb-2">{question.question_text}</p>
                          {question.question_type === 'multiple_choice' && question.options && Array.isArray(question.options) && (
                            <div className="ml-6 space-y-1">
                              {question.options.filter((opt: string) => opt && opt.trim()).map((option: string, optIndex: number) => (
                                <div key={optIndex} className="flex items-center gap-2 text-sm">
                                  <span className={option === question.correct_answer ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                                    {String.fromCharCode(65 + optIndex)}. {option}
                                    {option === question.correct_answer && ' ✓'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {question.question_type === 'true_false' && (
                            <div className="ml-6 text-sm">
                              <span className="text-green-600 font-medium">
                                Correct Answer: {question.correct_answer}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {questions.length === 0 && !isAddingQuestion && (
                    <div className="text-center py-8">
                      <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">No questions yet</h3>
                      <p className="text-muted-foreground">Add your first question to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add Question Form */}
            {isAddingQuestion && (
              <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
                <CardHeader>
                  <CardTitle>Add New Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Question Type</Label>
                      <Select
                        value={newQuestion.question_type}
                        onValueChange={(value: QuestionType) =>
                          setNewQuestion({ ...newQuestion, question_type: value, options: value === 'multiple_choice' ? ['', '', '', ''] : undefined })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Question Text</Label>
                      <Textarea
                        value={newQuestion.question_text}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                        placeholder="Enter your question"
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        value={newQuestion.points}
                        onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                        min="1"
                      />
                    </div>

                    {newQuestion.question_type === 'multiple_choice' && (
                      <div className="space-y-4">
                        <Label>Options</Label>
                        {newQuestion.options?.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-8">{String.fromCharCode(65 + index)}.</span>
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(newQuestion.options || [])];
                                newOptions[index] = e.target.value;
                                setNewQuestion({ ...newQuestion, options: newOptions });
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            />
                          </div>
                        ))}
                        <div className="grid gap-2">
                          <Label>Correct Answer</Label>
                          <RadioGroup
                            value={newQuestion.correct_answer as string}
                            onValueChange={(value) => setNewQuestion({ ...newQuestion, correct_answer: value })}
                          >
                            {newQuestion.options?.filter(opt => opt.trim()).map((option, index) => {
                              const uniqueId = `new-question-option-${index}-${Date.now()}`;
                              return (
                                <div key={index} className="flex items-center space-x-2">
                                  <RadioGroupItem value={option} id={uniqueId} />
                                  <Label htmlFor={uniqueId} className="cursor-pointer">
                                    {String.fromCharCode(65 + index)}. {option}
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </div>
                      </div>
                    )}

                    {newQuestion.question_type === 'true_false' && (
                      <div className="grid gap-2">
                        <Label>Correct Answer</Label>
                        <RadioGroup
                          value={newQuestion.correct_answer as string}
                          onValueChange={(value) => setNewQuestion({ ...newQuestion, correct_answer: value })}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="True" id="true" />
                            <Label htmlFor="true">True</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="False" id="false" />
                            <Label htmlFor="false">False</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {newQuestion.question_type === 'short_answer' && (
                      <div className="grid gap-2">
                        <Label>Sample Answer (Optional)</Label>
                        <Textarea
                          value={newQuestion.correct_answer as string || ''}
                          onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                          placeholder="Enter a sample answer for reference"
                          rows={2}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={handleSaveQuestion}>
                        Add Question
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddingQuestion(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
              <p className="text-muted-foreground">
                Manage quizzes for {classroom.name}
              </p>
            </div>
            {canManageQuizzes && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Quiz</DialogTitle>
                    <DialogDescription>
                      Create a new quiz for your classroom.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Quiz title"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col">
                        <Label htmlFor="due_date" className="pb-2">Due Date (Optional)</Label>
                        <Input
                          id="due_date"
                          type="datetime-local"
                          value={formData.due_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                          className="max-w-[50px]"
                        />
                      </div>
                      <div className="flex flex-col">
                        <Label htmlFor="time_limit" className="pb-2">Time Limit (minutes)</Label>
                        <Input
                          id="time_limit"
                          type="number"
                          value={formData.time_limit}
                          onChange={(e) => setFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 10 }))}
                          min="10"
                          max="300"
                          className="w-[150px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Min: 10, Max: 300</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Note: Add questions to the quiz after creating it.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateQuiz}
                      disabled={!formData.title || createQuizMutation.isPending}
                    >
                      {createQuizMutation.isPending ? 'Creating...' : 'Create Quiz'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quizzes.length}</div>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{publishedQuizzes.length}</div>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{draftQuizzes.length}</div>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed</CardTitle>
                <XCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{closedQuizzes.length}</div>
              </CardContent>
            </Card>
            <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quizzes.reduce((acc: number, q: ClassroomQuiz) => acc + q.total_questions, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quizzes List */}
          <Card style={{ backgroundColor: cardStyling.backgroundColor, borderColor: cardStyling.borderColor }}>
            <CardHeader>
              <CardTitle>All Quizzes</CardTitle>
              <CardDescription>
                View and manage classroom quizzes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No quizzes yet</h3>
                  <p className="text-muted-foreground">
                    {canManageQuizzes ? 'Create your first quiz' : 'No quizzes have been created'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz: ClassroomQuiz) => {
                    const status = getQuizStatus(quiz);
                    const dueDate = quiz.settings.due_date;
                    const timeLimit = quiz.settings.time_limit;
                    const allowMultipleAttempts = quiz.settings.allow_multiple_attempts;
                    const studentSubmission = studentSubmissionStatus[quiz.id];
                    const hasSubmitted = !!studentSubmission;

                    return (
                      <div
                        key={quiz.id}
                        className="p-4 bg-gray-100/5 dark:hover:bg-gray-200/8 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(status)}
                              <h3 className="font-semibold">{quiz.title}</h3>
                              <Badge variant={getStatusBadgeVariant(status)}>
                                {status.toUpperCase()}
                              </Badge>
                              {hasSubmitted && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  SUBMITTED
                                </Badge>
                              )}
                              {allowMultipleAttempts && (
                                <Badge variant="outline">Multiple Attempts</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                              {dueDate && (
                                <div>
                                  <span className="text-muted-foreground">Due:</span>
                                  <p className="font-medium">
                                    {new Date(dueDate).toLocaleDateString()} at{' '}
                                    {new Date(dueDate).toLocaleTimeString()}
                                  </p>
                                </div>
                              )}
                              {timeLimit && (
                                <div>
                                  <span className="text-muted-foreground">Time Limit:</span>
                                  <p className="font-medium">{timeLimit} minutes</p>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Questions:</span>
                                <p className="font-medium">{quiz.total_questions}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Points:</span>
                                <p className="font-medium">{quiz.total_points}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {/* Students can take quiz if it's published or closed and not submitted */}
                            {(status === 'published' || status === 'closed') && !canManageQuizzes && !hasSubmitted && (
                              <Button
                                variant={status === 'closed' ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleTakeQuiz(quiz.id)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                {status === 'closed' ? 'View Quiz' : 'Take Quiz'}
                              </Button>
                            )}
                            {/* Show submission info for students who submitted */}
                            {hasSubmitted && !canManageQuizzes && (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Your Score</p>
                                <p className="text-lg font-bold">
                                  {studentSubmission.score}/{studentSubmission.max_score}
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({((studentSubmission.score / studentSubmission.max_score) * 100).toFixed(1)}%)
                                  </span>
                                </p>
                              </div>
                            )}
                            {/* Tutors can view results for published or closed quizzes */}
                            {(status === 'published' || status === 'closed') && canManageQuizzes && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewResults(quiz)}
                              >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Results
                              </Button>
                            )}
                            {canManageQuizzes && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditQuiz(quiz)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Quiz Settings
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditQuestions(quiz)}>
                                    <HelpCircle className="h-4 w-4 mr-2" />
                                    Edit Questions
                                  </DropdownMenuItem>
                                  {status === 'published' && (
                                    <DropdownMenuItem onClick={() => handleViewResults(quiz)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Results
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Quiz
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Quiz Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Quiz</DialogTitle>
              <DialogDescription>
                Update the quiz settings.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Quiz title"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col">
                  <Label htmlFor="edit-due_date"  className="pb-2" >Due Date (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="edit-due_date"
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full max-w-[250px]"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="edit-time_limit" className="pb-2">Time Limit (minutes)</Label>
                  <Input
                    id="edit-time_limit"
                    type="number"
                    value={formData.time_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 10 }))}
                    min="10"
                    max="300"
                    className="max-w-[150px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Min: 10, Max: 300</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-allow_multiple_attempts"
                  checked={formData.allow_multiple_attempts}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_multiple_attempts: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="edit-allow_multiple_attempts">Allow multiple attempts</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateQuiz}
                disabled={!formData.title || updateQuizMutation.isPending}
              >
                {updateQuizMutation.isPending ? 'Updating...' : 'Update Quiz'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
