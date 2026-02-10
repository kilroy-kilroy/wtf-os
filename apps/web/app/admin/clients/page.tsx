'use client';

import { useState, useEffect } from 'react';

interface ClientRow {
  id: string;
  email: string;
  full_name: string | null;
  program_name: string;
  program_slug: string;
  company_name: string | null;
  onboarding_completed: boolean;
  status: string;
  enrolled_at: string;
  leads_sales_calls: boolean;
}

const PROGRAMS = [
  { slug: 'agency-studio', name: 'Agency Studio' },
  { slug: 'agency-studio-plus', name: 'Agency Studio+' },
  { slug: 'salesos-studio', name: 'SalesOS Studio' },
  { slug: 'salesos-growth', name: 'SalesOS Growth' },
  { slug: 'salesos-team', name: 'SalesOS Team' },
  { slug: 'demandos-studio', name: 'DemandOS Studio' },
  { slug: 'demandos-growth', name: 'DemandOS Growth' },
  { slug: 'demandos-team', name: 'DemandOS Team' },
];

export default function AdminClientsPage() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteProgram, setInviteProgram] = useState('agency-studio');
  const [inviteRole, setInviteRole] = useState('primary');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) {
      setApiKey(stored);
      setAuthed(true);
      loadClients(stored);
    }
  }, []);

  async function loadClients(key: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('admin_api_key', apiKey);
    setAuthed(true);
    loadClients(apiKey);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteStatus('sending');
    try {
      const res = await fetch('/api/client/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          program_slug: inviteProgram,
          role: inviteRole,
        }),
      });

      if (res.ok) {
        setInviteStatus('Invite sent successfully!');
        setInviteEmail('');
        setInviteName('');
        loadClients(apiKey);
      } else {
        const err = await res.json();
        setInviteStatus(`Error: ${err.error || err.message}`);
      }
    } catch (err) {
      setInviteStatus('Failed to send invite');
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Admin: Client Management</h1>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Admin API Key"
            className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none"
          />
          <button type="submit" className="w-full bg-[#E51B23] text-white py-3 font-anton uppercase">
            Access
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Client Management</h1>
          <div className="flex gap-3">
            <a href="/admin/five-minute-friday" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              5-Minute Friday
            </a>
            <a href="/admin" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Main Admin
            </a>
          </div>
        </div>

        {/* Invite Form */}
        <div className="bg-[#1A1A1A] border border-[#333333] p-6 mb-8">
          <h2 className="text-xl font-anton uppercase text-[#FFDE59] mb-4">Invite New Client</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Email *</label>
              <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Full Name</label>
              <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Program *</label>
              <select value={inviteProgram} onChange={(e) => setInviteProgram(e.target.value)}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
                {PROGRAMS.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none">
                <option value="primary">Primary Contact</option>
                <option value="team_member">Team Member</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-[#E51B23] text-white py-2 font-anton uppercase hover:bg-red-700 transition-colors">
                Send Invite
              </button>
            </div>
          </form>
          {inviteStatus && (
            <p className={`mt-3 text-sm ${inviteStatus.startsWith('Error') ? 'text-[#E51B23]' : 'text-[#FFDE59]'}`}>
              {inviteStatus}
            </p>
          )}
        </div>

        {/* Clients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333333]">
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Name</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Email</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Program</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Company</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Status</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Sales?</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#666666]">Loading...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#666666]">No clients yet. Send an invite above.</td></tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-[#222222] hover:bg-[#111111]">
                    <td className="py-3 px-2 text-white">{client.full_name || '—'}</td>
                    <td className="py-3 px-2 text-[#999999]">{client.email}</td>
                    <td className="py-3 px-2">
                      <span className="bg-[#1A1A1A] border border-[#333333] px-2 py-0.5 text-[10px] uppercase text-[#FFDE59]">
                        {client.program_name}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#999999]">{client.company_name || '—'}</td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] uppercase font-bold ${
                        client.onboarding_completed ? 'text-green-400' : client.status === 'active' ? 'text-[#FFDE59]' : 'text-[#666666]'
                      }`}>
                        {client.onboarding_completed ? 'Active' : 'Pending Onboarding'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] ${client.leads_sales_calls ? 'text-[#E51B23]' : 'text-[#444444]'}`}>
                        {client.leads_sales_calls ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#666666] text-xs">
                      {new Date(client.enrolled_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
