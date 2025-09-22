import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminBannedUsersPage');

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

export default async function AdminBannedUsersPage() {
  const t = await getTranslations('AdminBannedUsersPage');

  return (
    <div>
      <h2>{t('page_title')}</h2>
    </div>
  );
}