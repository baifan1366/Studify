import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import BanList from '@/components/admin/ban/ban-list';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminBanPage');

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

export default async function AdminBanPage() {
  const t = await getTranslations('AdminBanPage');

  return (
    <div>
      <BanList />
    </div>
  );
}