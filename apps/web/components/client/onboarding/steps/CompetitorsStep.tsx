'use client';

import { useState } from 'react';
import type { CompetitorsFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: CompetitorsFormData;
  onNext: (data: CompetitorsFormData) => void;
  onBack: () => void;
}

export default function CompetitorsStep({ initialData, onNext, onBack }: Props) {
  const [competitors, setCompetitors] = useState(initialData?.competitors || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ competitors: competitors.filter(c => c.competitor_name.trim() !== '') });
  };

  const addCompetitor = () => setCompetitors([...competitors, { competitor_name: '', url: '', positioning_summary: '', strengths: '', weaknesses: '', differentiation_opportunities: '' }]);
  const removeCompetitor = (index: number) => setCompetitors(competitors.filter((_, i) => i !== index));
  const updateCompetitor = (index: number, field: string, value: string) => {
    const updated = [...competitors];
    updated[index] = { ...updated[index], [field]: value };
    setCompetitors(updated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Competitive Landscape</h2>
      <p className="text-[#666666] text-sm mb-6">Optional but valuable. Understanding competitors sharpens your positioning.</p>

      <div className="space-y-6">
        {competitors.map((comp, index) => (
          <div key={index} className="border border-[#333333] p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-sm">Competitor {index + 1}</h3>
              <button type="button" onClick={() => removeCompetitor(index)} className="text-[#E51B23] text-sm">Remove</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Name *</label>
                  <input type="text" value={comp.competitor_name} onChange={(e) => updateCompetitor(index, 'competitor_name', e.target.value)} required
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Website</label>
                  <input type="url" value={comp.url || ''} onChange={(e) => updateCompetitor(index, 'url', e.target.value)}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Their Positioning</label>
                <textarea value={comp.positioning_summary || ''} onChange={(e) => updateCompetitor(index, 'positioning_summary', e.target.value)} rows={2}
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Strengths</label>
                  <textarea value={comp.strengths || ''} onChange={(e) => updateCompetitor(index, 'strengths', e.target.value)} rows={2}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Weaknesses</label>
                  <textarea value={comp.weaknesses || ''} onChange={(e) => updateCompetitor(index, 'weaknesses', e.target.value)} rows={2}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addCompetitor}
          className="w-full py-2 border border-dashed border-[#333333] text-[#666666] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors">
          + Add Competitor
        </button>
      </div>

      <FormNavigation onBack={onBack} />
    </form>
  );
}
