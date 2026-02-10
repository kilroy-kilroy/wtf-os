'use client';

import { useState } from 'react';
import type { CompanyBasicsFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: CompanyBasicsFormData;
  onNext: (data: CompanyBasicsFormData) => void;
  onBack: () => void;
}

export default function CompanyBasicsStep({ initialData, onNext, onBack }: Props) {
  const [formData, setFormData] = useState<CompanyBasicsFormData>(
    initialData || { company_name: '' }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'founded' || name === 'team_size' ? parseInt(value) || undefined : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-6">Company Basics</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="company_name" className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
            Company Name *
          </label>
          <input
            type="text"
            id="company_name"
            name="company_name"
            required
            value={formData.company_name}
            onChange={handleChange}
            className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
            Website URL
          </label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url || ''}
            onChange={handleChange}
            placeholder="https://example.com"
            className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="industry_niche" className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
            Industry / Niche
          </label>
          <input
            type="text"
            id="industry_niche"
            name="industry_niche"
            value={formData.industry_niche || ''}
            onChange={handleChange}
            placeholder="e.g., SaaS, E-commerce, B2B Services"
            className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hq_location" className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
              HQ Location
            </label>
            <input
              type="text"
              id="hq_location"
              name="hq_location"
              value={formData.hq_location || ''}
              onChange={handleChange}
              placeholder="City, State"
              className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="founded" className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
              Year Founded
            </label>
            <input
              type="number"
              id="founded"
              name="founded"
              value={formData.founded || ''}
              onChange={handleChange}
              placeholder="2020"
              min="1900"
              max={new Date().getFullYear()}
              className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="team_size" className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
              Team Size
            </label>
            <input
              type="number"
              id="team_size"
              name="team_size"
              value={formData.team_size || ''}
              onChange={handleChange}
              placeholder="10"
              min="1"
              className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="revenue_range" className="block text-[11px] tracking-[2px] text-[#666666] mb-2 uppercase">
              Revenue Range
            </label>
            <select
              id="revenue_range"
              name="revenue_range"
              value={formData.revenue_range || ''}
              onChange={handleChange}
              className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors"
            >
              <option value="">Select range</option>
              <option value="Under $500k">Under $500k</option>
              <option value="$500k-$1M">$500k-$1M</option>
              <option value="$1M-$2M">$1M-$2M</option>
              <option value="$2M-$5M">$2M-$5M</option>
              <option value="$5M-$10M">$5M-$10M</option>
              <option value="$10M+">$10M+</option>
            </select>
          </div>
        </div>
      </div>

      <FormNavigation onBack={onBack} showBack={false} nextDisabled={!formData.company_name} />
    </form>
  );
}
