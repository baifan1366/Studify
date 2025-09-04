import React from 'react';
import { Metadata } from 'next';
import CourseDetailContent from '@/components/course/course-detail-content';
import { getTranslations } from 'next-intl/server';

interface CourseDetailPageProps {
  params: {
    slug: string;
    locale: string;
  };
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const t = await getTranslations('CourseDetailPage');

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

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  return <CourseDetailContent courseSlug={params.slug} />;
}
