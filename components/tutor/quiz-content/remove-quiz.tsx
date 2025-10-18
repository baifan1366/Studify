'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, AlertTriangle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface RemoveQuizProps {
  quiz: QuizQuestion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RemoveQuiz({ quiz, open, onOpenChange, onSuccess }: RemoveQuizProps) {
  const t = useTranslations('RemoveQuiz');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    
    try {
      // TODO: Implement actual API call using hooks
      // const { deleteQuizByLessonQuizId } = useDeleteQuizByLessonQuizId({ 
      //   lessonId: quiz.lesson_id, 
      //   quizId: quiz.public_id 
      // });
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      setError(t('delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onOpenChange(false);
  };

  const getQuestionTypeLabel = (type: QuestionType) => {
    const labels = {
      multiple_choice: t('question_type_multiple_choice'),
      true_false: t('question_type_true_false'),
      short_answer: t('question_type_short_answer'),
      essay: t('question_type_essay'),
      fill_blank: t('question_type_fill_blank')
    };
    return labels[type];
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

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
            {t('delete_quiz')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {t('delete_quiz_description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Quiz Information Card */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {t('position')} {quiz.position}
                  </Badge>
                  <Badge className={getDifficultyColor(quiz.difficulty)}>
                    {getDifficultyLabel(quiz.difficulty)}
                  </Badge>
                  <Badge variant="secondary">
                    {getQuestionTypeLabel(quiz.question_type)}
                  </Badge>
                  <Badge variant="secondary">
                    {quiz.points} {t('points')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Question Text */}
              <div>
                <h4 className="font-medium text-foreground mb-2">
                  {t('question_text')}:
                </h4>
                <p className="text-muted-foreground bg-muted p-3 rounded">
                  {truncateText(quiz.question_text)}
                </p>
              </div>

              {/* Preview based on question type */}
              {quiz.question_type === 'multiple_choice' && quiz.options && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    {t('options')}:
                  </h4>
                  <div className="space-y-1">
                    {quiz.options.slice(0, 2).map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-xs">
                          {String.fromCharCode(65 + idx)}
                        </Badge>
                        <span>{truncateText(option, 50)}</span>
                      </div>
                    ))}
                    {quiz.options.length > 2 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
                        {t('and_more_options', { count: quiz.options.length - 2 })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {quiz.question_type === 'true_false' && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    {t('correct_answer')}:
                  </h4>
                  <Badge className={quiz.correct_answer === true ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}>
                    {quiz.correct_answer === true ? t('true') : t('false')}
                  </Badge>
                </div>
              )}

              {['short_answer', 'essay', 'fill_blank'].includes(quiz.question_type) && quiz.correct_answer && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    {t('correct_answer')}:
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm">
                    {truncateText(quiz.correct_answer as string, 80)}
                  </p>
                </div>
              )}

              {quiz.explanation && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    {t('explanation')}:
                  </h4>
                  <p className="text-muted-foreground bg-muted p-2 rounded text-sm">
                    {truncateText(quiz.explanation, 80)}
                  </p>
                </div>
              )}

              {/* Additional Info */}
              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>{t('created')}: {new Date(quiz.created_at).toLocaleDateString()}</span>
                {quiz.submission_count !== undefined && (
                  <span>{t('submissions')}: {quiz.submission_count}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warning Message */}
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
              {quiz.submission_count && quiz.submission_count > 0 
                ? t('delete_warning_with_submissions', { count: quiz.submission_count })
                : t('delete_warning_no_submissions')
              }
            </AlertDescription>
          </Alert>

          {/* Impact Information */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">
              {t('deletion_impact')}:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {t('impact_question_removed')}</li>
              <li>• {t('impact_submissions_kept')}</li>
              <li>• {t('impact_position_reorder')}</li>
              <li>• {t('impact_cannot_undo')}</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {t('deleting')}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {t('delete_confirm')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}