'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Users,
  Clock,
  Award,
  Brain,
  TrendingUp,
  Target,
  BookOpen,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useQuizAnalysis } from '@/hooks/course/use-quiz';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

interface QuizAnalysisProps {
  lessonId: string;
  userScore?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  timeSpent?: number;
}

interface QuestionAnalysis {
  id: number;
  public_id: string;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: any;
  user_answer?: any;
  is_correct?: boolean;
  points: number;
  points_earned: number;
  explanation?: string;
  difficulty: number;
  position: number;
}

interface QuizAnalysisData {
  questions: QuestionAnalysis[];
  user_stats: {
    total_score: number;
    max_possible_score: number;
    percentage: number;
    correct_count: number;
    total_questions: number;
    time_taken_sec: number;
    completed_at: string;
  };
  lesson_stats: {
    total_submissions: number;
    average_score: number;
    completion_rate: number;
    difficulty_breakdown: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

export default function CourseQuizAnalysis({
  lessonId,
  userScore,
  totalQuestions,
  correctAnswers,
  timeSpent
}: QuizAnalysisProps) {
  const t = useTranslations('QuizAnalysis');
  const { analysis, isLoading, error } = useQuizAnalysis({ lessonId });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1:
      case 2:
        return 'text-green-600 dark:text-green-400';
      case 3:
        return 'text-yellow-600 dark:text-yellow-400';
      case 4:
      case 5:
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Easy';
    if (difficulty === 3) return 'Medium';
    return 'Hard';
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('error_title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('error_message')}
        </p>
      </div>
    );
  }

  const analysisData = analysis as QuizAnalysisData;
  const { questions, user_stats, lesson_stats } = analysisData;

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User Score */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-6 w-6 text-yellow-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('your_score')}</h3>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(user_stats.percentage)}`}>
            {user_stats.percentage}%
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {user_stats.total_score} / {user_stats.max_possible_score} {t('points')}
          </p>
        </motion.div>

        {/* Correct Answers */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-6 w-6 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('accuracy')}</h3>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {user_stats.correct_count}/{user_stats.total_questions}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('questions_correct')}
          </p>
        </motion.div>

        {/* Time Spent */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-6 w-6 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('time_spent')}</h3>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatTime(user_stats.time_taken_sec)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('total_time')}
          </p>
        </motion.div>
      </div>

      {/* Class Statistics */}
      <motion.div
        className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('class_statistics')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('total_submissions')}</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {lesson_stats.total_submissions}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('average_score')}</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {lesson_stats.average_score.toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('completion_rate')}</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {lesson_stats.completion_rate.toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('your_rank')}</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {user_stats.percentage >= lesson_stats.average_score ? '👑' : '📈'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Question by Question Analysis */}
      <motion.div
        className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-indigo-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('detailed_analysis')}</h3>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              className={`border rounded-lg p-4 ${
                question.is_correct
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {question.is_correct ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {t('question')} {index + 1}
                    </h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(question.difficulty)} bg-current bg-opacity-10`}>
                        {getDifficultyLabel(question.difficulty)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {question.question_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    question.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {question.points_earned}/{question.points}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('points')}</div>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <p className="text-gray-900 dark:text-white font-medium mb-2">
                  {question.question_text}
                </p>
              </div>

              {/* Answer Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* User Answer */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('your_answer')}
                  </h5>
                  <div className={`p-3 rounded-lg border ${
                    question.is_correct
                      ? 'border-green-200 dark:border-green-700 bg-green-100 dark:bg-green-800/30'
                      : 'border-red-200 dark:border-red-700 bg-red-100 dark:bg-red-800/30'
                  }`}>
                    <span className={question.is_correct ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                      {Array.isArray(question.user_answer) ? question.user_answer.join(', ') : question.user_answer || t('no_answer')}
                    </span>
                  </div>
                </div>

                {/* Correct Answer */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('correct_answer')}
                  </h5>
                  <div className="p-3 rounded-lg border border-green-200 dark:border-green-700 bg-green-100 dark:bg-green-800/30">
                    <span className="text-green-800 dark:text-green-200">
                      {Array.isArray(question.correct_answer) ? question.correct_answer.join(', ') : question.correct_answer}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explanation */}
              {question.explanation && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h6 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        {t('explanation')}
                      </h6>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}