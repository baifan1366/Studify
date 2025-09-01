import OnboardingStep from '@/components/onboarding/OnboardingStep';
import { saveTutorOnboardingStep } from '@/app/onboarding-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getTranslations } from 'next-intl/server';

export default async function Step3Page({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('OnboardingTutorStep3Page');
  const handleFinish = saveTutorOnboardingStep.bind(null, 3, locale);

  return (
    <OnboardingStep
      title={t('availability_title')}
      description={t('availability_description')}
      action={handleFinish}
      prevHref={`/${locale}/onboarding/tutor/step2`}
      isLastStep
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="hourlyRate">{t('hourly_rate_label')}</Label>
          <Input id="hourlyRate" name="hourlyRate" type="number" placeholder={t('hourly_rate_placeholder')} />
        </div>
        <div>
          <Label>{t('availability_label')}</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
                <Checkbox id="weekdays" name="availability" value="weekdays" />
                <Label htmlFor="weekdays">{t('weekdays_label')}</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="weekends" name="availability" value="weekends" />
                <Label htmlFor="weekends">{t('weekends_label')}</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="evenings" name="availability" value="evenings" />
                <Label htmlFor="evenings">{t('evenings_label')}</Label>
            </div>
          </div>
        </div>
      </div>
    </OnboardingStep>
  );
}