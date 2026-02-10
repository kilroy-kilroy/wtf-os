'use client';

import { useState } from 'react';
import type { FinancialsFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: FinancialsFormData;
  onNext: (data: FinancialsFormData) => void;
  onBack: () => void;
}

export default function FinancialsStep({ initialData, onNext, onBack }: Props) {
  const [formData, setFormData] = useState<FinancialsFormData>(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const handleChange = (field: keyof FinancialsFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value ? parseFloat(value) : undefined }));
  };

  const grossMargin = formData.revenue && formData.cost_of_delivery
    ? ((formData.revenue - formData.cost_of_delivery) / formData.revenue * 100).toFixed(1) : null;
  const netProfit = formData.revenue && formData.cost_of_delivery && formData.operating_costs
    ? ((formData.revenue - formData.cost_of_delivery - formData.operating_costs) / formData.revenue * 100).toFixed(1) : null;

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Financials</h2>
      <p className="text-[#666666] text-sm mb-6">All fields optional. Helps calculate profitability metrics.</p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Monthly Revenue ($)</label>
            <input type="number" value={formData.revenue || ''} onChange={(e) => handleChange('revenue', e.target.value)}
              placeholder="50000" min="0" step="100"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Cost of Delivery ($)</label>
            <input type="number" value={formData.cost_of_delivery || ''} onChange={(e) => handleChange('cost_of_delivery', e.target.value)}
              placeholder="20000" min="0" step="100"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Operating Costs ($)</label>
            <input type="number" value={formData.operating_costs || ''} onChange={(e) => handleChange('operating_costs', e.target.value)}
              placeholder="15000" min="0" step="100"
              className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
          </div>
          {grossMargin && (
            <div className="bg-[#111111] border border-[#333333] p-3">
              <div className="text-[11px] text-[#666666] uppercase">Gross Margin</div>
              <div className="text-2xl font-anton text-[#FFDE59]">{grossMargin}%</div>
            </div>
          )}
        </div>

        {netProfit && (
          <div className="bg-[#111111] border border-[#E51B23] p-4">
            <div className="text-sm text-[#666666] mb-1">Net Profit Margin</div>
            <div className="text-3xl font-anton text-[#FFDE59]">{netProfit}%</div>
          </div>
        )}

        <div className="border-t border-[#333333] pt-6">
          <h3 className="font-bold text-white mb-4">Goals & Targets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Target Monthly Revenue ($)</label>
              <input type="number" value={formData.target_revenue_goal || ''} onChange={(e) => handleChange('target_revenue_goal', e.target.value)}
                placeholder="100000" min="0" step="1000"
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Target Monthly Profit ($)</label>
              <input type="number" value={formData.target_profit_goal || ''} onChange={(e) => handleChange('target_profit_goal', e.target.value)}
                placeholder="30000" min="0" step="1000"
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      <FormNavigation onBack={onBack} />
    </form>
  );
}
