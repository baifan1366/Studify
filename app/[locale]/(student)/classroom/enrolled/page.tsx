import React from 'react';
import { Metadata } from 'next';
import EnrolledContent from '@/components/classroom/enrolled-content';

export const metadata: Metadata = {
  title: 'Enrolled Courses',
  description: 'Browse and manage your enrolled courses.',
};
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ClassroomEnrolledPage');

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

export default function EnrolledPage() {
  return <EnrolledContent />;
}