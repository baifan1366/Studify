import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { UserReports } from "@/components/admin/reports/user-reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminReportsUsersPage');

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

export default async function AdminReportsUsersPage () {
  const t = await getTranslations('AdminReportsUsersPage');

  return (
    <div>
      <UserReports />
    </div>
  );
}