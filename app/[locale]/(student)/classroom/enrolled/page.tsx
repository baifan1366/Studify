import React from 'react';
import { Metadata } from 'next';
import EnrolledContent from '@/components/classroom/enrolled-content';
<<<<<<< HEAD:app/[locale]/classroom/enrolled/page.tsx
<<<<<<< HEAD
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enrolled Courses',
  description: 'Browse and manage your enrolled courses.',
};
=======
=======
>>>>>>> 7ee8bf1effa2e10b8755e10266a48c9eece4e95a:app/[locale]/(student)/classroom/enrolled/page.tsx
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ClassroomEnrolledPage');

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
<<<<<<< HEAD:app/[locale]/classroom/enrolled/page.tsx
>>>>>>> ca86d4afaa9fefb7d0bac3d9efc1cac1c0eb2e8e
=======
>>>>>>> 7ee8bf1effa2e10b8755e10266a48c9eece4e95a:app/[locale]/(student)/classroom/enrolled/page.tsx

export default function EnrolledPage() {
  return <EnrolledContent />;
}