'use client'
import React, { createContext, useContext, useState } from "react";

interface OnboardingStepContextType {
  currentStep: number;
  totalSteps: number;
  setTotalSteps: (steps: number) => void;
  updateCurrentStep: (step: number) => void; // Add this line
}

const OnboardingStepContext = createContext<
  OnboardingStepContextType | undefined
>(undefined);

export const OnboardingStepProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(2);

  // This function will be called by OnboardingStepPage to update the current step
  const updateCurrentStep = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <OnboardingStepContext.Provider
      value={{ currentStep, totalSteps, setTotalSteps, updateCurrentStep }}
    >
      {children}
    </OnboardingStepContext.Provider>
  );
};

export const useOnboardingStep = () => {
  const context = useContext(OnboardingStepContext);
  if (context === undefined) {
    throw new Error(
      "useOnboardingStep must be used within an OnboardingStepProvider"
    );
  }
  return context;
};
