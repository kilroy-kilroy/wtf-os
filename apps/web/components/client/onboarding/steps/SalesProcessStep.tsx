'use client';

import { useState } from 'react';
import type { SalesProcessFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: SalesProcessFormData;
  onNext: (data: SalesProcessFormData) => void;
  onBack: () => void;
}

export default function SalesProcessStep({ initialData, onNext, onBack }: Props) {
  const [formData, setFormData] = useState<SalesProcessFormData>(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const handleNumber = (field: keyof SalesProcessFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value ? parseFloat(value) : undefined }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Sales & Lead Generation</h2>
      <p className="text-[#666666] text-sm mb-6">Tell us about your sales funnel and lead gen process.</p>

      <div className="space-y-6">
        <div>
          <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Monthly Lead Volume</label>
          <input type="number" value={formData.monthly_lead_volume || ''} onChange={(e) => handleNumber('monthly_lead_volume', e.target.value)}
            placeholder="50" min="0"
            className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Request to Meeting (%)</label>
            <input type="number" value={formData.request_to_meeting_rate || ''} onChange={(e) => handleNumber('request_to_meeting_rate', e.target.value)}
              placeholder="50" min="0" max="100"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Meeting to Proposal (%)</label>
            <input type="number" value={formData.meeting_to_proposal_rate || ''} onChange={(e) => handleNumber('meeting_to_proposal_rate', e.target.value)}
              placeholder="70" min="0" max="100"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Proposal to Close (%)</label>
            <input type="number" value={formData.proposal_to_close_rate || ''} onChange={(e) => handleNumber('proposal_to_close_rate', e.target.value)}
              placeholder="40" min="0" max="100"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Visibility Score (1-10)</label>
          <p className="text-xs text-[#555555] mb-2">How visible/known are you in your market?</p>
          <input type="number" value={formData.visibility_score || ''} onChange={(e) => handleNumber('visibility_score', e.target.value)}
            placeholder="5" min="1" max="10"
            className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
        </div>

        <div>
          <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Sales Process Description</label>
          <textarea value={formData.sales_process_description || ''} onChange={(e) => setFormData(prev => ({ ...prev, sales_process_description: e.target.value }))}
            placeholder="Describe your typical sales process from first contact to closed deal..."
            rows={3}
            className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
        </div>

        <div>
          <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Sales Positioning Summary</label>
          <textarea value={formData.sales_positioning_summary || ''} onChange={(e) => setFormData(prev => ({ ...prev, sales_positioning_summary: e.target.value }))}
            placeholder="How do you position yourself? What's your unique value prop?"
            rows={3}
            className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
        </div>
      </div>

      <FormNavigation onBack={onBack} />
    </form>
  );
}
