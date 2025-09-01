import React from 'react';
import { Metadata } from 'next';
import ClassroomContent from '@/components/classroom/classroom-content';
import { getTranslations } from 'next-intl/server';

<<<<<<< HEAD
export const metadata: Metadata = {
  title: 'Classroom - Studify',
  description: 'Access your virtual classroom with live sessions, course materials, and interactive learning tools',
  keywords: ['classroom', 'virtual learning', 'live sessions', 'course materials', 'education'],
  openGraph: {
    title: 'Classroom - Studify',
    description: 'Virtual classroom with live sessions and interactive learning',
    type: 'website',
  },
};
=======
export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations('ClassroomPage');

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
>>>>>>> ca86d4afaa9fefb7d0bac3d9efc1cac1c0eb2e8e

export default function ClassroomPage() {
  return <ClassroomContent />;
}