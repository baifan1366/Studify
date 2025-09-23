import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import ContentReports from '@/components/admin/reports/content-reports';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminReportsContentPage');

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

export default async function AdminReportsContentPage() {
  const t = await getTranslations('AdminReportsContentPage');

  return (
    <div>
      <ContentReports />
    </div>
  );
}