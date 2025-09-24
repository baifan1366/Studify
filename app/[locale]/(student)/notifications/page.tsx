import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import NotificationsPage from '@/components/notifications/notifications-page';

/**
 * Notifications Page Component
 * View and manage student notifications
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('NotificationsPage');

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

export default function Page() {
  return <NotificationsPage />;
}
