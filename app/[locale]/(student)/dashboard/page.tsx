import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import DashboardContent from '@/components/student/dashboard-content';

/**
 * Student Dashboard Page Component
 * Learning dashboard with progress tracking and course overview
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('DashboardPage');

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

export default function DashboardPage() {
  return <DashboardContent />;
}
