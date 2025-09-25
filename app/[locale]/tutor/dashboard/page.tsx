import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import DashboardContent from "@/components/tutor/dashboard/dashboard-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorDashboardPage');

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

export default async function TutorDashboardPage() {
  const t = await getTranslations('TutorDashboardPage');

  return (
    <div>
      <DashboardContent />
    </div>
  );
}