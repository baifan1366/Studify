import React from 'react';
import { Metadata } from 'next';
import CourseLearningContent from '@/components/course/course-learning-content';
import { getTranslations } from 'next-intl/server';

interface CourseLearningPageProps {
  params: Promise<{
    slug: string;
    locale: string;
  }>;
  searchParams: Promise<{
    lesson?: string;
  }>;
}

export async function generateMetadata({ params }: CourseLearningPageProps): Promise<Metadata> {
  const { locale } = await params;
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

export default async function CourseLearningPage({ params, searchParams }: CourseLearningPageProps) {
  const { slug } = await params;
  const { lesson } = await searchParams;
  return (
    <CourseLearningContent 
      courseSlug={slug} 
      initialLessonId={lesson}
    />
  );
}
