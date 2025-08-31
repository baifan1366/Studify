import React from 'react';
import Link from 'next/link';

interface OnboardingStepProps {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: (formData: FormData) => void;
  prevHref?: string;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({ title, description, children, action, prevHref, isFirstStep, isLastStep }) => {
  return (
    <form action={action} className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-gray-600 mb-8">{description}</p>
      <div>{children}</div>
      <div className="flex justify-between mt-8">
        {!isFirstStep && prevHref && (
          <Link href={prevHref} className="px-6 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Previous
          </Link>
        )}
        <div />
        {!isLastStep && (
          <button type="submit" className="px-6 py-2 border rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Next
          </button>
        )}
        {isLastStep && (
            <button type="submit" className="px-6 py-2 border rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Finish
            </button>
        )}
      </div>
    </form>
  );
};

export default OnboardingStep;
