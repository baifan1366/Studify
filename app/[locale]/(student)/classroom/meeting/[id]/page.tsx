import React from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import MeetingPageContent from '@/components/classroom/meeting/meeting-page-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ClassroomMeetingPage');

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

export default function MeetingPage({ params }: { params: { id: string } }) {
  return <MeetingPageContent meetingId={params.id} />
}