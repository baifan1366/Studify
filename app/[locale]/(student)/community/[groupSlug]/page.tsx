import GroupDetailContent from '@/components/community/group-detail-content';
import React from 'react';

interface GroupPageProps {
  params: Promise<{
    groupSlug: string;
  }>;
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupSlug } = await params;
  return <GroupDetailContent groupSlug={groupSlug} />;
}