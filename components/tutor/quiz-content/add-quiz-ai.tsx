'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGenerateQuiz, validateQuizRequest } from '@/hooks/ai/use-generate-quiz';
import { useCreateQuizByLessonId, useMyAllLessons } from '@/hooks/course/use-quiz';
import { Bot, Sparkles, RefreshCw, Check, AlertCircle, Edit, Trash2, Wand2, Save, X, Plus, Copy, ChevronUp, ChevronDown } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface AIQuizSettings {
  numQuestions: number;
  difficulty: number;
  questionTypes: QuestionType[];
  focusTopics: string;
  includeExplanations: boolean;
}

interface AddQuizAIProps {
  lessonId?: string;
  lessonTitle?: string;
  lessonDescription?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddQuizAI({ 
  lessonId: propLessonId, 
  lessonTitle: propLessonTitle, 
  lessonDescription: propLessonDescription, 
  open, 
  onOpenChange, 
  onSuccess 
}: AddQuizAIProps) {
  const t = useTranslations('AddQuizAI');
  
  // Lesson Selection State
  const [selectedLessonId, setSelectedLessonId] = useState<string>(propLessonId || '');
  const [selectedLessonTitle, setSelectedLessonTitle] = useState<string>(propLessonTitle || '');
  const [selectedLessonDescription, setSelectedLessonDescription] = useState<string>(propLessonDescription || '');
  
  // Get all lessons from user's courses with modules and lessons
  const { data: allLessons, isLoading: coursesLoading, totalCount } = useMyAllLessons();
  
  console.log('🏫 [AI Quiz] All lessons data:', {
    isLoading: coursesLoading,
    totalLessons: totalCount,
    lessons: allLessons
  });
  
  // Use the selected lesson or prop lesson
  const lessonId = selectedLessonId || propLessonId;  
  const lessonTitle = selectedLessonTitle || propLessonTitle;
  const lessonDescription = selectedLessonDescription || propLessonDescription;
  
  // AI Generation State
  const [aiSettings, setAiSettings] = useState<AIQuizSettings>({
    numQuestions: 5,
    difficulty: 2,
    questionTypes: ['multiple_choice', 'true_false'],
    focusTopics: '',
    includeExplanations: true,
  });
  const [customPrompt, setCustomPrompt] = useState('');
  const [generationStep, setGenerationStep] = useState('');
  
  // AI Generation Hook
  const generateQuizMutation = useGenerateQuiz();
  
  // Quiz Creation Hook - Use same approach as Manual Quiz
  const { createQuiz, isCreating } = useCreateQuizByLessonId({ lessonId: lessonId || '' });
  
  // Generated Questions State
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editingQuestionData, setEditingQuestionData] = useState<QuizQuestion | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSettingsChange = (field: keyof AIQuizSettings, value: any) => {
    setAiSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLessonChange = (lessonId: string) => {
    const selectedLesson = allLessons.find(lesson => lesson.id.toString() === lessonId);
    if (selectedLesson) {
      setSelectedLessonId(lessonId);
      setSelectedLessonTitle(selectedLesson.title);
      setSelectedLessonDescription(selectedLesson.description || '');
    }
  };

  const generateDefaultPrompt = () => {
    const types = aiSettings.questionTypes.map(type => {
      const typeLabels = {
        multiple_choice: t('question_type_multiple_choice'),
        true_false: t('question_type_true_false'),
        short_answer: t('question_type_short_answer'),
        essay: t('question_type_essay'),
        fill_blank: t('question_type_fill_blank')
      };
      return typeLabels[type];
    }).join(', ');

    const difficultyLabel = {
      1: t('difficulty_easy'),
      2: t('difficulty_medium'),
      3: t('difficulty_hard'),
      4: t('difficulty_expert'),
      5: t('difficulty_master')
    }[aiSettings.difficulty] || t('difficulty_medium');

    return t('default_ai_prompt', {
      numQuestions: aiSettings.numQuestions,
      difficulty: difficultyLabel,
      types: types,
      lessonTitle: lessonTitle || t('this_lesson'),
      lessonDescription: lessonDescription || t('lesson_content'),
      focusTopics: aiSettings.focusTopics || t('main_concepts'),
      explanations: aiSettings.includeExplanations ? t('with_explanations') : t('without_explanations')
    });
  };

  const handleGenerateQuiz = async () => {
    // Clear any previous errors
    setErrors({});
    
    // Validate lesson selection
    if (!lessonId) {
      setErrors({ lesson: t('lesson_selection_required') });
      return;
    }
    
    setGenerationStep(t('preparing_request'));
    
    // Build the quiz generation request
    const quizRequest = {
      topic: lessonTitle || aiSettings.focusTopics || 'General Knowledge',
      num_questions: aiSettings.numQuestions,
      difficulty: aiSettings.difficulty,
      question_types: aiSettings.questionTypes,
      focus_topics: aiSettings.focusTopics,
      include_explanations: aiSettings.includeExplanations,
      lesson_content: lessonDescription,
      custom_instructions: customPrompt,
      lessonId: lessonId,
    };

    // Validate request
    const validationErrors = validateQuizRequest(quizRequest);
    if (validationErrors.length > 0) {
      setErrors({ generation: validationErrors.join(', ') });
      setGenerationStep('');
      return;
    }

    setGenerationStep(t('contacting_ai'));
    
    try {
      // Call AI API using the hook
      const generatedQuiz = await generateQuizMutation.mutateAsync(quizRequest);
      
      setGenerationStep(t('processing_response'));
      
      console.log('🤖 [AI Quiz] Generated quiz response:', generatedQuiz);
      
      // Convert and validate the generated quiz to our component's QuizQuestion format
      const convertedQuestions: QuizQuestion[] = generatedQuiz.questions
        .filter(q => {
          // Filter out malformed questions
          const hasValidText = q.question_text && 
            q.question_text.trim().length > 10 && 
            !q.question_text.includes('undefined') && 
            !q.question_text.includes('null');
          
          const hasValidType = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'].includes(q.question_type);
          
          if (!hasValidText || !hasValidType) {
            console.warn('🚨 [AI Quiz] Filtering out malformed question:', q);
            return false;
          }
          
          return true;
        })
        .map((q, index) => ({
          id: q.id || `q_${index}`,
          question_text: q.question_text.trim(),
          question_type: q.question_type as QuestionType,
          options: q.options?.filter(opt => opt && opt.trim().length > 0) || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          points: q.points,
          difficulty: q.difficulty,
          position: q.position,
        }));
      
      console.log('📋 [AI Quiz] Converted questions for component:', convertedQuestions);
      
      // Check if we have valid questions after filtering
      if (convertedQuestions.length === 0) {
        setErrors({ generation: t('no_questions_generated') });
        setGenerationStep('');
        return;
      }
      
      setGenerationStep(t('finalizing'));
      setGeneratedQuestions(convertedQuestions);
      setGenerationStep('');
      
    } catch (error) {
      console.error('❌ Quiz generation failed:', error);
      setErrors({ 
        generation: error instanceof Error 
          ? error.message 
          : t('generation_error') 
      });
      setGenerationStep('');
    }
  };

  const handleEditQuestion = (questionId: string) => {
    const question = generatedQuestions.find(q => q.id === questionId);
    if (question) {
      setEditingQuestion(questionId);
      setEditingQuestionData({ ...question });
    }
  };

  const handleSaveQuestion = () => {
    if (editingQuestion && editingQuestionData) {
      setGeneratedQuestions(questions =>
        questions.map(q => q.id === editingQuestion ? editingQuestionData : q)
      );
      setEditingQuestion(null);
      setEditingQuestionData(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditingQuestionData(null);
  };

  const handleAddNewQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `new_${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      points: 1,
      difficulty: 2,
      position: generatedQuestions.length + 1,
    };
    setGeneratedQuestions(questions => [...questions, newQuestion]);
    handleEditQuestion(newQuestion.id);
  };

  const handleDuplicateQuestion = (questionId: string) => {
    const question = generatedQuestions.find(q => q.id === questionId);
    if (question) {
      const duplicatedQuestion: QuizQuestion = {
        ...question,
        id: `dup_${Date.now()}`,
        position: generatedQuestions.length + 1,
      };
      setGeneratedQuestions(questions => [...questions, duplicatedQuestion]);
    }
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = generatedQuestions.findIndex(q => q.id === questionId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= generatedQuestions.length) return;
    
    const newQuestions = [...generatedQuestions];
    [newQuestions[currentIndex], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[currentIndex]];
    
    // Update positions
    const reorderedQuestions = newQuestions.map((q, index) => ({ ...q, position: index + 1 }));
    setGeneratedQuestions(reorderedQuestions);
  };

  const handleUpdateQuestion = (questionId: string, field: keyof QuizQuestion, value: any) => {
    setGeneratedQuestions(questions =>
      questions.map(q => q.id === questionId ? { ...q, [field]: value } : q)
    );
  };

  const handleRemoveQuestion = (questionId: string) => {
    setGeneratedQuestions(questions => 
      questions.filter(q => q.id !== questionId)
        .map((q, index) => ({ ...q, position: index + 1 }))
    );
  };

  const validateQuestions = (): string[] => {
    const validationErrors: string[] = [];
    
    generatedQuestions.forEach((question, index) => {
      const questionNum = index + 1;
      
      if (!question.question_text.trim()) {
        validationErrors.push(`Question ${questionNum}: ${t('question_text_required')}`);
      }
      
      if (question.question_type === 'multiple_choice') {
        const validOptions = question.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          validationErrors.push(`Question ${questionNum}: ${t('multiple_choice_min_options')}`);
        }
        if (!question.correct_answer || !validOptions.includes(question.correct_answer as string)) {
          validationErrors.push(`Question ${questionNum}: ${t('correct_answer_required')}`);
        }
      }
      
      if (question.question_type === 'true_false') {
        if (typeof question.correct_answer !== 'boolean') {
          validationErrors.push(`Question ${questionNum}: ${t('true_false_answer_required')}`);
        }
      }
      
      if (['short_answer', 'essay', 'fill_blank'].includes(question.question_type)) {
        if (!question.correct_answer || (question.correct_answer as string).trim() === '') {
          validationErrors.push(`Question ${questionNum}: ${t('answer_required')}`);
        }
      }
      
      if (question.points < 1 || question.points > 100) {
        validationErrors.push(`Question ${questionNum}: ${t('points_range_error')}`);
      }
    });
    
    return validationErrors;
  };

  const handleSubmitQuiz = async () => {
    if (generatedQuestions.length === 0) {
      setErrors({ submit: t('no_questions_generated') });
      return;
    }

    if (!lessonId) {
      setErrors({ submit: t('lesson_id_required') });
      return;
    }

    // Validate all questions
    const validationErrors = validateQuestions();
    if (validationErrors.length > 0) {
      setErrors({ submit: validationErrors.join('; ') });
      return;
    }

    setErrors({});
    
    try {
      console.log('💾 [AI Quiz] Starting sequential question creation for lesson:', lessonId);
      console.log('📋 [AI Quiz] Questions to create:', generatedQuestions.length);
      
      // Create each question sequentially (same approach as Manual Quiz)
      for (let i = 0; i < generatedQuestions.length; i++) {
        const question = generatedQuestions[i];
        
        console.log(`⏳ [AI Quiz] Creating question ${i + 1}/${generatedQuestions.length}: ${question.question_text.substring(0, 50)}...`);
        
        // Handle correct_answer based on question type
        let correctAnswer = question.correct_answer;
        
        // For multiple choice, ensure correct_answer is a string (index or value)
        if (question.question_type === 'multiple_choice' && Array.isArray(question.options) && question.options.length > 0) {
          if (typeof correctAnswer === 'number' && correctAnswer >= 0 && correctAnswer < question.options.length) {
            // If it's an index, get the actual option value
            correctAnswer = question.options[correctAnswer];
          } else if (typeof correctAnswer === 'string' && !question.options.includes(correctAnswer)) {
            // If it's a string but not in options, use the first option as fallback
            correctAnswer = question.options[0] || '';
          }
        }
        
        // For true/false questions, ensure it's a boolean
        if (question.question_type === 'true_false') {
          correctAnswer = Boolean(correctAnswer);
        }
        
        // For other types, ensure it's a string
        if (typeof correctAnswer !== 'boolean') {
          correctAnswer = String(correctAnswer || '');
        }
        
        // Prepare the question data for the API (same format as Manual Quiz)
        const questionData = {
          lesson_id: lessonId,
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.question_type === 'multiple_choice' ? question.options.filter(opt => opt.trim() !== '') : undefined,
          correct_answer: correctAnswer,
          explanation: question.explanation || '',
          points: question.points,
          difficulty: question.difficulty,
          position: i + 1, // Use the actual position in the array
        };

        console.log(`📤 [AI Quiz] Sending question ${i + 1} data:`, questionData);
        
        // Call the same API as Manual Quiz
        await createQuiz(questionData);
        
        console.log(`✅ [AI Quiz] Successfully created question ${i + 1}/${generatedQuestions.length}`);
      }
      
      console.log('🎉 [AI Quiz] All questions created successfully!');
      
      // Reset form on success
      setGeneratedQuestions([]);
      setAiSettings({
        numQuestions: 5,
        difficulty: 2,
        questionTypes: ['multiple_choice', 'true_false'],
        focusTopics: '',
        includeExplanations: true,
      });
      setCustomPrompt('');
      setErrors({});
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ [AI Quiz] Failed to create quiz:', error);
      
      // Extract meaningful error message (same as Manual Quiz)
      let errorMessage = t('submit_error');
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setErrors({ submit: errorMessage });
    }
  };

  const handleClose = () => {
    setGeneratedQuestions([]);
    setAiSettings({
      numQuestions: 5,
      difficulty: 2,
      questionTypes: ['multiple_choice', 'true_false'],
      focusTopics: '',
      includeExplanations: true,
    });
    setCustomPrompt('');
    setErrors({});
    setEditingQuestion(null);
    setEditingQuestionData(null);
    onOpenChange(false);
  };

  const renderQuestionEditor = (question: QuizQuestion) => (
    <Card className="mb-4 border-2 border-blue-300 dark:border-blue-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{t('editing')} {t('question')} {question.position}</Badge>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveQuestion}
              className="text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4 mr-1" />
              {t('save')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              className="text-gray-600 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              {t('cancel')}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Question Text */}
        <div className="space-y-2">
          <Label>{t('question_text')} <span className="text-red-500">*</span></Label>
          <Textarea
            value={editingQuestionData?.question_text || ''}
            onChange={(e) => setEditingQuestionData(prev => prev ? { ...prev, question_text: e.target.value } : null)}
            placeholder={t('enter_question_text')}
            rows={3}
          />
        </div>

        {/* Question Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('question_type')}</Label>
            <Select
              value={editingQuestionData?.question_type || 'multiple_choice'}
              onValueChange={(value) => {
                const newType = value as QuestionType;
                setEditingQuestionData(prev => {
                  if (!prev) return null;
                  let newOptions = prev.options;
                  let newCorrectAnswer: string | boolean = prev.correct_answer;
                  
                  if (newType === 'multiple_choice' && (!newOptions || newOptions.length < 4)) {
                    newOptions = ['', '', '', ''];
                    newCorrectAnswer = '';
                  } else if (newType === 'true_false') {
                    newOptions = [];
                    newCorrectAnswer = true;
                  } else if (['short_answer', 'essay', 'fill_blank'].includes(newType)) {
                    newOptions = [];
                    newCorrectAnswer = '';
                  }
                  
                  return { ...prev, question_type: newType, options: newOptions, correct_answer: newCorrectAnswer };
                });
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
              value={editingQuestionData?.points || 1}
              onChange={(e) => setEditingQuestionData(prev => prev ? { ...prev, points: parseInt(e.target.value) || 1 } : null)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t('difficulty')}</Label>
            <Select
              value={editingQuestionData?.difficulty?.toString() || '2'}
              onValueChange={(value) => setEditingQuestionData(prev => prev ? { ...prev, difficulty: parseInt(value) } : null)}
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

        {/* Options for Multiple Choice */}
        {editingQuestionData?.question_type === 'multiple_choice' && (
          <div className="space-y-2">
            <Label>{t('answer_options')} <span className="text-red-500">*</span></Label>
            <div className="space-y-2">
              {editingQuestionData.options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </Badge>
                  <Input
                    placeholder={`${t('option')} ${String.fromCharCode(65 + idx)}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(editingQuestionData?.options || [])];
                      newOptions[idx] = e.target.value;
                      setEditingQuestionData(prev => prev ? { ...prev, options: newOptions } : null);
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={option === editingQuestionData.correct_answer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditingQuestionData(prev => prev ? { ...prev, correct_answer: option } : null)}
                    className={option === editingQuestionData.correct_answer ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {option === editingQuestionData.correct_answer ? <Check className="h-4 w-4" /> : t('correct')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correct Answer for True/False */}
        {editingQuestionData?.question_type === 'true_false' && (
          <div className="space-y-2">
            <Label>{t('correct_answer')} <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={editingQuestionData.correct_answer === true ? "default" : "outline"}
                onClick={() => setEditingQuestionData(prev => prev ? { ...prev, correct_answer: true } : null)}
              >
                {t('true')}
              </Button>
              <Button
                type="button"
                variant={editingQuestionData.correct_answer === false ? "default" : "outline"}
                onClick={() => setEditingQuestionData(prev => prev ? { ...prev, correct_answer: false } : null)}
              >
                {t('false')}
              </Button>
            </div>
          </div>
        )}

        {/* Correct Answer for Other Types */}
        {['short_answer', 'essay', 'fill_blank'].includes(editingQuestionData?.question_type || '') && (
          <div className="space-y-2">
            <Label>{editingQuestionData?.question_type === 'essay' ? t('sample_answer') : t('correct_answer')} <span className="text-red-500">*</span></Label>
            <Textarea
              value={editingQuestionData?.correct_answer as string || ''}
              onChange={(e) => setEditingQuestionData(prev => prev ? { ...prev, correct_answer: e.target.value } : null)}
              placeholder={editingQuestionData?.question_type === 'essay' ? t('enter_sample_answer') : t('enter_correct_answer')}
              rows={editingQuestionData?.question_type === 'essay' ? 4 : 2}
            />
          </div>
        )}

        {/* Explanation */}
        <div className="space-y-2">
          <Label>{t('explanation')} ({t('optional')})</Label>
          <Textarea
            value={editingQuestionData?.explanation || ''}
            onChange={(e) => setEditingQuestionData(prev => prev ? { ...prev, explanation: e.target.value } : null)}
            placeholder={t('enter_explanation')}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderQuestionPreview = (question: QuizQuestion, index: number) => (
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
              {question.points} {t('points')}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveQuestion(question.id, 'up')}
                  disabled={index === 0}
                  className="text-gray-600 hover:text-gray-700 dark:text-gray-400"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('move_up')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveQuestion(question.id, 'down')}
                  disabled={index === generatedQuestions.length - 1}
                  className="text-gray-600 hover:text-gray-700 dark:text-gray-400"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('move_down')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicateQuestion(question.id)}
                  className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('duplicate_question')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditQuestion(question.id)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('edit_question')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveQuestion(question.id)}
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
      
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {question.question_text}
            </p>
          </div>
          
          {question.question_type === 'multiple_choice' && (
            <div className="space-y-1">
              {question.options.map((option, idx) => (
                <div key={idx} className={`flex items-center gap-2 p-2 rounded text-sm ${
                  option === question.correct_answer 
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                    : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center text-xs">
                    {String.fromCharCode(65 + idx)}
                  </Badge>
                  <span>{option}</span>
                  {option === question.correct_answer && (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          )}

          {question.question_type === 'true_false' && (
            <div className={`p-2 rounded text-sm ${
              question.correct_answer === true 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              <span className="font-medium">{t('correct_answer')}: </span>
              {question.correct_answer === true ? t('true') : t('false')}
            </div>
          )}

          {['short_answer', 'essay', 'fill_blank'].includes(question.question_type) && (
            <div className="p-2 rounded text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              <span className="font-medium">{t('sample_answer')}: </span>
              {question.correct_answer as string}
            </div>
          )}

          {question.explanation && (
            <div className="p-2 rounded text-sm bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <span className="font-medium">{t('explanation')}: </span>
              {question.explanation}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {t('add_quiz_ai')}
            </DialogTitle>
            <DialogDescription>
              {t('add_quiz_ai_description')}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
              <TabsTrigger value="prompt">{t('custom_prompt')}</TabsTrigger>
              <TabsTrigger value="preview" disabled={generatedQuestions.length === 0}>
                {t('preview')} {generatedQuestions.length > 0 && `(${generatedQuestions.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('ai_settings')}
                  </CardTitle>
                  <CardDescription>{t('ai_settings_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Lesson Selection */}
                  {!propLessonId && (
                    <div className="space-y-2">
                      <Label>{t('select_lesson')} <span className="text-red-500">*</span></Label>
                      <Select
                        value={selectedLessonId}
                        onValueChange={handleLessonChange}
                      >
                        <SelectTrigger className={!selectedLessonId ? 'border-red-500' : ''}>
                          <SelectValue placeholder={coursesLoading ? t('loading_lessons') : t('select_lesson_placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {coursesLoading ? (
                            <SelectItem value="loading" disabled>
                              {t('loading_lessons')}
                            </SelectItem>
                          ) : !allLessons || allLessons.length === 0 ? (
                            <SelectItem value="no-lessons" disabled>
                              {t('no_lessons_found')}
                            </SelectItem>
                          ) : (
                            allLessons.map((lesson) => (
                              <SelectItem key={lesson.id} value={lesson.id.toString()}>
                                {lesson.fullTitle}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.lesson && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {errors.lesson}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('number_of_questions')}</Label>
                      <Select
                        value={aiSettings.numQuestions.toString()}
                        onValueChange={(value) => handleSettingsChange('numQuestions', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 {t('questions')}</SelectItem>
                          <SelectItem value="5">5 {t('questions')}</SelectItem>
                          <SelectItem value="10">10 {t('questions')}</SelectItem>
                          <SelectItem value="15">15 {t('questions')}</SelectItem>
                          <SelectItem value="20">20 {t('questions')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('difficulty_level')}</Label>
                      <Select
                        value={aiSettings.difficulty.toString()}
                        onValueChange={(value) => handleSettingsChange('difficulty', parseInt(value))}
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

                  <div className="space-y-2">
                    <Label>{t('focus_topics')}</Label>
                    <Input
                      placeholder={t('focus_topics_placeholder')}
                      value={aiSettings.focusTopics}
                      onChange={(e) => handleSettingsChange('focusTopics', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('question_types')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'] as QuestionType[]).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const isSelected = aiSettings.questionTypes.includes(type);
                            if (isSelected) {
                              handleSettingsChange('questionTypes', 
                                aiSettings.questionTypes.filter(t => t !== type)
                              );
                            } else {
                              handleSettingsChange('questionTypes', [...aiSettings.questionTypes, type]);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            aiSettings.questionTypes.includes(type)
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-600'
                              : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                          }`}
                        >
                          {t(`question_type_${type}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-explanations"
                      checked={aiSettings.includeExplanations}
                      onChange={(e) => handleSettingsChange('includeExplanations', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <Label htmlFor="include-explanations">{t('include_explanations')}</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Error Messages */}
              {errors.generation && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.generation}</AlertDescription>
                </Alert>
              )}

              {/* Generate Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateQuiz}
                  disabled={generateQuizMutation.isPending || aiSettings.questionTypes.length === 0}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {generateQuizMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {generationStep || t('generating')}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      {t('generate_quiz')}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('custom_ai_prompt')}</CardTitle>
                  <CardDescription>{t('custom_prompt_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('ai_prompt')}</Label>
                    <Textarea
                      placeholder={t('custom_prompt_placeholder')}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={8}
                    />
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">{t('suggested_prompt')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {generateDefaultPrompt()}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCustomPrompt(generateDefaultPrompt())}
                    className="w-full"
                  >
                    {t('use_suggested_prompt')}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              {generatedQuestions.length > 0 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('generated_quiz_preview')}</CardTitle>
                      <CardDescription>
                        {t('review_and_edit_questions')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">{t('total_questions')}:</span>
                          <span className="ml-2">{generatedQuestions.length}</span>
                        </div>
                        <div>
                          <span className="font-medium">{t('total_points')}:</span>
                          <span className="ml-2">{generatedQuestions.reduce((sum, q) => sum + q.points, 0)}</span>
                        </div>
                        <div>
                          <span className="font-medium">{t('avg_difficulty')}:</span>
                          <span className="ml-2">
                            {(generatedQuestions.reduce((sum, q) => sum + q.difficulty, 0) / generatedQuestions.length).toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">{t('question_types')}:</span>
                          <span className="ml-2">
                            {Array.from(new Set(generatedQuestions.map(q => q.question_type))).length}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    {generatedQuestions.map((question, index) => 
                      editingQuestion === question.id ? renderQuestionEditor(question) : renderQuestionPreview(question, index)
                    )}
                    
                    {/* Add New Question Button */}
                    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <CardContent className="flex items-center justify-center py-8">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddNewQuestion}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          {t('add_new_question')}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Submit Error Messages */}
          {errors.submit && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              {t('cancel')}
            </Button>
            
            {generatedQuestions.length > 0 && (
              <Button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={isCreating}
              >
                {isCreating ? (
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}