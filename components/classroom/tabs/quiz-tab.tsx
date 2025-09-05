'use client';

import React from 'react';
import { Brain, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface QuizTabProps {
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  classroom?: any;
}

export function QuizTab({ isOwnerOrTutor, classroomSlug, navigateToSection, classroom }: QuizTabProps) {
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
          <CardTitle>Quizzes</CardTitle>
          <CardDescription>Interactive quizzes and assessments</CardDescription>
        </div>
        {isOwnerOrTutor && (
          <Button onClick={() => navigateToSection('quiz')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No quizzes available</p>
          {isOwnerOrTutor && (
            <p className="text-sm text-muted-foreground mt-2">
              Create a quiz to test student knowledge
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}