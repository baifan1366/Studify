import React from 'react';
import { Metadata } from 'next';
import ClassroomMistakeBookPage from '@/components/classroom/classroom-mistake-book-page';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await getTranslations('ClassroomMistakeBookPage');

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
  return <ClassroomMistakeBookPage classroomSlug={params.slug} />;
}
