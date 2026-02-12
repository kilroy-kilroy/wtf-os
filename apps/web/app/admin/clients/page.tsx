'use client';

import { useState, useEffect, useRef } from 'react';

interface ClientRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  program_name: string;
  program_slug: string;
  company_name: string | null;
  onboarding_completed: boolean;
  status: string;
  enrolled_at: string;
  leads_sales_calls: boolean;
  call_lab_tier: string | null;
  discovery_lab_tier: string | null;
}

interface Roadmap {
  id: string;
  enrollment_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  uploaded_at: string;
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
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);

  // Roadmap state
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [roadmaps, setRoadmaps] = useState<Record<string, Roadmap[]>>({});
  const [loadingRoadmaps, setLoadingRoadmaps] = useState<string | null>(null);
  const [uploadingRoadmap, setUploadingRoadmap] = useState(false);
  const [roadmapTitle, setRoadmapTitle] = useState('6-Month Go Forward Roadmap');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleResend(enrollmentId: string) {
    setResendingId(enrollmentId);
    try {
      const res = await fetch('/api/client/invite/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ enrollment_id: enrollmentId }),
      });
      if (res.ok) {
        alert('Invite resent successfully with new temporary password!');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || err.message}`);
      }
    } catch (err) {
      alert('Failed to resend invite');
    }
    setResendingId(null);
  }

  async function updateClientTier(client: ClientRow, field: 'call_lab_tier' | 'discovery_lab_tier', value: string | null) {
    setUpdatingTier(`${client.user_id}-${field}`);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ user_id: client.user_id, [field]: value }),
      });
      if (res.ok) {
        setClients(prev => prev.map(c =>
          c.id === client.id ? { ...c, [field]: value } : c
        ));
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Update failed'}`);
      }
    } catch (err) {
      alert('Failed to update tier');
    }
    setUpdatingTier(null);
  }

  async function toggleRoadmapPanel(client: ClientRow) {
    if (expandedClient === client.id) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(client.id);
    await loadRoadmaps(client.id);
  }

  async function loadRoadmaps(enrollmentId: string) {
    setLoadingRoadmaps(enrollmentId);
    try {
      const res = await fetch(`/api/admin/roadmaps?enrollment_id=${enrollmentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmaps(prev => ({ ...prev, [enrollmentId]: data.roadmaps || [] }));
      }
    } catch (err) {
      console.error('Failed to load roadmaps:', err);
    }
    setLoadingRoadmaps(null);
  }

  async function handleRoadmapUpload(enrollmentId: string) {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploadingRoadmap(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('enrollment_id', enrollmentId);
      formData.append('title', roadmapTitle);

      const res = await fetch('/api/admin/roadmaps', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (res.ok) {
        await loadRoadmaps(enrollmentId);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setRoadmapTitle('6-Month Go Forward Roadmap');
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Failed to upload roadmap');
    }
    setUploadingRoadmap(false);
  }

  async function handleDeleteRoadmap(roadmapId: string, enrollmentId: string) {
    if (!confirm('Delete this roadmap? The client will no longer be able to access it.')) return;

    try {
      const res = await fetch('/api/admin/roadmaps', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ roadmap_id: roadmapId }),
      });
      if (res.ok) {
        await loadRoadmaps(enrollmentId);
      } else {
        alert('Failed to delete roadmap');
      }
    } catch (err) {
      alert('Failed to delete roadmap');
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
                <th className="text-center py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Call Lab</th>
                <th className="text-center py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Discovery</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Sales?</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Enrolled</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-8 text-center text-[#666666]">Loading...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-[#666666]">No clients yet. Send an invite above.</td></tr>
              ) : (
                clients.map((client) => (
                  <>
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
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => updateClientTier(client, 'call_lab_tier', null)}
                            disabled={updatingTier === `${client.user_id}-call_lab_tier`}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                              !client.call_lab_tier || client.call_lab_tier === 'free'
                                ? 'bg-[#333333] text-white'
                                : 'bg-transparent text-[#444444] hover:text-[#999999]'
                            }`}
                          >
                            Free
                          </button>
                          <button
                            onClick={() => updateClientTier(client, 'call_lab_tier', 'pro')}
                            disabled={updatingTier === `${client.user_id}-call_lab_tier`}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                              client.call_lab_tier === 'pro'
                                ? 'bg-[#E51B23] text-white'
                                : 'bg-transparent text-[#444444] hover:text-[#999999]'
                            }`}
                          >
                            Pro
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => updateClientTier(client, 'discovery_lab_tier', null)}
                            disabled={updatingTier === `${client.user_id}-discovery_lab_tier`}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                              !client.discovery_lab_tier || client.discovery_lab_tier === 'free'
                                ? 'bg-[#333333] text-white'
                                : 'bg-transparent text-[#444444] hover:text-[#999999]'
                            }`}
                          >
                            Free
                          </button>
                          <button
                            onClick={() => updateClientTier(client, 'discovery_lab_tier', 'pro')}
                            disabled={updatingTier === `${client.user_id}-discovery_lab_tier`}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                              client.discovery_lab_tier === 'pro'
                                ? 'bg-[#E51B23] text-white'
                                : 'bg-transparent text-[#444444] hover:text-[#999999]'
                            }`}
                          >
                            Pro
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-[10px] ${client.leads_sales_calls ? 'text-[#E51B23]' : 'text-[#444444]'}`}>
                          {client.leads_sales_calls ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[#666666] text-xs">
                        {new Date(client.enrolled_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleRoadmapPanel(client)}
                            className={`text-[10px] uppercase font-bold border px-2 py-1 transition-colors ${
                              expandedClient === client.id
                                ? 'border-[#FFDE59] text-[#FFDE59]'
                                : 'border-[#333333] text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59]'
                            }`}
                          >
                            Roadmap
                          </button>
                          <button
                            onClick={() => handleResend(client.id)}
                            disabled={resendingId === client.id}
                            className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59] transition-colors disabled:opacity-50"
                          >
                            {resendingId === client.id ? '...' : 'Resend'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Roadmap Panel (expandable) */}
                    {expandedClient === client.id && (
                      <tr key={`${client.id}-roadmap`} className="border-b border-[#222222]">
                        <td colSpan={10} className="p-0">
                          <div className="bg-[#0A0A0A] border-l-4 border-[#FFDE59] p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-anton text-sm uppercase text-[#FFDE59]">
                                Roadmaps for {client.full_name || client.email}
                              </h3>
                            </div>

                            {/* Upload Form */}
                            <div className="flex flex-wrap items-end gap-3 mb-4">
                              <div>
                                <label className="block text-[10px] tracking-[2px] text-[#666666] mb-1 uppercase">Title</label>
                                <input
                                  type="text"
                                  value={roadmapTitle}
                                  onChange={(e) => setRoadmapTitle(e.target.value)}
                                  className="bg-black border border-[#333333] text-white px-3 py-1.5 text-sm focus:border-[#FFDE59] focus:outline-none w-64"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] tracking-[2px] text-[#666666] mb-1 uppercase">HTML File</label>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".html,.htm"
                                  className="text-sm text-[#999999] file:mr-3 file:py-1.5 file:px-3 file:border file:border-[#333333] file:text-[#999999] file:bg-black file:text-xs file:uppercase file:font-bold file:cursor-pointer hover:file:border-[#FFDE59] hover:file:text-[#FFDE59]"
                                />
                              </div>
                              <button
                                onClick={() => handleRoadmapUpload(client.id)}
                                disabled={uploadingRoadmap}
                                className="bg-[#FFDE59] text-black px-4 py-1.5 text-xs font-bold uppercase hover:bg-yellow-400 transition-colors disabled:opacity-50"
                              >
                                {uploadingRoadmap ? 'Uploading...' : 'Upload'}
                              </button>
                            </div>

                            {/* Existing Roadmaps */}
                            {loadingRoadmaps === client.id ? (
                              <p className="text-[#666666] text-xs">Loading roadmaps...</p>
                            ) : (roadmaps[client.id] || []).length === 0 ? (
                              <p className="text-[#666666] text-xs">No roadmaps uploaded yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {(roadmaps[client.id] || []).map((rm) => (
                                  <div key={rm.id} className="flex items-center justify-between bg-[#111111] border border-[#222222] px-4 py-2">
                                    <div className="flex items-center gap-4">
                                      <span className="text-[#FFDE59] text-xs font-bold uppercase">HTML</span>
                                      <div>
                                        <p className="text-white text-sm">{rm.title}</p>
                                        <p className="text-[#666666] text-[10px]">
                                          {rm.file_name} &middot; Uploaded {new Date(rm.uploaded_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <a
                                        href={rm.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-white hover:border-white transition-colors"
                                      >
                                        View
                                      </a>
                                      <button
                                        onClick={() => handleDeleteRoadmap(rm.id, client.id)}
                                        className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#666666] hover:text-[#E51B23] hover:border-[#E51B23] transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
