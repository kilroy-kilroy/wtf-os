'use client';

import type { OnboardingFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  data: OnboardingFormData;
  onSubmit: (data: OnboardingFormData) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function ReviewStep({ data, onSubmit, onBack, isSubmitting }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  const sections = [
    { title: 'Company', value: data.company?.company_name || 'Not provided' },
    { title: 'Leadership', value: `${data.leadership?.contacts?.length || 0} contacts` },
    { title: 'Team', value: `${data.team?.members?.length || 0} members` },
    { title: 'Services', value: `${data.services?.services?.length || 0} services` },
    { title: 'Clients', value: `${data.clients?.clients?.length || 0} clients` },
    { title: 'Financials', value: data.financials?.revenue ? `$${data.financials.revenue.toLocaleString()}/mo revenue` : 'Not provided' },
    { title: 'Sales', value: data.sales?.monthly_lead_volume ? `${data.sales.monthly_lead_volume} leads/mo` : 'Not provided' },
    { title: 'Ops', value: data.ops?.hours_available_per_week ? `${data.ops.hours_available_per_week} hrs/week available` : 'Not provided' },
    { title: 'Competitors', value: `${data.competitors?.competitors?.length || 0} competitors` },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Review & Submit</h2>
      <p className="text-[#666666] text-sm mb-6">Review your information before submitting.</p>

      <div className="space-y-3">
        {sections.map(({ title, value }) => (
          <div key={title} className="flex justify-between items-center border-b border-[#222222] pb-3">
            <span className="text-[11px] tracking-[2px] text-[#666666] uppercase">{title}</span>
            <span className="text-white text-sm">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-[#111111] border border-[#E51B23] p-4">
        <p className="text-sm text-[#999999]">
          Ready to submit? This will create your intelligence profile and take you to your dashboard.
        </p>
      </div>

      <FormNavigation
        onBack={onBack}
        nextLabel={isSubmitting ? 'Submitting...' : 'Submit & Go to Dashboard'}
        nextDisabled={isSubmitting}
      />
    </form>
  );
}
