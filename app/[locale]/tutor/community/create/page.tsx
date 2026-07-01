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
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto max-w-2xl pt-8">
        <div className="mb-8">
          <div className="mb-3 h-1 w-12 rounded-full bg-orange-500" />
          <h1 className="mb-2 text-3xl font-bold text-foreground">{t('page_title')}</h1>
          <p className="text-muted-foreground">
            {t('page_description')}
          </p>
        </div>
        
        <Suspense fallback={<div className="text-muted-foreground">{t('loading')}</div>}>
          <CreateGroupForm />
        </Suspense>
      </div>
    </div>
  );
}
