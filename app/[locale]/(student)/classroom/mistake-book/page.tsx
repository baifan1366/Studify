import React from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import MistakeBookPageContent from '@/components/classroom/classroom-mistake-book-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MistakeBookPage');

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

export default function MistakeBookPage() {
  return <MistakeBookPageContent />;
}