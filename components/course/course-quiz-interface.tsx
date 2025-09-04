'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Brain, 
  Award,
  ArrowRight,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  correct_answer: string | string[];
  points: number;
  explanation?: string;
  user_answer?: string;
  is_correct?: boolean;
  submitted_at?: string;
}

interface CourseQuizInterfaceProps {
  lessonId: string;
  questions: QuizQuestion[];
  onSubmitAnswer: (questionId: string, answer: string) => Promise<void>;
  onQuizComplete: () => void;
}

export default function CourseQuizInterface({ 
  lessonId, 
  questions, 
  onSubmitAnswer, 
  onQuizComplete 
}: CourseQuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());
  const { toast } = useToast();

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(submittedAnswers).length;
  const correctAnswers = questions.filter(q => q.is_correct).length;
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const handleAnswerChange = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const handleSubmitAnswer = async () => {
    const answer = answers[currentQuestion.id];
    if (!answer) {
      toast({
        title: 'Please select an answer',
        description: 'You must provide an answer before submitting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onSubmitAnswer(currentQuestion.id, answer);
      setSubmittedAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: true
      }));

      toast({
        title: 'Answer Submitted',
        description: 'Your answer has been recorded.',
      });

      // Move to next question or show results
      if (isLastQuestion) {
        setShowResults(true);
        onQuizComplete();
      } else {
        setTimeout(() => {
          setCurrentQuestionIndex(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your answer. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSubmittedAnswers({});
    setShowResults(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleAnswerChange(option)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  answers[currentQuestion.id] === option
                    ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    answers[currentQuestion.id] === option
                      ? 'border-blue-400 bg-blue-400'
                      : 'border-white/40'
                  }`}>
                    {answers[currentQuestion.id] === option && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <motion.button
                key={option}
                onClick={() => handleAnswerChange(option.toLowerCase())}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  answers[currentQuestion.id] === option.toLowerCase()
                    ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    answers[currentQuestion.id] === option.toLowerCase()
                      ? 'border-blue-400 bg-blue-400'
                      : 'border-white/40'
                  }`}>
                    {answers[currentQuestion.id] === option.toLowerCase() && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        );

      case 'short_answer':
      case 'fill_blank':
        return (
          <div>
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 bg-white/10 border border-white/20 rounded-lg p-4 text-white placeholder-white/50 resize-none focus:outline-none focus:border-blue-400"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (showResults) {
    return (
      <motion.div
        className="max-w-2xl mx-auto p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <Award size={64} className="text-yellow-400 mx-auto mb-4" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-white/70 mb-6">Great job completing the quiz</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-300">{score}%</div>
              <div className="text-white/70 text-sm">Score</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-300">{correctAnswers}/{totalQuestions}</div>
              <div className="text-white/70 text-sm">Correct</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-300">{formatTime(timeSpent)}</div>
              <div className="text-white/70 text-sm">Time</div>
            </div>
          </div>

          <div className="space-y-4">
            {score >= 80 && (
              <div className="flex items-center gap-2 text-green-400 justify-center">
                <CheckCircle size={20} />
                <span>Excellent work! You've mastered this material.</span>
              </div>
            )}
            {score >= 60 && score < 80 && (
              <div className="flex items-center gap-2 text-yellow-400 justify-center">
                <AlertCircle size={20} />
                <span>Good job! Consider reviewing the material for better understanding.</span>
              </div>
            )}
            {score < 60 && (
              <div className="flex items-center gap-2 text-red-400 justify-center">
                <XCircle size={20} />
                <span>Keep practicing! Review the lesson and try again.</span>
              </div>
            )}

            <div className="flex gap-4 justify-center mt-6">
              <button
                onClick={handleRetakeQuiz}
                className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
              >
                <RotateCcw size={20} />
                Retake Quiz
              </button>
              <button
                onClick={onQuizComplete}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Continue Learning
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Lesson Quiz</h2>
            <div className="flex items-center gap-2 text-white/70">
              <Clock size={16} />
              <span>{formatTime(timeSpent)}</span>
            </div>
          </div>
          <div className="text-white/70">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2">
          <motion.div
            className="bg-blue-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-purple-400" />
              <span className="text-purple-300 text-sm font-medium">
                {currentQuestion?.points} points
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              {currentQuestion?.question}
            </h3>
          </div>

          {renderQuestion()}

          {/* Show explanation if answer was submitted */}
          {submittedAnswers[currentQuestion?.id] && currentQuestion?.explanation && (
            <motion.div
              className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-blue-300 font-medium text-sm mb-1">Explanation</div>
                  <div className="text-white/80 text-sm">{currentQuestion.explanation}</div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/50 text-white rounded-lg font-medium transition-colors"
        >
          Previous
        </button>

        <div className="flex gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-blue-500 text-white'
                  : submittedAnswers[questions[index]?.id]
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                  : 'bg-white/20 text-white/70 hover:bg-white/30'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {submittedAnswers[currentQuestion?.id] ? (
          <button
            onClick={handleNextQuestion}
            disabled={isLastQuestion}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
          >
            {isLastQuestion ? 'View Results' : 'Next'}
          </button>
        ) : (
          <button
            onClick={handleSubmitAnswer}
            disabled={!answers[currentQuestion?.id]}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
          >
            Submit Answer
          </button>
        )}
      </div>
    </div>
  );
}
