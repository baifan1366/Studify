import OnboardingStep from '@/components/onboarding/OnboardingStep';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveTutorOnboardingStep } from '@/app/onboarding-actions';

export default async function Step2Page({ params: { locale } }: { params: { locale: string } }) {

  const handleNext = saveTutorOnboardingStep.bind(null, 2, locale);

  return (
    <OnboardingStep
      title="Your Expertise"
      description="Tell us about your teaching experience and qualifications."
      action={handleNext}
      prevHref={`/${locale}/onboarding/tutor/step1`}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="qualifications">Qualifications</Label>
          <Input id="qualifications" name="qualifications" placeholder="e.g., PhD in Physics, Certified Teacher" />
        </div>
        <div>
          <Label htmlFor="experience">Experience</Label>
          <Textarea id="experience" name="experience" placeholder="Describe your teaching experience..." />
        </div>
      </div>
    </OnboardingStep>
  );
}