import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import RecommendationsContent from '@/components/recommendations/recommendations-content';

/**
 * Recommendations Page Component
 * Personalized course recommendations for students
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('RecommendationsPage');

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

export default function RecommendationsPage() {
  return <RecommendationsContent />;
}
