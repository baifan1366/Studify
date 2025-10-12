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
  HelpCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  BarChart3
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getCardStyling, getClassroomColor, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface ClassroomQuizPageProps {
  classroomSlug: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  due_date: string;
  time_limit: number; // in minutes
  total_questions: number;
  total_points: number;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  attempts_count: number;
  total_students: number;
  allow_multiple_attempts: boolean;
}

export function ClassroomQuizPage({ classroomSlug }: ClassroomQuizPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('ClassroomQuiz');
  const { data: currentUser } = useUser();
  const [classroom, setClassroom] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    time_limit: 60,
    total_questions: 10,
    total_points: 100,
    status: 'draft' as 'draft' | 'published' | 'closed',
    allow_multiple_attempts: false
  });

  // Mock quizzes data - replace with actual API call
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    {
      id: '1',
      title: 'Math Chapter 3 Quiz',
      description: 'Test your understanding of algebraic equations',
      due_date: '2024-01-15T23:59:00Z',
      time_limit: 45,
      total_questions: 15,
      total_points: 150,
      status: 'published',
      created_at: '2024-01-01T10:00:00Z',
      attempts_count: 20,
      total_students: 25,
      allow_multiple_attempts: false
    },
    {
      id: '2',
      title: 'Science Lab Safety Quiz',
      description: 'Important safety protocols for laboratory work',
      due_date: '2024-01-20T23:59:00Z',
      time_limit: 30,
      total_questions: 20,
      total_points: 100,
      status: 'published',
      created_at: '2024-01-05T14:00:00Z',
      attempts_count: 18,
      total_students: 25,
      allow_multiple_attempts: true
    },
    {
      id: '3',
      title: 'History Timeline Quiz',
      description: 'Test your knowledge of World War II events',
      due_date: '2024-01-25T23:59:00Z',
      time_limit: 60,
      total_questions: 25,
      total_points: 200,
      status: 'draft',
      created_at: '2024-01-08T09:00:00Z',
      attempts_count: 0,
      total_students: 25,
      allow_multiple_attempts: false
    }
  ]);

  const { data: classroomsData } = useClassrooms();

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
      description: '',
      due_date: '',
      time_limit: 60,
      total_questions: 10,
      total_points: 100,
      status: 'draft',
      allow_multiple_attempts: false
    });
    setEditingQuiz(null);
  };

  const handleCreateQuiz = async () => {
    try {
      const newQuiz: Quiz = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date,
        time_limit: formData.time_limit,
        total_questions: formData.total_questions,
        total_points: formData.total_points,
        status: formData.status,
        created_at: new Date().toISOString(),
        attempts_count: 0,
        total_students: 25, // This would come from classroom data
        allow_multiple_attempts: formData.allow_multiple_attempts
      };

      setQuizzes(prev => [...prev, newQuiz]);
      
      toast({
        title: "Success",
        description: "Quiz created successfully",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz",
        variant: "destructive",
      });
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title,
      description: quiz.description,
      due_date: new Date(quiz.due_date).toISOString().slice(0, 16),
      time_limit: quiz.time_limit,
      total_questions: quiz.total_questions,
      total_points: quiz.total_points,
      status: quiz.status,
      allow_multiple_attempts: quiz.allow_multiple_attempts
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz) return;

    try {
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === editingQuiz.id 
          ? {
              ...quiz,
              title: formData.title,
              description: formData.description,
              due_date: formData.due_date,
              time_limit: formData.time_limit,
              total_questions: formData.total_questions,
              total_points: formData.total_points,
              status: formData.status,
              allow_multiple_attempts: formData.allow_multiple_attempts
            }
          : quiz
      ));
      
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

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      
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

  const handleViewResults = (quizId: string) => {
    // Navigate to quiz results page
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? `/tutor/classroom/${classroomSlug}/quiz/${quizId}/results`
      : `/classroom/${classroomSlug}/quiz/${quizId}/results`;
    router.push(route);
  };

  const handleTakeQuiz = (quizId: string) => {
    // Navigate to quiz taking page
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? `/tutor/classroom/${classroomSlug}/quiz/${quizId}/take`
      : `/classroom/${classroomSlug}/quiz/${quizId}/take`;
    router.push(route);
  };

  const handleEditQuestions = (quizId: string) => {
    // Navigate to quiz builder page
    const isTutor = currentUser?.profile?.role === 'tutor';
    const route = isTutor 
      ? `/tutor/classroom/${classroomSlug}/quiz/${quizId}/edit`
      : `/classroom/${classroomSlug}/quiz/${quizId}/edit`;
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
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const canManageQuizzes = classroom?.user_role === 'owner' || classroom?.user_role === 'tutor';

  if (!classroom) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }
  const publishedQuizzes = quizzes.filter(q => q.status === 'published');
  const draftQuizzes = quizzes.filter(q => q.status === 'draft');
  const closedQuizzes = quizzes.filter(q => q.status === 'closed');

  // Get classroom color
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');

  return (
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
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Quiz description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="datetime-local"
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                      <Input
                        id="time_limit"
                        type="number"
                        value={formData.time_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 0 }))}
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="total_questions">Total Questions</Label>
                      <Input
                        id="total_questions"
                        type="number"
                        value={formData.total_questions}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_questions: parseInt(e.target.value) || 0 }))}
                        min="1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="total_points">Total Points</Label>
                      <Input
                        id="total_points"
                        type="number"
                        value={formData.total_points}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_points: parseInt(e.target.value) || 0 }))}
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allow_multiple_attempts"
                      checked={formData.allow_multiple_attempts}
                      onChange={(e) => setFormData(prev => ({ ...prev, allow_multiple_attempts: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="allow_multiple_attempts">Allow multiple attempts</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateQuiz}
                    disabled={!formData.title || !formData.due_date}
                  >
                    Create Quiz
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {publishedQuizzes.length > 0 
                  ? Math.round((publishedQuizzes.reduce((acc, q) => acc + q.attempts_count, 0) / (publishedQuizzes.length * 25)) * 100)
                  : 0}%
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
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className={`p-4 border rounded-lg ${isOverdue(quiz.due_date) && quiz.status === 'published' ? 'border-red-200 bg-red-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(quiz.status)}
                          <h3 className="font-semibold">{quiz.title}</h3>
                          <Badge variant={getStatusBadgeVariant(quiz.status)}>
                            {quiz.status.toUpperCase()}
                          </Badge>
                          {isOverdue(quiz.due_date) && quiz.status === 'published' && (
                            <Badge variant="destructive">OVERDUE</Badge>
                          )}
                          {quiz.allow_multiple_attempts && (
                            <Badge variant="outline">Multiple Attempts</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{quiz.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Due:</span>
                            <p className="font-medium">
                              {new Date(quiz.due_date).toLocaleDateString()} at{' '}
                              {new Date(quiz.due_date).toLocaleTimeString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time Limit:</span>
                            <p className="font-medium">{quiz.time_limit} minutes</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Questions:</span>
                            <p className="font-medium">{quiz.total_questions}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Attempts:</span>
                            <p className="font-medium">
                              {quiz.attempts_count}/{quiz.total_students}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Progress:</span>
                            <Progress 
                              value={(quiz.attempts_count / quiz.total_students) * 100} 
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {quiz.status === 'published' && !canManageQuizzes && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleTakeQuiz(quiz.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Take Quiz
                          </Button>
                        )}
                        {quiz.status === 'published' && canManageQuizzes && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResults(quiz.id)}
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
                              <DropdownMenuItem onClick={() => handleEditQuestions(quiz.id)}>
                                <HelpCircle className="h-4 w-4 mr-2" />
                                Edit Questions
                              </DropdownMenuItem>
                              {quiz.status === 'published' && (
                                <DropdownMenuItem onClick={() => handleViewResults(quiz.id)}>
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
                ))}
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
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Quiz description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-due_date">Due Date</Label>
                <Input
                  id="edit-due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-time_limit">Time Limit (minutes)</Label>
                <Input
                  id="edit-time_limit"
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-total_questions">Total Questions</Label>
                <Input
                  id="edit-total_questions"
                  type="number"
                  value={formData.total_questions}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_questions: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-total_points">Total Points</Label>
                <Input
                  id="edit-total_points"
                  type="number"
                  value={formData.total_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_points: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
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
              disabled={!formData.title || !formData.due_date}
            >
              Update Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
