import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorNotificationsPage');

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

export default async function TutorNotificationsPage() {
  const t = await getTranslations('TutorNotificationsPage');

  return (
    <div>
      <h2>{t('page_title')}</h2>
    </div>
  );
}