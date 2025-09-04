import React from 'react';
import { Metadata } from 'next';
import { ClassroomLiveSessionsPage } from '@/components/classroom/classroom-live-sessions-page';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await getTranslations('ClassroomLiveSessionsPage');

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

export default function Page({ params }: { params: { slug: string } }) {
  return <ClassroomLiveSessionsPage classroomSlug={params.slug} />;
}
