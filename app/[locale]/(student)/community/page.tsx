import React from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import CommunityContent from '@/components/community/community-content';

/**
 * Community Main Page Component
 * Browse community groups, posts, and activities
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CommunityPage');

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

export default function CommunityPage() {
  return <CommunityContent />;
}
