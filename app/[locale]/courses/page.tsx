import React from 'react';
import { Metadata } from 'next';
import CoursesContent from '@/components/course/courses-content';

export const metadata: Metadata = {
  title: 'Courses - Studify',
  description: 'Explore our comprehensive course catalog with expert instructors and interactive learning materials',
  keywords: ['courses', 'education', 'learning', 'online courses', 'curriculum'],
  openGraph: {
    title: 'Courses - Studify',
    description: 'Comprehensive course catalog with expert instructors',
    type: 'website',
  },
};

export default function CoursesPage() {
  return <CoursesContent />;
}
