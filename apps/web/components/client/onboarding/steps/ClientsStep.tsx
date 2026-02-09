'use client';

import { useState } from 'react';
import type { ClientsFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: ClientsFormData;
  onNext: (data: ClientsFormData) => void;
  onBack: () => void;
}

export default function ClientsStep({ initialData, onNext, onBack }: Props) {
  const [clients, setClients] = useState(initialData?.clients || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ clients: clients.filter(c => c.client_name.trim() !== '') });
  };

  const addClient = () => setClients([...clients, { client_name: '', industry: '', monthly_value: undefined, profitability_rating: 'Medium', fit_rating: 7, duration_months: undefined, churn_risk: 'Low', notes: '' }]);
  const removeClient = (index: number) => setClients(clients.filter((_, i) => i !== index));
  const updateClient = (index: number, field: string, value: any) => {
    const updated = [...clients];
    updated[index] = { ...updated[index], [field]: value };
    setClients(updated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Client Portfolio</h2>
      <p className="text-[#666666] text-sm mb-6">Add your current clients. Skip if you prefer to add later.</p>

      <div className="space-y-6">
        {clients.length === 0 && (
          <div className="border border-[#333333] bg-[#111111] p-4 text-sm text-[#999999]">
            No clients added yet. Click below to add your first client, or skip to the next step.
          </div>
        )}

        {clients.map((client, index) => (
          <div key={index} className="border border-[#333333] p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-sm">Client {index + 1}</h3>
              <button type="button" onClick={() => removeClient(index)} className="text-[#E51B23] text-sm">Remove</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Client Name *</label>
                <input type="text" value={client.client_name} onChange={(e) => updateClient(index, 'client_name', e.target.value)} required
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Industry</label>
                <input type="text" value={client.industry || ''} onChange={(e) => updateClient(index, 'industry', e.target.value)}
                  placeholder="e.g., SaaS"
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Monthly Value ($)</label>
                <input type="number" value={client.monthly_value || ''} onChange={(e) => updateClient(index, 'monthly_value', parseFloat(e.target.value) || undefined)}
                  min="0" step="100"
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Duration (months)</label>
                <input type="number" value={client.duration_months || ''} onChange={(e) => updateClient(index, 'duration_months', parseInt(e.target.value) || undefined)}
                  min="1"
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Profitability</label>
                <select value={client.profitability_rating || 'Medium'} onChange={(e) => updateClient(index, 'profitability_rating', e.target.value)}
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Churn Risk</label>
                <select value={client.churn_risk || 'Low'} onChange={(e) => updateClient(index, 'churn_risk', e.target.value)}
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addClient}
          className="w-full py-2 border border-dashed border-[#333333] text-[#666666] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors">
          + Add Client
        </button>
      </div>

      <FormNavigation onBack={onBack} />
    </form>
  );
}
