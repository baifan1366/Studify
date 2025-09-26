import React from 'react';
import { Metadata } from 'next';
import { LearningPathPage } from '@/components/classroom/learning-path/learning-path-page';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ClassroomLearningPathPage');

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

export default function Page() {
  return <LearningPathPage />;
}