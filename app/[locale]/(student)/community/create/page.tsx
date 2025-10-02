import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import CreateGroupForm from '@/components/community/create-group-form';
import { Suspense } from 'react';

/**
 * Create Community Group Page Component
 * Form for creating new community groups
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CreateGroupPage');

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

export default async function CreateGroupPage() {
  const t = await getTranslations('CreateGroupPage');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('page_title')}</h1>
          <p className="text-gray-300">
            {t('page_description')}
          </p>
        </div>
        
        <Suspense fallback={<div className="text-white">{t('loading')}</div>}>
          <CreateGroupForm />
        </Suspense>
      </div>
    </div>
  );
}
