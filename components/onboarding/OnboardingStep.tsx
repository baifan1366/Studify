import React from "react";
import { Spinner } from "../ui/spinner";

interface OnboardingStepProps {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: (formData: FormData) => void;
  prevAction?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isLoading?: boolean;
  disableNext?: boolean; // New prop
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({
  title,
  description,
  children,
  action,
  prevAction,
  isFirstStep,
  isLastStep,
  isLoading,
  disableNext,
}) => {
  return (
    <form action={action} className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-gray-600 mb-8">{description}</p>
      <div>{children}</div>
      <div className="flex justify-between mt-8">
        {!isFirstStep && (
          <button
            type="button"
            onClick={prevAction}
            className="px-6 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Previous
          </button>
        )}
        <div />
        {!isLastStep && (
          <button
            type="submit"
            disabled={isLoading || disableNext}
            className={`px-6 py-2 border rounded-md text-white flex items-center ${
              isLoading || disableNext
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading && <Spinner className="mr-2" />}
            Next
          </button>
        )}
        {isLastStep && (
          <button
            type="submit"
            disabled={isLoading || disableNext}
            className={`px-6 py-2 border rounded-md text-white flex items-center ${
              isLoading || disableNext
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading && <Spinner className="mr-2" />}
            Finish
          </button>
        )}
      </div>
    </form>
  );
};

export default OnboardingStep;
