import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import AnnouncementList from '@/components/admin/announcements/announcement-list';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminAnnouncementsPage');

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

export default async function AdminAnnouncementsPage() {
  const t = await getTranslations('AdminAnnouncementsPage');

  return (
    <div className="p-4">
      <AnnouncementList />
    </div>
  );
}