'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Edit, Save, X, AlertCircle, Trash2 } from 'lucide-react';

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
}

interface EditQuizProps {
  quiz: QuizQuestion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditQuiz({ quiz, open, onOpenChange, onSuccess }: EditQuizProps) {
  const t = useTranslations('EditQuiz');
  const [editedQuiz, setEditedQuiz] = useState<QuizQuestion>(quiz);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update local state when quiz prop changes
  useEffect(() => {
    if (quiz) {
      setEditedQuiz({
        ...quiz,
        options: quiz.options || (quiz.question_type === 'multiple_choice' ? ['', '', '', ''] : [])
      });
      setErrors({});
    }
  }, [quiz]);

  const updateQuiz = (field: keyof QuizQuestion, value: any) => {
    setEditedQuiz(prev => ({ ...prev, [field]: value }));
    
    // Clear related errors
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(editedQuiz.options || [])];
    newOptions[optionIndex] = value;
    setEditedQuiz(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    const newOptions = [...(editedQuiz.options || []), ''];
    setEditedQuiz(prev => ({ ...prev, options: newOptions }));
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = editedQuiz.options?.filter((_, idx) => idx !== optionIndex) || [];
    setEditedQuiz(prev => ({ ...prev, options: newOptions }));
    
    // If the removed option was the correct answer, clear it
    if (editedQuiz.correct_answer === editedQuiz.options?.[optionIndex]) {
      setEditedQuiz(prev => ({ ...prev, correct_answer: '' }));
    }
  };

  const validateQuiz = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!editedQuiz.question_text.trim()) {
      newErrors.question_text = t('question_text_required');
    }

    // Question type specific validation
    if (editedQuiz.question_type === 'multiple_choice') {
      const filledOptions = editedQuiz.options?.filter(opt => opt.trim() !== '') || [];
      if (filledOptions.length < 2) {
        newErrors.options = t('minimum_options_required');
      }
      if (!editedQuiz.correct_answer || !editedQuiz.options?.includes(editedQuiz.correct_answer as string)) {
        newErrors.correct_answer = t('valid_correct_answer_required');
      }
    } else if (editedQuiz.question_type === 'true_false') {
      if (editedQuiz.correct_answer !== true && editedQuiz.correct_answer !== false) {
        newErrors.correct_answer = t('true_false_answer_required');
      }
    } else if (['short_answer', 'essay', 'fill_blank'].includes(editedQuiz.question_type)) {
      if (!editedQuiz.correct_answer || (editedQuiz.correct_answer as string).trim() === '') {
        newErrors.correct_answer = t('correct_answer_required');
      }
    }

    // Points validation
    if (editedQuiz.points < 1 || editedQuiz.points > 100) {
      newErrors.points = t('points_range_error');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateQuiz()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call using hooks
      // const { updateQuizByLessonQuizId } = useUpdateQuizByLessonQuizId({ 
      //   lessonId: editedQuiz.lesson_id, 
      //   quizId: editedQuiz.public_id 
      // });
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      setErrors({ general: t('submit_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEditedQuiz(quiz);
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

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t('edit_quiz')}
            </DialogTitle>
            <DialogDescription>
              {t('edit_quiz_description')}
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

            {/* Quiz Header Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {t('position')} {editedQuiz.position}
                    </Badge>
                    <Badge className={getDifficultyColor(editedQuiz.difficulty)}>
                      {getDifficultyLabel(editedQuiz.difficulty)}
                    </Badge>
                    <Badge variant="secondary">
                      {getQuestionTypeLabel(editedQuiz.question_type)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('created')}: {new Date(editedQuiz.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Edit Form */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Question Text */}
                <div className="space-y-2">
                  <Label htmlFor="question-text">
                    {t('question_text')} <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="question-text"
                    placeholder={t('question_text_placeholder')}
                    value={editedQuiz.question_text}
                    onChange={(e) => updateQuiz('question_text', e.target.value)}
                    className={errors.question_text ? 'border-red-500' : ''}
                  />
                  {errors.question_text && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.question_text}
                    </p>
                  )}
                </div>

                {/* Question Type and Settings Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>{t('question_type')}</Label>
                    <Select
                      value={editedQuiz.question_type}
                      onValueChange={(value: QuestionType) => {
                        updateQuiz('question_type', value);
                        // Reset options and correct answer when type changes
                        if (value === 'multiple_choice') {
                          updateQuiz('options', ['', '', '', '']);
                          updateQuiz('correct_answer', '');
                        } else if (value === 'true_false') {
                          updateQuiz('options', []);
                          updateQuiz('correct_answer', true);
                        } else {
                          updateQuiz('options', []);
                          updateQuiz('correct_answer', '');
                        }
                      }}
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
                      value={editedQuiz.points}
                      onChange={(e) => updateQuiz('points', parseInt(e.target.value) || 1)}
                      className={errors.points ? 'border-red-500' : ''}
                    />
                    {errors.points && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.points}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('difficulty')}</Label>
                    <Select
                      value={editedQuiz.difficulty.toString()}
                      onValueChange={(value) => updateQuiz('difficulty', parseInt(value))}
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

                  <div className="space-y-2">
                    <Label>{t('position')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editedQuiz.position}
                      onChange={(e) => updateQuiz('position', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                {/* Question Type Specific Fields */}
                {editedQuiz.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('options')} <span className="text-red-500">*</span></Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        className="text-xs"
                      >
                        {t('add_option')}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editedQuiz.options?.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                            {String.fromCharCode(65 + idx)}
                          </Badge>
                          <Input
                            placeholder={t('option_placeholder', { letter: String.fromCharCode(65 + idx) })}
                            value={option}
                            onChange={(e) => updateOption(idx, e.target.value)}
                          />
                          {editedQuiz.options && editedQuiz.options.length > 2 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(idx)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('remove_option')}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>
                    {errors.options && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.options}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <Label>{t('correct_answer')} <span className="text-red-500">*</span></Label>
                      <Select
                        value={editedQuiz.correct_answer as string}
                        onValueChange={(value) => updateQuiz('correct_answer', value)}
                      >
                        <SelectTrigger className={errors.correct_answer ? 'border-red-500' : ''}>
                          <SelectValue placeholder={t('select_correct_answer')} />
                        </SelectTrigger>
                        <SelectContent>
                          {editedQuiz.options?.map((option, idx) => (
                            option.trim() && (
                              <SelectItem key={idx} value={option}>
                                {String.fromCharCode(65 + idx)}: {option}
                              </SelectItem>
                            )
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.correct_answer && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {errors.correct_answer}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {editedQuiz.question_type === 'true_false' && (
                  <div className="space-y-2">
                    <Label>{t('correct_answer')} <span className="text-red-500">*</span></Label>
                    <Select
                      value={editedQuiz.correct_answer?.toString()}
                      onValueChange={(value) => updateQuiz('correct_answer', value === 'true')}
                    >
                      <SelectTrigger className={errors.correct_answer ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t('select_true_false')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t('true')}</SelectItem>
                        <SelectItem value="false">{t('false')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.correct_answer && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.correct_answer}
                      </p>
                    )}
                  </div>
                )}

                {['short_answer', 'essay', 'fill_blank'].includes(editedQuiz.question_type) && (
                  <div className="space-y-2">
                    <Label>{t('correct_answer')} <span className="text-red-500">*</span></Label>
                    <Textarea
                      placeholder={t('correct_answer_placeholder')}
                      value={editedQuiz.correct_answer as string}
                      onChange={(e) => updateQuiz('correct_answer', e.target.value)}
                      className={errors.correct_answer ? 'border-red-500' : ''}
                    />
                    {errors.correct_answer && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.correct_answer}
                      </p>
                    )}
                  </div>
                )}

                {/* Explanation */}
                <div className="space-y-2">
                  <Label>{t('explanation')}</Label>
                  <Textarea
                    placeholder={t('explanation_placeholder')}
                    value={editedQuiz.explanation || ''}
                    onChange={(e) => updateQuiz('explanation', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Changes Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('changes_preview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-2">
                      {editedQuiz.question_text}
                    </p>
                  </div>
                  
                  {editedQuiz.question_type === 'multiple_choice' && editedQuiz.options && (
                    <div className="space-y-1">
                      {editedQuiz.options.filter(opt => opt.trim()).map((option, idx) => (
                        <div key={idx} className={`flex items-center gap-2 p-2 rounded text-sm ${
                          option === editedQuiz.correct_answer 
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center text-xs">
                            {String.fromCharCode(65 + idx)}
                          </Badge>
                          <span>{option}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {editedQuiz.question_type === 'true_false' && (
                    <div className={`p-2 rounded text-sm ${
                      editedQuiz.correct_answer === true 
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      <span className="font-medium">{t('correct_answer')}: </span>
                      {editedQuiz.correct_answer === true ? t('true') : t('false')}
                    </div>
                  )}

                  {['short_answer', 'essay', 'fill_blank'].includes(editedQuiz.question_type) && (
                    <div className="p-2 rounded text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      <span className="font-medium">{t('correct_answer')}: </span>
                      {editedQuiz.correct_answer as string}
                    </div>
                  )}

                  {editedQuiz.explanation && (
                    <div className="p-2 rounded text-sm bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <span className="font-medium">{t('explanation')}: </span>
                      {editedQuiz.explanation}
                    </div>
                  )}

                  <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span><strong>{t('points')}:</strong> {editedQuiz.points}</span>
                    <span><strong>{t('difficulty')}:</strong> {getDifficultyLabel(editedQuiz.difficulty)}</span>
                    <span><strong>{t('position')}:</strong> {editedQuiz.position}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('save_changes')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}