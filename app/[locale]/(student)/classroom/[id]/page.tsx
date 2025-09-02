import React from 'react';
import { Metadata } from 'next';
import { ClassroomDetailPage } from '@/components/classroom/classroom-detail-page';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const t = await getTranslations('ClassroomDetailPage');

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

export default function Page({ params }: { params: { id: string } }) {
  return <ClassroomDetailPage classroomId={params.id} />;
}