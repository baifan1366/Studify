import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import ProfileContent from '@/components/tutor/profile/profile-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorProfilePage');

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

export default async function TutorProfilePage() {
  const t = await getTranslations('TutorProfilePage');

  return (
    <div>
      <ProfileContent />
    </div>
  );
}