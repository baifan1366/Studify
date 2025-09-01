import OnboardingStep from '@/components/onboarding/OnboardingStep';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveTutorOnboardingStep } from '@/app/onboarding-actions';
import { getTranslations } from 'next-intl/server';

export default async function Step2Page({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('OnboardingTutorStep2Page');
  const handleNext = saveTutorOnboardingStep.bind(null, 2, locale);

  return (
    <OnboardingStep
      title={t('expertise_title')}
      description={t('expertise_description')}
      action={handleNext}
      prevHref={`/${locale}/onboarding/tutor/step1`}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="qualifications">{t('qualifications_label')}</Label>
          <Input id="qualifications" name="qualifications" placeholder={t('qualifications_placeholder')} />
        </div>
        <div>
          <Label htmlFor="experience">{t('experience_label')}</Label>
          <Textarea id="experience" name="experience" placeholder={t('experience_placeholder')} />
        </div>
      </div>
    </OnboardingStep>
  );
}