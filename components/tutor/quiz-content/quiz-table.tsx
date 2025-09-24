'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Trash2, 
  Plus, 
  Bot, 
  Search,
  Filter,
  Users,
  Clock,
  Trophy,
  ChevronDown
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useQuizList } from '@/hooks/course/use-quiz';
import { AddQuizManual } from './add-quiz-manual';
import { AddQuizAI } from './add-quiz-ai';
import { EditQuiz } from './edit-quiz';
import { RemoveQuiz } from './remove-quiz';
import { PreviewQuiz } from './preview-quiz';
import { ViewQuizSubmission } from './view-quiz-submission';

interface QuizTableProps {
  lessonId?: string;
  showLessonFilter?: boolean;
}

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';

interface QuizQuestion {
  id: number;
  public_id: string;
  lesson_id: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  correct_answer: any;
  explanation?: string;
  points: number;
  difficulty: number;
  position: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Additional fields for display
  lesson_title?: string;
  submission_count?: number;
}

export function QuizTable({ lessonId, showLessonFilter = true }: QuizTableProps) {
  const t = useTranslations('QuizTable');
  const [searchQuery, setSearchQuery] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizQuestion | null>(null);
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [isAddAIOpen, setIsAddAIOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);

  const { quizData, isLoading, error } = useQuizList();

  // Process quiz data - group by lesson if needed
  const quizzes: QuizQuestion[] = Array.isArray(quizData) ? quizData : [];

  // Filter quizzes based on search and filters
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quiz.lesson_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = questionTypeFilter === 'all' || quiz.question_type === questionTypeFilter;
    const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty.toString() === difficultyFilter;
    const matchesLesson = !lessonId || quiz.lesson_id === lessonId;
    
    return matchesSearch && matchesType && matchesDifficulty && matchesLesson;
  });

  const getQuestionTypeLabel = (type: QuestionType) => {
    const typeLabels = {
      multiple_choice: t('question_type_multiple_choice'),
      true_false: t('question_type_true_false'),
      short_answer: t('question_type_short_answer'),
      essay: t('question_type_essay'),
      fill_blank: t('question_type_fill_blank')
    };
    return typeLabels[type] || type;
  };

  const getDifficultyLabel = (difficulty: number) => {
    const labels = {
      1: t('difficulty_easy'),
      2: t('difficulty_medium'),
      3: t('difficulty_hard'),
      4: t('difficulty_expert'),
      5: t('difficulty_master')
    };
    return labels[difficulty as keyof typeof labels] || `${difficulty}`;
  };

  const getDifficultyColor = (difficulty: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      2: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      4: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      5: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const handleEditQuiz = (quiz: QuizQuestion) => {
    setSelectedQuiz(quiz);
    setIsEditOpen(true);
  };

  const handleRemoveQuiz = (quiz: QuizQuestion) => {
    setSelectedQuiz(quiz);
    setIsRemoveOpen(true);
  };

  const handlePreviewQuiz = (quiz: QuizQuestion) => {
    setSelectedQuiz(quiz);
    setIsPreviewOpen(true);
  };

  const handleViewSubmissions = (quiz: QuizQuestion) => {
    setSelectedQuiz(quiz);
    setIsSubmissionOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('loading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">{t('error_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 dark:text-red-400">{t('error_description')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {t('quiz_management')}
                </CardTitle>
                <CardDescription>{t('quiz_management_description')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={isAddManualOpen} onOpenChange={setIsAddManualOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('add_manual')}
                    </Button>
                  </DialogTrigger>
                  <AddQuizManual
                    lessonId={lessonId}
                    open={isAddManualOpen}
                    onOpenChange={setIsAddManualOpen}
                  />
                </Dialog>
                
                <Dialog open={isAddAIOpen} onOpenChange={setIsAddAIOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Bot className="h-4 w-4 mr-2" />
                      {t('add_ai')}
                    </Button>
                  </DialogTrigger>
                  <AddQuizAI
                    lessonId={lessonId}
                    open={isAddAIOpen}
                    onOpenChange={setIsAddAIOpen}
                  />
                </Dialog>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={questionTypeFilter} onValueChange={setQuestionTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('filter_by_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_types')}</SelectItem>
                  <SelectItem value="multiple_choice">{t('question_type_multiple_choice')}</SelectItem>
                  <SelectItem value="true_false">{t('question_type_true_false')}</SelectItem>
                  <SelectItem value="short_answer">{t('question_type_short_answer')}</SelectItem>
                  <SelectItem value="essay">{t('question_type_essay')}</SelectItem>
                  <SelectItem value="fill_blank">{t('question_type_fill_blank')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('filter_by_difficulty')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_difficulties')}</SelectItem>
                  <SelectItem value="1">{t('difficulty_easy')}</SelectItem>
                  <SelectItem value="2">{t('difficulty_medium')}</SelectItem>
                  <SelectItem value="3">{t('difficulty_hard')}</SelectItem>
                  <SelectItem value="4">{t('difficulty_expert')}</SelectItem>
                  <SelectItem value="5">{t('difficulty_master')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Quiz Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {t('total_questions')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                  {filteredQuizzes.length}
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {t('total_submissions')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                  {filteredQuizzes.reduce((sum, quiz) => sum + (quiz.submission_count || 0), 0)}
                </p>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    {t('avg_difficulty')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                  {filteredQuizzes.length > 0 
                    ? (filteredQuizzes.reduce((sum, quiz) => sum + quiz.difficulty, 0) / filteredQuizzes.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t('position')}</TableHead>
                    <TableHead className="min-w-[300px]">{t('question')}</TableHead>
                    <TableHead className="w-32">{t('type')}</TableHead>
                    <TableHead className="w-24">{t('difficulty')}</TableHead>
                    <TableHead className="w-20">{t('points')}</TableHead>
                    {showLessonFilter && <TableHead className="w-40">{t('lesson')}</TableHead>}
                    <TableHead className="w-32">{t('submissions')}</TableHead>
                    <TableHead className="w-32">{t('created_at')}</TableHead>
                    <TableHead className="w-20">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuizzes.length === 0 ? (
                    <TableRow>
                      <TableCell 
                        colSpan={showLessonFilter ? 9 : 8} 
                        className="text-center py-8 text-gray-500 dark:text-gray-400"
                      >
                        {t('no_quizzes_found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuizzes.map((quiz) => (
                      <TableRow key={quiz.id}>
                        <TableCell className="font-medium">
                          {quiz.position}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-sm">
                            <p className="font-medium truncate">{quiz.question_text}</p>
                            {quiz.explanation && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate cursor-help">
                                    {quiz.explanation}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <p>{quiz.explanation}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getQuestionTypeLabel(quiz.question_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDifficultyColor(quiz.difficulty)}>
                            {getDifficultyLabel(quiz.difficulty)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{quiz.points}</span>
                        </TableCell>
                        {showLessonFilter && (
                          <TableCell>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {quiz.lesson_title || `Lesson ${quiz.lesson_id}`}
                            </span>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{quiz.submission_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handlePreviewQuiz(quiz)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('preview')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditQuiz(quiz)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewSubmissions(quiz)}>
                                <Users className="h-4 w-4 mr-2" />
                                {t('view_submissions')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRemoveQuiz(quiz)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        {selectedQuiz && (
          <>
            <EditQuiz
              quiz={selectedQuiz}
              open={isEditOpen}
              onOpenChange={setIsEditOpen}
              onSuccess={() => {
                setIsEditOpen(false);
                setSelectedQuiz(null);
              }}
            />
            
            <RemoveQuiz
              quiz={selectedQuiz}
              open={isRemoveOpen}
              onOpenChange={setIsRemoveOpen}
              onSuccess={() => {
                setIsRemoveOpen(false);
                setSelectedQuiz(null);
              }}
            />
            
            <PreviewQuiz
              quiz={selectedQuiz}
              open={isPreviewOpen}
              onOpenChange={setIsPreviewOpen}
            />
            
            <ViewQuizSubmission
              quiz={selectedQuiz}
              open={isSubmissionOpen}
              onOpenChange={setIsSubmissionOpen}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}