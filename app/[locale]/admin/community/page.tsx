import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { Users } from "lucide-react";

import { CommunityList } from "@/components/admin/community-posts/community-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AdminCommunityPage');

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

export default async function AdminCommunityPage() {
  const t = await getTranslations('AdminCommunityPage');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('page_title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('page_description')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <CommunityList />
    </div>
  );
}