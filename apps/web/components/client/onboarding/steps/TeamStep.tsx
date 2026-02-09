'use client';

import { useState } from 'react';
import type { TeamFormData } from '@/types/client';
import FormNavigation from '../FormNavigation';

interface Props {
  initialData?: TeamFormData;
  onNext: (data: TeamFormData) => void;
  onBack: () => void;
}

const ROLE_OPTIONS = [
  'Account Manager', 'Media Buyer', 'Designer', 'Developer', 'Copywriter',
  'Strategist', 'Project Manager', 'Analytics Specialist', 'SEO Specialist',
  'Social Media Manager', 'Other'
];

export default function TeamStep({ initialData, onNext, onBack }: Props) {
  const [members, setMembers] = useState(initialData?.members || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({ members: members.filter(m => m.name.trim() !== '') });
  };

  const addMember = () => setMembers([...members, { name: '', role: 'Other' }]);
  const removeMember = (index: number) => setMembers(members.filter((_, i) => i !== index));
  const updateMember = (index: number, field: string, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-anton uppercase text-[#E51B23] mb-2">Team Members</h2>
      <p className="text-[#666666] text-sm mb-6">Add your team members. You can skip this and add them later.</p>

      <div className="space-y-4">
        {members.map((member, index) => (
          <div key={index} className="border border-[#333333] p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white text-sm">Team Member {index + 1}</h3>
              <button type="button" onClick={() => removeMember(index)} className="text-[#E51B23] text-sm">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Name *</label>
                <input type="text" value={member.name} onChange={(e) => updateMember(index, 'name', e.target.value)} required
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Role *</label>
                <select value={member.role} onChange={(e) => updateMember(index, 'role', e.target.value)} required
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
                  {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addMember}
          className="w-full py-2 border border-dashed border-[#333333] text-[#666666] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors">
          + Add Team Member
        </button>
      </div>

      <FormNavigation onBack={onBack} />
    </form>
  );
}
