import React from 'react';
import { Metadata } from 'next';
import CourseLearningContent from '@/components/course/course-learning-content';
import { getTranslations } from 'next-intl/server';

interface CourseLearningPageProps {
  params: {
    slug: string;
    locale: string;
  };
  searchParams: {
    lesson?: string;
  };
}

export async function generateMetadata({ params }: CourseLearningPageProps): Promise<Metadata> {
  const t = await getTranslations('CourseLearningPage');

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

export default function CourseLearningPage({ params, searchParams }: CourseLearningPageProps) {
  return (
    <CourseLearningContent 
      courseSlug={params.slug} 
      initialLessonId={searchParams.lesson}
    />
  );
}
