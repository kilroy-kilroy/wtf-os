'use client';

import { useState } from 'react';
import type { LeadershipFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: LeadershipFormData;
  onNext: (data: LeadershipFormData) => void;
  onBack: () => void;
}

const ROLE_OPTIONS = ['CEO', 'Founder', 'Co-Founder', 'CRO', 'COO', 'CMO', 'Partner', 'VP Sales', 'VP Operations', 'Other'];

export default function LeadershipStep({ initialData, onNext, onBack }: Props) {
  const [contacts, setContacts] = useState(
    initialData?.contacts || [{ full_name: '', role: 'CEO', email: '', linkedin_url: '', is_decision_maker: true }]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ contacts: contacts.filter(c => c.full_name.trim() !== '') });
  };

  const addContact = () => {
    setContacts([...contacts, { full_name: '', role: 'Other', email: '', linkedin_url: '', is_decision_maker: false }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: string, value: any) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Leadership Team</h2>
      <p className="text-[#666666] text-sm mb-6">Add the key decision makers and stakeholders.</p>

      <div className="space-y-6">
        {contacts.map((contact, index) => (
          <div key={index} className="border border-[#333333] p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-sm">Contact {index + 1}</h3>
              {contacts.length > 1 && (
                <button type="button" onClick={() => removeContact(index)} className="text-[#E51B23] hover:text-red-400 text-sm">
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Full Name *</label>
                <input type="text" value={contact.full_name} onChange={(e) => updateContact(index, 'full_name', e.target.value)} required
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Role *</label>
                <select value={contact.role} onChange={(e) => updateContact(index, 'role', e.target.value)} required
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
                  {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Email</label>
                <input type="email" value={contact.email || ''} onChange={(e) => updateContact(index, 'email', e.target.value)}
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">LinkedIn URL</label>
                <input type="url" value={contact.linkedin_url || ''} onChange={(e) => updateContact(index, 'linkedin_url', e.target.value)}
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center text-sm text-[#999999]">
                <input type="checkbox" checked={contact.is_decision_maker || false} onChange={(e) => updateContact(index, 'is_decision_maker', e.target.checked)} className="mr-2" />
                Primary Decision Maker
              </label>
            </div>
          </div>
        ))}

        <button type="button" onClick={addContact}
          className="w-full py-2 border border-dashed border-[#333333] text-[#666666] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors">
          + Add Another Contact
        </button>
      </div>

      <FormNavigation onBack={onBack} nextDisabled={contacts.filter(c => c.full_name.trim() !== '').length === 0} />
    </form>
  );
}
