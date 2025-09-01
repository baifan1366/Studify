import OnboardingStep from '@/components/onboarding/OnboardingStep';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { saveStudentOnboardingStep } from '@/app/onboarding-actions';
import { getTranslations } from 'next-intl/server';

export default async function Step2Page({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('OnboardingStudentStep2Page');
  const handleNext = saveStudentOnboardingStep.bind(null, 2, locale);

  return (
    <OnboardingStep
      title={t('personalize_title')}
      description={t('learning_goals_description')}
      action={handleNext}
      prevHref={`/${locale}/onboarding/student/step1`}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="goal1" name="learningGoals" value="ace_exams" />
          <Label htmlFor="goal1">{t('goal_ace_exams')}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="goal2" name="learningGoals" value="new_skill" />
          <Label htmlFor="goal2">{t('goal_new_skill')}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="goal3" name="learningGoals" value="homework_help" />
          <Label htmlFor="goal3">{t('goal_homework_help')}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="goal4" name="learningGoals" value="curiosity" />
          <Label htmlFor="goal4">{t('goal_curiosity')}</Label>
        </div>
      </div>
    </OnboardingStep>
  );
}