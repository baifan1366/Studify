import { Metadata } from 'next';
import CourseLearningContent from '@/components/course/course-learning-content';
import { getTranslations } from 'next-intl/server';

interface CourseLearningPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    lesson?: string;
  }>;
}

export async function generateMetadata({ params }: CourseLearningPageProps): Promise<Metadata> {
  const t = await getTranslations('CourseLearningPage');
  const { slug } = await params;

  return {
    title: t('metadata_title', { courseSlug: slug }),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title', { courseSlug: slug }),
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
