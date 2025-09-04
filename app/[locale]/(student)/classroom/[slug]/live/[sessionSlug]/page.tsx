import React from 'react';
import { Metadata } from 'next';
import { LiveSessionRoom } from '@/components/classroom/live-session-room';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { slug: string; sessionSlug: string } }): Promise<Metadata> {
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

export default function Page({ params }: { params: { slug: string; sessionSlug: string } }) {
  return <LiveSessionRoom classroomSlug={params.slug} sessionSlug={params.sessionSlug} />;
}
