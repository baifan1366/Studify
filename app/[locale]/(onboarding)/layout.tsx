"use client";

import ProgressBar from "@/components/onboarding/ProgressBar";
import {
  useOnboardingStep,
  OnboardingStepProvider,
} from "@/context/OnboardingStepContext";

const OnboardingProgressBarWrapper = () => {
  const { currentStep, totalSteps } = useOnboardingStep();
  return <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />;
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingStepProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
          </div>
        </header>
        <main className="py-10">
          <div className="max-w-2xl mx-auto mb-8">
            <OnboardingProgressBarWrapper />
          </div>
          {children}
        </main>
      </div>
    </OnboardingStepProvider>
  );
}
