import OnboardingStep from "@/components/onboarding/OnboardingStep";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveStudentOnboardingStep } from "@/app/onboarding-actions";

export default async function Step1Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const handleNext = saveStudentOnboardingStep.bind(null, 1, locale);

  return (
    <OnboardingStep
      title="Welcome to Studify!"
      description="Let's get your profile set up. What's your full name?"
      action={handleNext}
      isFirstStep
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Enter your full name"
          />
        </div>
      </div>
    </OnboardingStep>
  );
}
