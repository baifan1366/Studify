'use client';

import React from 'react';
import { Brain, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { useTranslations } from 'next-intl'

interface QuizTabProps {
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  classroom?: any;
}

export function QuizTab({ isOwnerOrTutor, classroomSlug, navigateToSection, classroom }: QuizTabProps) {
  const t = useTranslations('TutorClassroom');
  
  // Get classroom color
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');
  
  return (
    <Card 
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('quizzes')}</CardTitle>
          <CardDescription>{t('interactive_quizzes_assessments')}</CardDescription>
        </div>
        {isOwnerOrTutor && (
          <Button onClick={() => navigateToSection('quiz')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('create_quiz')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('no_quizzes_available')}</p>
          {isOwnerOrTutor && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('create_quiz_to_test_knowledge')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}