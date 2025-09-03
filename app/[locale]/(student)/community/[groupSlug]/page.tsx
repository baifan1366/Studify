import GroupDetailContent from '@/components/community/group-detail-content';
import React from 'react';

interface GroupPageProps {
  params: {
    groupSlug: string;
  };
}

export default function GroupPage({ params }: GroupPageProps) {
  return <GroupDetailContent groupSlug={params.groupSlug} />;
}