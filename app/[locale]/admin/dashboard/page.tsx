import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminDashboardPage');

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

export default async function AdminDashboardPage() {
  const t = await getTranslations('AdminDashboardPage');

  return (
    <div>
      <h1>{t('page_title')}</h1>
    </div>
  );
}

// ban's status = pending
// announcement's status = draft
// total users
