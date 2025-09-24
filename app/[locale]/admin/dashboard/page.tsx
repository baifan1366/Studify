import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard";

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
      <AdminDashboard />
    </div>
  );
}