import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Dashboard - Studify",
  description:
    "Your personalized tutor dashboard with AI-powered recommendations, progress tracking, and community features",
  keywords: [
    "learning",
    "education",
    "AI tutoring",
    "study dashboard",
  ],
  openGraph: {
    title: "Dashboard - Studify",
    description: "Personalized Learning, Powered by AI and Real-time Tutoring",
    type: "website",
  },
};

export default function DashboardPage() {
  return (
    <div>
      Hi, Tutor
    </div>
  );
}
