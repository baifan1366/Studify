import React from 'react';
import { Metadata } from 'next';
import StudentsContent from '@/components/student/students-content';

export const metadata: Metadata = {
  title: "Students - Studify",
  description:
    "Manage student profiles, track progress, and monitor performance in your educational platform",
  keywords: ["students", "management", "education", "progress tracking"],
  openGraph: {
    title: "Students Management - Studify",
    description:
      "Manage student profiles, track progress, and monitor performance",
    type: "website",
  },
};

export default function StudentsPage() {
  return <StudentsContent />;
}
