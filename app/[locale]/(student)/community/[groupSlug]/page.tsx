import React from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import GroupDetailContent from '@/components/community/group-detail-content';

/**
 * Community Group Page Component
 * View group details, posts, and members
 */

interface GroupPageProps {
  params: Promise<{
    groupSlug: string;
  }>;
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const t = await getTranslations('GroupPage');
  const { groupSlug } = await params;
  
  return {
    title: t('metadata_title', { groupSlug }),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title', { groupSlug }),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupSlug } = await params;
  return <GroupDetailContent groupSlug={groupSlug} />;
}