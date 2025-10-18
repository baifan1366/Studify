'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, X, Clock, Trophy, Users, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuizAnalysis } from '@/hooks/quiz/use-quiz-analysis';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

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

interface PreviewQuizProps {
  quiz: QuizQuestion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showStatistics?: boolean;
}

export function PreviewQuiz({ quiz, open, onOpenChange, showStatistics = true }: PreviewQuizProps) {
  const t = useTranslations('PreviewQuiz');
  const [currentView, setCurrentView] = useState<'student' | 'tutor'>('student');
  const [selectedAnswer, setSelectedAnswer] = useState<string | boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Fetch real statistics data from quiz analysis API using the lesson_id
  const { data: analysisData, isLoading: statsLoading } = useQuizAnalysis(
    showStatistics && currentView === 'tutor' ? quiz.lesson_id : null
  );

  // Find the current question's data in the analysis
  const questionAnalysis = analysisData?.questions.find(q => q.id === quiz.id);
  
  // Use real statistics or fallback to basic data
  const statistics = analysisData ? {
    total_submissions: analysisData.lesson_stats.total_submissions,
    correct_submissions: questionAnalysis 
      ? analysisData.questions.filter(q => q.id === quiz.id && q.is_correct).length
      : 0,
    average_score: analysisData.lesson_stats.average_score,
    completion_rate: analysisData.lesson_stats.completion_rate,
    difficulty_rating: quiz.difficulty,
    time_spent_avg: analysisData.user_stats.time_taken_sec / (analysisData.questions.length || 1),
    common_wrong_answers: quiz.question_type === 'multiple_choice' && quiz.options 
      ? quiz.options.slice(1, 3).map(opt => ({ answer: opt, count: 0 })) // TODO: Calculate from submissions
      : []
  } : {
    total_submissions: quiz.submission_count || 0,
    correct_submissions: Math.floor((quiz.submission_count || 0) * 0.7),
    average_score: 75,
    completion_rate: 85,
    difficulty_rating: quiz.difficulty,
    time_spent_avg: 120,
    common_wrong_answers: []
  };

  const handleClose = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentView('student');
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

  const isCorrectAnswer = (answer: string | boolean) => {
    return answer === quiz.correct_answer;
  };

  const handleAnswerSelect = (answer: string | boolean) => {
    setSelectedAnswer(answer);
    if (currentView === 'tutor') {
      setShowExplanation(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStudentView = () => (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{t('question')} {quiz.position}</Badge>
          <Badge variant="secondary">{getQuestionTypeLabel(quiz.question_type)}</Badge>
          <Badge className={getDifficultyColor(quiz.difficulty)}>
            {getDifficultyLabel(quiz.difficulty)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Trophy className="h-4 w-4" />
          <span>{quiz.points} {t('points')}</span>
        </div>
      </div>

      {/* Question */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-lg font-medium text-foreground">
              {quiz.question_text}
            </p>

            {/* Question Type Specific UI */}
            {quiz.question_type === 'multiple_choice' && quiz.options && (
              <div className="space-y-2">
                {quiz.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={currentView === 'tutor' && selectedAnswer !== null}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selectedAnswer === option
                        ? currentView === 'tutor' && isCorrectAnswer(option)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : currentView === 'tutor' && !isCorrectAnswer(option)
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : currentView === 'tutor' && isCorrectAnswer(option)
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === option ? 'border-current bg-current text-white' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      <span className="text-xs font-medium">
                        {String.fromCharCode(65 + idx)}
                      </span>
                    </div>
                    <span className="flex-1">{option}</span>
                    {currentView === 'tutor' && isCorrectAnswer(option) && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {currentView === 'tutor' && selectedAnswer === option && !isCorrectAnswer(option) && (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {quiz.question_type === 'true_false' && (
              <div className="space-y-2">
                {[true, false].map((value, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(value)}
                    disabled={currentView === 'tutor' && selectedAnswer !== null}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selectedAnswer === value
                        ? currentView === 'tutor' && isCorrectAnswer(value)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : currentView === 'tutor' && !isCorrectAnswer(value)
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : currentView === 'tutor' && isCorrectAnswer(value)
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === value ? 'border-current bg-current text-white' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      <span className="text-xs font-medium">
                        {value ? 'T' : 'F'}
                      </span>
                    </div>
                    <span className="flex-1">{value ? t('true') : t('false')}</span>
                    {currentView === 'tutor' && isCorrectAnswer(value) && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {currentView === 'tutor' && selectedAnswer === value && !isCorrectAnswer(value) && (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {['short_answer', 'essay', 'fill_blank'].includes(quiz.question_type) && (
              <div className="space-y-2">
                <textarea
                  placeholder={t('your_answer_placeholder')}
                  className="w-full p-3 border border-gray-200 rounded-lg dark:border-gray-700 dark:bg-gray-800"
                  rows={quiz.question_type === 'essay' ? 6 : 3}
                  disabled={currentView === 'tutor'}
                />
                {currentView === 'tutor' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-800 dark:text-green-300">{t('expected_answer')}:</span>
                    </div>
                    <p className="text-green-700 dark:text-green-300">{quiz.correct_answer as string}</p>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {showExplanation && quiz.explanation && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">{t('explanation')}:</h4>
                    <p className="text-blue-700 dark:text-blue-300">{quiz.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {selectedAnswer && currentView === 'student' && (
              <div className="flex justify-center">
                <Button onClick={() => setShowExplanation(true)}>
                  {t('show_explanation')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStatistics = () => {
    if (statsLoading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{statistics.total_submissions}</p>
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
                  <p className="text-2xl font-bold">{statistics.correct_submissions}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('correct_answers')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(statistics.average_score)}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('average_score')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-2xl font-bold">{formatTime(Math.round(statistics.time_spent_avg))}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('avg_time')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('performance_breakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>{t('correct_rate')}</span>
                <span>
                  {statistics.total_submissions > 0 
                    ? Math.round((statistics.correct_submissions / statistics.total_submissions) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={statistics.total_submissions > 0 
                  ? (statistics.correct_submissions / statistics.total_submissions) * 100 
                  : 0} 
                className="h-2" 
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span>{t('completion_rate')}</span>
                <span>{Math.round(statistics.completion_rate)}%</span>
              </div>
              <Progress value={statistics.completion_rate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span>{t('difficulty_rating')}</span>
                <span>{getDifficultyLabel(statistics.difficulty_rating)}</span>
              </div>
              <Progress value={(statistics.difficulty_rating / 5) * 100} className="h-2" />
            </div>

            {analysisData && (
              <div>
                <div className="flex justify-between mb-2">
                  <span>{t('lesson_average')}</span>
                  <span>{Math.round(analysisData.lesson_stats.average_score)}%</span>
                </div>
                <Progress value={analysisData.lesson_stats.average_score} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Breakdown */}
        {analysisData?.lesson_stats.difficulty_breakdown && (
          <Card>
            <CardHeader>
              <CardTitle>{t('difficulty_breakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-600 dark:text-green-400">{t('easy_questions')}</span>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                    {analysisData.lesson_stats.difficulty_breakdown.easy}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-600 dark:text-yellow-400">{t('medium_questions')}</span>
                  <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20">
                    {analysisData.lesson_stats.difficulty_breakdown.medium}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 dark:text-red-400">{t('hard_questions')}</span>
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20">
                    {analysisData.lesson_stats.difficulty_breakdown.hard}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Common Wrong Answers */}
        {statistics.common_wrong_answers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('common_wrong_answers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statistics.common_wrong_answers.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-red-700 dark:text-red-300">{item.answer}</span>
                    <Badge variant="destructive">{item.count} {t('students')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('quiz_preview')}
          </DialogTitle>
          <DialogDescription>
            {t('quiz_preview_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quiz Info */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{t('question')} {quiz.position}</Badge>
              <Badge variant="secondary">{getQuestionTypeLabel(quiz.question_type)}</Badge>
              <Badge className={getDifficultyColor(quiz.difficulty)}>
                {getDifficultyLabel(quiz.difficulty)}
              </Badge>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('created')}: {new Date(quiz.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* View Toggle */}
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'student' | 'tutor')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">{t('student_view')}</TabsTrigger>
              <TabsTrigger value="tutor">{t('tutor_view')}</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="mt-6">
              {renderStudentView()}
            </TabsContent>

            <TabsContent value="tutor">
              <Tabs defaultValue="preview" className="mt-6">
                <TabsList>
                  <TabsTrigger value="preview">{t('preview')}</TabsTrigger>
                  {showStatistics && <TabsTrigger value="statistics">{t('statistics')}</TabsTrigger>}
                </TabsList>

                <TabsContent value="preview" className="mt-6">
                  {renderStudentView()}
                </TabsContent>

                {showStatistics && (
                  <TabsContent value="statistics" className="mt-6">
                    {renderStatistics()}
                  </TabsContent>
                )}
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}