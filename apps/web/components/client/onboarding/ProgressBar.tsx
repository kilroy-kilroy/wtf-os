'use client';

import type { OnboardingStep } from '@/types/client';

interface ProgressBarProps {
  steps: OnboardingStep[];
  currentStep: number;
}

export default function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex-1 ${index !== steps.length - 1 ? 'pr-1' : ''}`}
          >
            <div
              className={`h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-[#FFDE59]'
                  : index < currentStep
                  ? 'bg-[#E51B23]'
                  : 'bg-[#333333]'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-[#666666] font-poppins">
        Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
      </div>
    </div>
  );
}
