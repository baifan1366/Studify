import { AdminAIManagement } from '@/components/admin/ai/admin-ai-management';
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminAIPage');

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

export default async function AdminAIPage() {
  const t = await getTranslations('AdminAIPage');

  return <AdminAIManagement />;
}
