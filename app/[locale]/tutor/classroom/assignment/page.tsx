import React from 'react';
import { Metadata } from 'next';
import AssignmentContent from '@/components/classroom/assignment-content';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ClassroomAssignmentPage');

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','), // Assuming keywords are comma-separated in translation
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default function AssignmentPage() {
  return <AssignmentContent />;
}