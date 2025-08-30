'use client';

import { usePathname } from 'next/navigation';
import ProgressBar from "@/components/onboarding/ProgressBar";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getStep = () => {
    if (pathname.includes('step1')) return 1;
    if (pathname.includes('step2')) return 2;
    if (pathname.includes('step3')) return 3;
    return 1;
  };

  const currentStep = getStep();
  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
        </div>
      </header>
      <main className="py-10">
        <div className="max-w-2xl mx-auto mb-8">
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>
        {children}
      </main>
    </div>
  );
}
