import React from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PostDetailClient from '@/components/community/post-detail-client';

/**
 * Post Detail Page Component
 * View individual post content and comments in community group
 */
interface PostDetailPageProps {
  params: Promise<{
    groupSlug: string;
    postSlug: string;
  }>;
}

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const t = await getTranslations('PostDetailPage');
  const { groupSlug, postSlug } = await params;
  
  return {
    title: t('metadata_title', { postSlug, groupSlug }),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title', { postSlug, groupSlug }),
      description: t('og_description'),
      type: 'article',
    },
  };
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
    const { groupSlug, postSlug } = await params;

    return <PostDetailClient groupSlug={groupSlug} postSlug={postSlug} />;
}