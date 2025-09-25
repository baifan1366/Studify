import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import AchievementsContent from '@/components/community/achievement/achievements-content';

/**
 * Tutor Achievements Page Component
 * Track learning milestones and unlock rewards as a tutor
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AchievementsPage');

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

export default function TutorAchievementsPage() {
  return <AchievementsContent />;
}
