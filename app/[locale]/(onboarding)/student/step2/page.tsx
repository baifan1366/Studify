import OnboardingStep from '@/components/onboarding/OnboardingStep';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { saveStudentOnboardingStep } from '@/app/onboarding-actions';

export default async function Step2Page({ params: { locale } }: { params: { locale: string } }) {

  const handleNext = saveStudentOnboardingStep.bind(null, 2, locale);

  return (
    <OnboardingStep
      title="Personalize Your Experience"
      description="What are your main learning goals?"
      action={handleNext}
      prevHref={`/${locale}/onboarding/student/step1`}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="goal1" name="learningGoals" value="ace_exams" />
          <Label htmlFor="goal1">Ace my exams</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="goal2" name="learningGoals" value="new_skill" />
          <Label htmlFor="goal2">Learn a new skill</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="goal3" name="learningGoals" value="homework_help" />
          <Label htmlFor="goal3">Get help with homework</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="goal4" name="learningGoals" value="curiosity" />
          <Label htmlFor="goal4">Just curious!</Label>
        </div>
      </div>
    </OnboardingStep>
  );
}