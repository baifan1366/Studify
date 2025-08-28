import React from 'react';
import { Metadata } from 'next';
import LearningPathContent from '@/components/classroom/learning-path-content';

export const metadata: Metadata = {
  title: 'Learning Path - Studify',
  description: 'Follow your personalized learning path with structured courses and milestones',
  keywords: ['learning path', 'curriculum', 'milestones', 'personalized learning', 'education'],
  openGraph: {
    title: 'Learning Path - Studify',
    description: 'Follow your personalized learning journey with structured milestones',
    type: 'website',
  },
};

export default function LearningPathPage() {
  return <LearningPathContent />;
}
