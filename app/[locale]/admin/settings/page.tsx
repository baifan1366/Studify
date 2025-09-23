import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import SettingsContent from '@/components/settings/settings-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminSettingsPage');

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

export default async function AdminSettingsPage() {
  const t = await getTranslations('AdminSettingsPage');

  return (
    <div>
      <SettingsContent />
    </div>
  );
}