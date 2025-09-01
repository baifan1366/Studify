import EnrolledContent from '@/components/classroom/enrolled-content';
<<<<<<< HEAD
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enrolled Courses',
  description: 'Browse and manage your enrolled courses.',
};
=======
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
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
>>>>>>> ca86d4afaa9fefb7d0bac3d9efc1cac1c0eb2e8e

export default function EnrolledPage() {
  return <EnrolledContent />;
}