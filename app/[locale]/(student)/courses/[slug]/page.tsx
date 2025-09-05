import React from 'react';
import { Metadata } from 'next';
import CourseDetailContent from '@/components/course/course-detail-content';
import { getTranslations } from 'next-intl/server';

interface CourseDetailPageProps {
  params: Promise<{
    slug: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('CoursePage');

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

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;
  return <CourseDetailContent courseSlug={slug} />;
}
