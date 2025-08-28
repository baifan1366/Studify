import React from 'react';
import { Metadata } from 'next';
import EnrolledContent from '@/components/classroom/enrolled-content';

export const metadata: Metadata = {
  title: 'Enrolled Courses - Studify',
  description: 'View and manage your enrolled courses, track progress, and access course materials',
  keywords: ['enrolled courses', 'course progress', 'learning materials', 'education'],
  openGraph: {
    title: 'Enrolled Courses - Studify',
    description: 'Manage your enrolled courses and track learning progress',
    type: 'website',
  },
};

export default function EnrolledPage() {
  return <EnrolledContent />;
}
