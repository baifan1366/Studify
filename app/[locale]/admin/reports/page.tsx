import AdminReportsList from '@/components/admin/reports/admin-reports-list';
import AdminReportsStats from '@/components/admin/reports/admin-reports-stats';
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminReportsPage');

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

export default async function AdminReportsPage() {
  const t = await getTranslations('AdminReportsPage');

  return (
    <div className="space-y-6">
        <AdminReportsStats />
        <AdminReportsList />
      </div>
  );
}