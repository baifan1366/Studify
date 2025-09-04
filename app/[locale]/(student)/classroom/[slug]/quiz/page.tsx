import React from 'react';
import { Metadata } from 'next';
import { ClassroomQuizPage } from '@/components/classroom/classroom-quiz-page';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await getTranslations('ClassroomQuizPage');

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
  return <ClassroomQuizPage classroomSlug={params.slug} />;
}
