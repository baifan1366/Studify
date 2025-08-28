import React from 'react';
import { Metadata } from 'next';
import AssignmentContent from '@/components/classroom/assignment-content';

export const metadata: Metadata = {
  title: 'Assignments - Studify',
  description: 'View, submit, and track your assignments with due dates and progress tracking',
  keywords: ['assignments', 'homework', 'submissions', 'due dates', 'education'],
  openGraph: {
    title: 'Assignments - Studify',
    description: 'Manage your assignments and track submission progress',
    type: 'website',
  },
};

export default function AssignmentPage() {
  return <AssignmentContent />;
}
