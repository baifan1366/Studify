import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { StoragePageLayout } from '@/components/tutor/storage/storage-page-layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorStoragePage');

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

export default async function TutorStoragePage() {
  const t = await getTranslations('TutorStoragePage');

  return (
    <div>
      <StoragePageLayout />
    </div>
  );
}