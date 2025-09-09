import React from 'react';
import { Metadata } from 'next';
import LiveClassroom from '@/components/classroom/live-session/live-classroom';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; sessionSlug: string }> }): Promise<Metadata> {
  const { slug, sessionSlug } = await params;
  const t = await getTranslations('LiveSessionRoom');

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

export default async function Page({ params }: { params: Promise<{ slug: string; sessionSlug: string }> }) {
  const { slug, sessionSlug } = await params;
  return (
    <LiveClassroom 
      classroomSlug={slug} 
      sessionId={sessionSlug} 
      participantName="Student" 
      userRole="student" 
    />
  );
}
