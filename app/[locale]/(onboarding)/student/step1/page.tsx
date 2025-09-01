import OnboardingStep from "@/components/onboarding/OnboardingStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveStudentOnboardingStep } from "@/app/onboarding-actions";
import { getTranslations } from 'next-intl/server';

export default async function Step1Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('OnboardingStudentStep1Page');
  const handleNext = saveStudentOnboardingStep.bind(null, 1, locale);

  return (
    <OnboardingStep
      title={t('welcome_title')}
      description={t('welcome_description')}
      action={handleNext}
      isFirstStep
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">{t('full_name_label')}</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder={t('full_name_placeholder')}
          />
        </div>
      </div>
    </OnboardingStep>
  );
}
