import React from 'react';
import { Metadata } from 'next';
import CoursesContent from '@/components/course/courses-content';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CoursesPage');

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

export default function CoursesPage() {
  return <CoursesContent />;
}