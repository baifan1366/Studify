import React from 'react';
import { Metadata } from 'next';
import MeetingContent from '@/components/classroom/meeting-content';

export const metadata: Metadata = {
  title: 'Meetings - Studify',
  description: 'Join live meetings, view scheduled sessions, and access meeting recordings',
  keywords: ['meetings', 'live sessions', 'video calls', 'recordings', 'education'],
  openGraph: {
    title: 'Meetings - Studify',
    description: 'Join live meetings and access educational sessions',
    type: 'website',
  },
};

export default function MeetingPage() {
  return <MeetingContent />;
}
