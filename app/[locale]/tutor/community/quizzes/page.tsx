import React from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import QuizContent from '@/components/community/quiz/quiz-content';

/**
 * Tutor Community Quizzes Page Component
 * Browse and participate in community quizzes as a tutor
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('QuizzesPage');

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default function TutorQuizzesPage() {
  return <QuizContent />;
}
