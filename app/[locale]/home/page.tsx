import React from 'react';
import { Metadata } from 'next';
import HomeContent from '@/components/home/home-content';

export const metadata: Metadata = {
  title: 'Home - Studify',
  description: 'Your personalized learning dashboard with AI-powered recommendations, progress tracking, and community features',
  keywords: ['learning', 'education', 'AI tutoring', 'progress tracking', 'study dashboard'],
  openGraph: {
    title: 'Home - Studify',
    description: 'Personalized Learning, Powered by AI and Real-time Tutoring',
    type: 'website',
  },
};

export default function HomePage() {
  return <HomeContent />;
}

