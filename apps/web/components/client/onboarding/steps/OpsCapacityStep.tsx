'use client';

import { useState } from 'react';
import type { OpsCapacityFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: OpsCapacityFormData;
  onNext: (data: OpsCapacityFormData) => void;
  onBack: () => void;
}

export default function OpsCapacityStep({ initialData, onNext, onBack }: Props) {
  const [formData, setFormData] = useState<OpsCapacityFormData>(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const handleNumber = (field: keyof OpsCapacityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value ? parseFloat(value) : undefined }));
  };

  const utilization = formData.hours_available_per_week && formData.hours_sold_per_week
    ? ((formData.hours_sold_per_week / formData.hours_available_per_week) * 100).toFixed(1) : null;

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Operations & Capacity</h2>
      <p className="text-[#666666] text-sm mb-6">Help us understand your delivery capacity.</p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Hours Available/Week</label>
            <input type="number" value={formData.hours_available_per_week || ''} onChange={(e) => handleNumber('hours_available_per_week', e.target.value)}
              placeholder="160" min="0"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Hours Sold/Week</label>
            <input type="number" value={formData.hours_sold_per_week || ''} onChange={(e) => handleNumber('hours_sold_per_week', e.target.value)}
              placeholder="120" min="0"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
        </div>

        {utilization && (
          <div className="bg-[#111111] border border-[#E51B23] p-4">
            <div className="text-sm text-[#666666] mb-1">Team Utilization</div>
            <div className="text-3xl font-anton text-[#FFDE59]">{utilization}%</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">SOP Quality (1-10)</label>
            <input type="number" value={formData.sop_quality_rating || ''} onChange={(e) => handleNumber('sop_quality_rating', e.target.value)}
              placeholder="7" min="1" max="10"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Team Capacity Risk</label>
            <select value={formData.team_capacity_risk || 'Medium'} onChange={(e) => setFormData(prev => ({ ...prev, team_capacity_risk: e.target.value }))}
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
              <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Delivery Model</label>
          <input type="text" value={formData.delivery_model || ''} onChange={(e) => setFormData(prev => ({ ...prev, delivery_model: e.target.value }))}
            placeholder="e.g., Fixed scope, Time & materials, Hybrid"
            className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
        </div>

        <div>
          <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Biggest Bottlenecks</label>
          <textarea value={formData.biggest_bottlenecks || ''} onChange={(e) => setFormData(prev => ({ ...prev, biggest_bottlenecks: e.target.value }))}
            placeholder="What are the main constraints in your delivery?"
            rows={3}
            className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
        </div>
      </div>

      <FormNavigation onBack={onBack} />
    </form>
  );
}
