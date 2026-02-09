'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLIENT_ONBOARDING_STEPS, type OnboardingFormData } from '@/types/client';
import ProgressBar from './ProgressBar';
import CompanyBasicsStep from './steps/CompanyBasicsStep';
import LeadershipStep from './steps/LeadershipStep';
import TeamStep from './steps/TeamStep';
import ServicesStep from './steps/ServicesStep';
import ClientsStep from './steps/ClientsStep';
import FinancialsStep from './steps/FinancialsStep';
import SalesProcessStep from './steps/SalesProcessStep';
import OpsCapacityStep from './steps/OpsCapacityStep';
import CompetitorsStep from './steps/CompetitorsStep';
import ReviewStep from './steps/ReviewStep';

interface OnboardingWizardProps {
  enrollmentId: string;
}

export default function OnboardingWizard({ enrollmentId }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<OnboardingFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleNext = (stepData: any) => {
    const stepId = CLIENT_ONBOARDING_STEPS[currentStep].id;
    setFormData((prev) => ({ ...prev, [stepId]: stepData }));

    if (currentStep < CLIENT_ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (finalData: OnboardingFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/client/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, ...finalData }),
      });

      if (response.ok) {
        router.push('/client/dashboard');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to submit onboarding data'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepId = CLIENT_ONBOARDING_STEPS[currentStep].id;
    const stepData = formData[stepId as keyof OnboardingFormData];

    switch (stepId) {
      case 'company':
        return <CompanyBasicsStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'leadership':
        return <LeadershipStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'team':
        return <TeamStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'services':
        return <ServicesStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'clients':
        return <ClientsStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'financials':
        return <FinancialsStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'sales':
        return <SalesProcessStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'ops':
        return <OpsCapacityStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'competitors':
        return <CompetitorsStep initialData={stepData as any} onNext={handleNext} onBack={handleBack} />;
      case 'review':
        return <ReviewStep data={formData as OnboardingFormData} onSubmit={handleSubmit} onBack={handleBack} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-anton uppercase mb-2 text-[#E51B23]">
            Intelligence Intake
          </h1>
          <p className="text-[#FFDE59] font-bold mb-1 font-anton tracking-wider">
            {CLIENT_ONBOARDING_STEPS[currentStep].title}
          </p>
          <p className="text-[#666666] text-sm">
            {CLIENT_ONBOARDING_STEPS[currentStep].description}
          </p>
        </div>

        <ProgressBar steps={CLIENT_ONBOARDING_STEPS} currentStep={currentStep} />

        <div className="mt-8 bg-[#1A1A1A] border border-[#333333] p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
