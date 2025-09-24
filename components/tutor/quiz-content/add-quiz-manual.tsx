'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Move, AlertCircle, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string | boolean;
  explanation: string;
  points: number;
  difficulty: number;
  position: number;
}

interface AddQuizManualProps {
  lessonId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddQuizManual({ lessonId, open, onOpenChange, onSuccess }: AddQuizManualProps) {
  const t = useTranslations('AddQuizManual');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createEmptyQuestion = (): QuizQuestion => ({
    id: `temp-${Date.now()}-${Math.random()}`,
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    points: 1,
    difficulty: 1,
    position: questions.length + 1,
  });

  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion()]);
  };

  const removeQuestion = (id: string) => {
    const updatedQuestions = questions.filter(q => q.id !== id);
    // Update positions
    const reorderedQuestions = updatedQuestions.map((q, index) => ({
      ...q,
      position: index + 1,
    }));
    setQuestions(reorderedQuestions);
    
    // Clear errors for removed question
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`${id}-`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const updateQuestion = (id: string, field: keyof QuizQuestion, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
    
    // Clear related errors
    const errorKey = `${id}-${field}`;
    if (errors[errorKey]) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) }
        : q
    ));
  };

  const validateQuestions = (): boolean => {
    const newErrors: Record<string, string> = {};

    questions.forEach(question => {
      // Required fields
      if (!question.question_text.trim()) {
        newErrors[`${question.id}-question_text`] = t('question_text_required');
      }

      // Question type specific validation
      if (question.question_type === 'multiple_choice') {
        const filledOptions = question.options.filter(opt => opt.trim() !== '');
        if (filledOptions.length < 2) {
          newErrors[`${question.id}-options`] = t('minimum_options_required');
        }
        if (!question.correct_answer || !question.options.includes(question.correct_answer as string)) {
          newErrors[`${question.id}-correct_answer`] = t('valid_correct_answer_required');
        }
      } else if (question.question_type === 'true_false') {
        if (question.correct_answer !== true && question.correct_answer !== false) {
          newErrors[`${question.id}-correct_answer`] = t('true_false_answer_required');
        }
      } else if (['short_answer', 'essay', 'fill_blank'].includes(question.question_type)) {
        if (!question.correct_answer || (question.correct_answer as string).trim() === '') {
          newErrors[`${question.id}-correct_answer`] = t('correct_answer_required');
        }
      }

      // Points validation
      if (question.points < 1 || question.points > 100) {
        newErrors[`${question.id}-points`] = t('points_range_error');
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateQuestions()) return;
    if (questions.length === 0) {
      setErrors({ general: t('no_questions_error') });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call using hooks
      // const { createQuizByLessonId } = useCreateQuizByLessonId({ lessonId: lessonId || '' });
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form
      setQuestions([]);
      setErrors({});
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      setErrors({ general: t('submit_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuestions([]);
    setErrors({});
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

  const renderQuestionForm = (question: QuizQuestion, index: number) => (
    <Card key={question.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t('question')} {index + 1}</Badge>
            <Badge className={`
              ${question.difficulty <= 2 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
              ${question.difficulty === 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' : ''}
              ${question.difficulty >= 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : ''}
            `}>
              {getDifficultyLabel(question.difficulty)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(question.id)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('remove_question')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Question Text */}
        <div className="space-y-2">
          <Label htmlFor={`${question.id}-text`}>
            {t('question_text')} <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id={`${question.id}-text`}
            placeholder={t('question_text_placeholder')}
            value={question.question_text}
            onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
            className={errors[`${question.id}-question_text`] ? 'border-red-500' : ''}
          />
          {errors[`${question.id}-question_text`] && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors[`${question.id}-question_text`]}
            </p>
          )}
        </div>

        {/* Question Type and Settings Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>{t('question_type')}</Label>
            <Select
              value={question.question_type}
              onValueChange={(value: QuestionType) => updateQuestion(question.id, 'question_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">{t('question_type_multiple_choice')}</SelectItem>
                <SelectItem value="true_false">{t('question_type_true_false')}</SelectItem>
                <SelectItem value="short_answer">{t('question_type_short_answer')}</SelectItem>
                <SelectItem value="essay">{t('question_type_essay')}</SelectItem>
                <SelectItem value="fill_blank">{t('question_type_fill_blank')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('points')}</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={question.points}
              onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 1)}
              className={errors[`${question.id}-points`] ? 'border-red-500' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('difficulty')}</Label>
            <Select
              value={question.difficulty.toString()}
              onValueChange={(value) => updateQuestion(question.id, 'difficulty', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('difficulty_easy')}</SelectItem>
                <SelectItem value="2">{t('difficulty_medium')}</SelectItem>
                <SelectItem value="3">{t('difficulty_hard')}</SelectItem>
                <SelectItem value="4">{t('difficulty_expert')}</SelectItem>
                <SelectItem value="5">{t('difficulty_master')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Question Type Specific Fields */}
        {question.question_type === 'multiple_choice' && (
          <div className="space-y-2">
            <Label>{t('options')} <span className="text-red-500">*</span></Label>
            <div className="space-y-2">
              {question.options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                    {String.fromCharCode(65 + idx)}
                  </Badge>
                  <Input
                    placeholder={t('option_placeholder', { letter: String.fromCharCode(65 + idx) })}
                    value={option}
                    onChange={(e) => updateOption(question.id, idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
            {errors[`${question.id}-options`] && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors[`${question.id}-options`]}
              </p>
            )}
            
            <div className="space-y-2">
              <Label>{t('correct_answer')} <span className="text-red-500">*</span></Label>
              <Select
                value={question.correct_answer as string}
                onValueChange={(value) => updateQuestion(question.id, 'correct_answer', value)}
              >
                <SelectTrigger className={errors[`${question.id}-correct_answer`] ? 'border-red-500' : ''}>
                  <SelectValue placeholder={t('select_correct_answer')} />
                </SelectTrigger>
                <SelectContent>
                  {question.options.map((option, idx) => (
                    option.trim() && (
                      <SelectItem key={idx} value={option}>
                        {String.fromCharCode(65 + idx)}: {option}
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {question.question_type === 'true_false' && (
          <div className="space-y-2">
            <Label>{t('correct_answer')} <span className="text-red-500">*</span></Label>
            <Select
              value={question.correct_answer?.toString()}
              onValueChange={(value) => updateQuestion(question.id, 'correct_answer', value === 'true')}
            >
              <SelectTrigger className={errors[`${question.id}-correct_answer`] ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('select_true_false')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('true')}</SelectItem>
                <SelectItem value="false">{t('false')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {['short_answer', 'essay', 'fill_blank'].includes(question.question_type) && (
          <div className="space-y-2">
            <Label>{t('correct_answer')} <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder={t('correct_answer_placeholder')}
              value={question.correct_answer as string}
              onChange={(e) => updateQuestion(question.id, 'correct_answer', e.target.value)}
              className={errors[`${question.id}-correct_answer`] ? 'border-red-500' : ''}
            />
          </div>
        )}

        {/* Explanation */}
        <div className="space-y-2">
          <Label>{t('explanation')}</Label>
          <Textarea
            placeholder={t('explanation_placeholder')}
            value={question.explanation}
            onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
          />
        </div>

        {/* Error Messages */}
        {Object.keys(errors).some(key => key.startsWith(`${question.id}-`)) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('question_has_errors')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('add_quiz_manual')}
            </DialogTitle>
            <DialogDescription>
              {t('add_quiz_manual_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((question, index) => renderQuestionForm(question, index))}
            </div>

            {/* Add Question Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('add_question')}
              </Button>
            </div>

            {/* Preview Summary */}
            {questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('quiz_summary')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{t('total_questions')}:</span>
                      <span className="ml-2">{questions.length}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t('total_points')}:</span>
                      <span className="ml-2">{questions.reduce((sum, q) => sum + q.points, 0)}</span>
                    </div>
                    <div>
                      <span className="font-medium">{t('avg_difficulty')}:</span>
                      <span className="ml-2">
                        {questions.length > 0 
                          ? (questions.reduce((sum, q) => sum + q.difficulty, 0) / questions.length).toFixed(1)
                          : '0.0'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">{t('question_types')}:</span>
                      <span className="ml-2">
                        {Array.from(new Set(questions.map(q => q.question_type))).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || questions.length === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('create_quiz')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}