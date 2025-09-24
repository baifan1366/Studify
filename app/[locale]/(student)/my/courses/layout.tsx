import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

/**
 * My Courses Layout Component
 * Provides metadata for student's enrolled courses page
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MyCoursesPage');

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

export default function MyCoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
