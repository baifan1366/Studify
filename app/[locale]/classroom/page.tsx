import React from 'react';
import { Metadata } from 'next';
import ClassroomContent from '@/components/classroom/classroom-content';

export const metadata: Metadata = {
  title: 'Classroom - Studify',
  description: 'Access your virtual classroom with live sessions, course materials, and interactive learning tools',
  keywords: ['classroom', 'virtual learning', 'live sessions', 'course materials', 'education'],
  openGraph: {
    title: 'Classroom - Studify',
    description: 'Virtual classroom with live sessions and interactive learning',
    type: 'website',
  },
};

export default function ClassroomPage() {
  return <ClassroomContent />;
}