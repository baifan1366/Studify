import OnboardingStep from '@/components/onboarding/OnboardingStep';
import { saveStudentOnboardingStep } from '@/app/onboarding-actions';

export default async function Step3Page({ params: { locale } }: { params: { locale: string } }) {

  const handleFinish = saveStudentOnboardingStep.bind(null, 3, locale);

  return (
    <OnboardingStep
      title="You're All Set!"
      description="Thanks for personalizing your experience. You can now start your learning journey."
      action={handleFinish}
      prevHref={`/${locale}/onboarding/student/step2`}
      isLastStep
    >
      <div className="text-center">
        <p>You can change your preferences at any time from your profile settings.</p>
      </div>
    </OnboardingStep>
  );
}