import OnboardingStep from '@/components/onboarding/OnboardingStep';
import { saveStudentOnboardingStep } from '@/app/onboarding-actions';
import { getTranslations } from 'next-intl/server';

export default async function Step3Page({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('OnboardingStudentStep3Page');
  const handleFinish = saveStudentOnboardingStep.bind(null, 3, locale);

  return (
    <OnboardingStep
      title={t('all_set_title')}
      description={t('all_set_description')}
      action={handleFinish}
      prevHref={`/${locale}/onboarding/student/step2`}
      isLastStep
    >
      <div className="text-center">
        <p>{t('preferences_note')}</p>
      </div>
    </OnboardingStep>
  );
}