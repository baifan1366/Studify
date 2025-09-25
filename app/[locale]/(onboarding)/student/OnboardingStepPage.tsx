"use client";

import { useState, useEffect } from "react"; // Import useEffect
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import QuestionComponent from "@/components/onboarding/Question";
import { useUpdateOnboarding } from "@/hooks/profile/use-profile";
import { studentOnboardingQuestions } from "./questions";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useOnboardingStep } from "@/context/OnboardingStepContext"; // Import useOnboardingStep
import { useTranslations } from "next-intl";

export default function OnboardingStepPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('OnboardingStudentPage');

  const { updateCurrentStep, setTotalSteps } = useOnboardingStep(); // Use the context

  const [stepNumber, setStepNumber] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const { mutate: updateOnboarding, isPending } = useUpdateOnboarding();

  // Update context when stepNumber changes
  useEffect(() => {
    updateCurrentStep(stepNumber);
  }, [stepNumber, updateCurrentStep]);

  const questionsForStep = studentOnboardingQuestions.filter((q) => {
    if (stepNumber === 1) {
      // For step 1, only show questions that do NOT have dependencies
      return !q.dependsOn;
    } else if (stepNumber === 2) {
      // For step 2, only show questions that DO have dependencies
      // AND whose dependencies are met by the current answers
      return !!q.dependsOn && answers[q.dependsOn] === q.dependsOnValue;
    }
    return false; // Should not happen if steps are 1 or 2
  });

  // New logic for disableNext
  const disableNext = questionsForStep.some((q) => {
    const answer = answers[q.id];
    if (q.type === "text") {
      return !answer || String(answer).trim() === "";
    } else if (q.type === "single-choice") {
      return !answer;
    } else if (q.type === "multiple-choice") {
      return !answer || (Array.isArray(answer) && answer.length === 0);
    }
    return true; // Default to disabled if question type is unknown
  });

  const handleQuestionChange = (id: string, value: any) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [id]: value,
    }));
  };

  const handleNext = async (formData: FormData) => {
    // The form data is now redundant, as answers are already in state.
    // However, the API expects form data, so we'll convert the state to form data.
    const formDataToSend = new FormData();
    for (const key in answers) {
      if (Array.isArray(answers[key])) {
        answers[key].forEach((val: any) => formDataToSend.append(key, val));
      } else {
        formDataToSend.append(key, answers[key]);
      }
    }

    updateOnboarding(
      {
        step: stepNumber,
        locale,
        role: "student",
        ...Object.fromEntries(formDataToSend.entries()), // Convert FormData to object
      },
      {
        onSuccess: () => {
          const nextStep = stepNumber + 1;
          if (nextStep > 2) {
            // Assuming 2 steps
            router.push(`/${locale}/home`);
          } else {
            setStepNumber(nextStep); // This handles navigation to the next step
          }
        },
      }
    );
  };

  const handlePrevious = () => {
    setStepNumber(stepNumber - 1);
  };

  return (
    <OnboardingStep
      title={t('profile_title')}
      description={t('profile_description')}
      action={handleNext}
      prevAction={handlePrevious}
      isLoading={isPending}
      isFirstStep={stepNumber === 1}
      isLastStep={stepNumber === 2}
      disableNext={disableNext} // Pass the new prop
    >
      <div className="space-y-8">
        {questionsForStep.map((q) => (
          <QuestionComponent
            key={q.id}
            question={q}
            onChange={handleQuestionChange} // Pass the handler
            value={answers[q.id]} // Pass the current value
          />
        ))}
      </div>
    </OnboardingStep>
  );
}
