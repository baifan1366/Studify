import { AdminMaintenanceCenter } from '@/components/admin/maintenance/admin-maintenance-center';
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminMaintenancePage');

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

export default async function AdminMaintenancePage() {
  const t = await getTranslations('AdminMaintenancePage');
  return <AdminMaintenanceCenter />;
}
