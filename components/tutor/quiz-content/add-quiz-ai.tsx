'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Sparkles, RefreshCw, Check, AlertCircle, Edit, Trash2, Wand2 } from 'lucide-react';

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
  lessonId, 
  lessonTitle, 
  lessonDescription, 
  open, 
  onOpenChange, 
  onSuccess 
}: AddQuizAIProps) {
  const t = useTranslations('AddQuizAI');
  
  // AI Generation State
  const [aiSettings, setAiSettings] = useState<AIQuizSettings>({
    numQuestions: 5,
    difficulty: 2,
    questionTypes: ['multiple_choice', 'true_false'],
    focusTopics: '',
    includeExplanations: true,
  });
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  
  // Generated Questions State
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSettingsChange = (field: keyof AIQuizSettings, value: any) => {
    setAiSettings(prev => ({ ...prev, [field]: value }));
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
    setIsGenerating(true);
    setGenerationStep(t('preparing_request'));
    
    try {
      // Step 1: Prepare AI prompt
      const prompt = customPrompt || generateDefaultPrompt();
      
      setGenerationStep(t('contacting_ai'));
      
      // Step 2: Call AI API (placeholder for now)
      // TODO: Implement actual AI API integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setGenerationStep(t('processing_response'));
      
      // Step 3: Process AI response (mock data for now)
      const mockQuestions: QuizQuestion[] = Array.from({ length: aiSettings.numQuestions }, (_, i) => ({
        id: `ai-${Date.now()}-${i}`,
        question_text: t('sample_question', { number: i + 1 }),
        question_type: aiSettings.questionTypes[i % aiSettings.questionTypes.length],
        options: aiSettings.questionTypes[i % aiSettings.questionTypes.length] === 'multiple_choice' 
          ? ['Option A', 'Option B', 'Option C', 'Option D'] 
          : [],
        correct_answer: aiSettings.questionTypes[i % aiSettings.questionTypes.length] === 'multiple_choice' 
          ? 'Option A' 
          : aiSettings.questionTypes[i % aiSettings.questionTypes.length] === 'true_false' 
            ? true 
            : 'Sample answer',
        explanation: aiSettings.includeExplanations ? t('sample_explanation') : '',
        points: Math.ceil(aiSettings.difficulty * 2),
        difficulty: aiSettings.difficulty,
        position: i + 1,
      }));
      
      setGenerationStep(t('finalizing'));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGeneratedQuestions(mockQuestions);
      setGenerationStep('');
      
    } catch (error) {
      setErrors({ generation: t('generation_error') });
      setGenerationStep('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditQuestion = (questionId: string) => {
    setEditingQuestion(questionId);
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

  const handleSubmitQuiz = async () => {
    if (generatedQuestions.length === 0) {
      setErrors({ submit: t('no_questions_generated') });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call using hooks
      // const { createQuizByLessonId } = useCreateQuizByLessonId({ lessonId: lessonId || '' });
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form
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
      setErrors({ submit: t('submit_error') });
    } finally {
      setIsSubmitting(false);
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
    onOpenChange(false);
  };

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
                  disabled={isGenerating || aiSettings.questionTypes.length === 0}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isGenerating ? (
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
                    {generatedQuestions.map((question, index) => renderQuestionPreview(question, index))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            
            {generatedQuestions.length > 0 && (
              <Button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}