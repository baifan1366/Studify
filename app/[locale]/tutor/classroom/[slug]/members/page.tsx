import React from 'react';
import { Metadata } from 'next';
import { ClassroomMembersPage } from '@/components/classroom/classroom-members-page';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('ClassroomMembersPage');

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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ClassroomMembersPage classroomSlug={slug} />;
}
