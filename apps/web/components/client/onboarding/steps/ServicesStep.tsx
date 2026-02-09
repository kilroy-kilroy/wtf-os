'use client';

import { useState } from 'react';
import type { ServicesFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: ServicesFormData;
  onNext: (data: ServicesFormData) => void;
  onBack: () => void;
}

const DELIVERY_MODELS = ['Retainer', 'Project', 'Hybrid', 'Performance', 'Other'];

export default function ServicesStep({ initialData, onNext, onBack }: Props) {
  const [services, setServices] = useState(
    initialData?.services || [{ service_name: '', description: '', price_range: '', delivery_model: 'Retainer', delivery_constraints: '' }]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ services: services.filter(s => s.service_name.trim() !== '') });
  };

  const addService = () => setServices([...services, { service_name: '', description: '', price_range: '', delivery_model: 'Retainer', delivery_constraints: '' }]);
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index));
  const updateService = (index: number, field: string, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Services & Offers</h2>
      <p className="text-[#666666] text-sm mb-6">Define the services you offer to clients.</p>

      <div className="space-y-6">
        {services.map((service, index) => (
          <div key={index} className="border border-[#333333] p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-sm">Service {index + 1}</h3>
              {services.length > 1 && (
                <button type="button" onClick={() => removeService(index)} className="text-[#E51B23] text-sm">Remove</button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Service Name *</label>
                <input type="text" value={service.service_name} onChange={(e) => updateService(index, 'service_name', e.target.value)} required
                  placeholder="e.g., Paid Media Management"
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Description</label>
                <textarea value={service.description || ''} onChange={(e) => updateService(index, 'description', e.target.value)} rows={2}
                  placeholder="What's included? What outcomes do you deliver?"
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Price Range</label>
                  <input type="text" value={service.price_range || ''} onChange={(e) => updateService(index, 'price_range', e.target.value)}
                    placeholder="e.g., $5k-$15k/mo"
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Delivery Model *</label>
                  <select value={service.delivery_model || 'Retainer'} onChange={(e) => updateService(index, 'delivery_model', e.target.value)} required
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
                    {DELIVERY_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addService}
          className="w-full py-2 border border-dashed border-[#333333] text-[#666666] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors">
          + Add Another Service
        </button>
      </div>

      <FormNavigation onBack={onBack} />
    </form>
  );
}
