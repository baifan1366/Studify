import { Metadata } from 'next';
import AchievementsContent from '@/components/community/achievement/achievements-content';

export const metadata: Metadata = {
  title: 'Achievements - Studify',
  description: 'Track your learning milestones and unlock rewards.',
};

export default function AchievementsPage() {
  return <AchievementsContent />;
}
