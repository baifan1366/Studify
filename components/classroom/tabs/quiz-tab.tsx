'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Plus, Play, Clock, HelpCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCardStyling, getClassroomColor } from '@/utils/classroom/color-generator';
import { useClassroomQuizzes } from '@/hooks/classroom/use-classroom-quizzes';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/profile/use-user';

interface QuizTabProps {
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  classroom?: any;
}

export function QuizTab({ isOwnerOrTutor, classroomSlug, navigateToSection, classroom }: QuizTabProps) {
  const router = useRouter();
  const { data: currentUser } = useUser();
  const { data: quizzesData, isLoading } = useClassroomQuizzes(classroomSlug);
  const [studentSubmissionStatus, setStudentSubmissionStatus] = useState<Record<number, any>>({});
  
  // Get classroom color
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');

  const quizzes = quizzesData?.quizzes || [];
  const publishedQuizzes = quizzes.filter((q: any) => q.total_questions > 0);

  // Check if student has submitted quizzes
  useEffect(() => {
    const checkStudentSubmissions = async () => {
      if (!currentUser || isOwnerOrTutor) return;

      const statusMap: Record<number, any> = {};
      
      for (const quiz of publishedQuizzes) {
        try {
          const response = await fetch(`/api/classroom/${classroomSlug}/quizzes/${quiz.id}?checkStatus=true`);
          if (response.ok) {
            const data = await response.json();
            if (!data.canTakeQuiz && data.reason === 'already_submitted') {
              statusMap[quiz.id] = data.submission;
            }
          }
        } catch (error) {
          console.error('Error checking submission status:', error);
        }
      }
      
      setStudentSubmissionStatus(statusMap);
    };

    if (publishedQuizzes.length > 0) {
      checkStudentSubmissions();
    }
  }, [publishedQuizzes, currentUser, isOwnerOrTutor, classroomSlug]);

  const handleTakeQuiz = (quizId: number) => {
    router.push(`/classroom/${classroomSlug}/quiz/${quizId}`);
  };
  
  return (
    <Card 
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Quizzes</CardTitle>
          <CardDescription>Interactive quizzes and assessments</CardDescription>
        </div>
        <Button onClick={() => navigateToSection('quiz')}>
          {isOwnerOrTutor ? (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Manage Quizzes
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              View All
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : publishedQuizzes.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quizzes available</p>
            {isOwnerOrTutor && (
              <p className="text-sm text-muted-foreground mt-2">
                Create a quiz to test student knowledge
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {publishedQuizzes.slice(0, 3).map((quiz: any) => {
              const studentSubmission = studentSubmissionStatus[quiz.id];
              const hasSubmitted = !!studentSubmission;

              return (
                <div 
                  key={quiz.id} 
                  className="flex justify-between items-center p-3 rounded-lg bg-gray-100/5 hover:bg-gray-200/8 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{quiz.title}</h4>
                      {hasSubmitted && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Submitted
                        </Badge>
                      )}
                      {quiz.settings.allow_multiple_attempts && (
                        <Badge variant="outline" className="text-xs">Multiple Attempts</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {quiz.total_questions} questions
                      </span>
                      {quiz.settings.time_limit && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {quiz.settings.time_limit} min
                        </span>
                      )}
                      {hasSubmitted && studentSubmission && (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          Score: {studentSubmission.score}/{studentSubmission.max_score}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isOwnerOrTutor && !hasSubmitted && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleTakeQuiz(quiz.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Take Quiz
                    </Button>
                  )}
                  {!isOwnerOrTutor && hasSubmitted && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Your Score</p>
                      <p className="text-sm font-bold text-blue-600">
                        {((studentSubmission.score / studentSubmission.max_score) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {publishedQuizzes.length > 3 && (
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigateToSection('quiz')}
              >
                View all {publishedQuizzes.length} quizzes
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}