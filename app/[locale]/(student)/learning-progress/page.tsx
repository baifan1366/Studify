import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LearningProgressClient from '@/components/student/learning-progress-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LearningProgress' });

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords'),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
    },
  };
}

interface PageProps {
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function LearningProgressPage({ searchParams }: PageProps) {
  const { type } = await searchParams;
  
  return <LearningProgressClient type={type} />;
}
