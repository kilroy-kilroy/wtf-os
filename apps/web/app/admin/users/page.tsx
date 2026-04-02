'use client';

import { useState, useEffect } from 'react';

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  type: 'client' | 'user' | 'lead';
  company_name: string | null;
  company_url: string | null;
  products_used: string[];
  highest_tier: string;
  has_active_subscription: boolean;
  created_at: string;
  report_counts: {
    call_lab: number;
    discovery: number;
    visibility: number;
    assessment: number;
  };
}

const PRODUCT_COLORS: Record<string, string> = {
  call_lab: '#E51B23',
  discovery: '#00D4FF',
  visibility: '#a855f7',
  assessment: '#f59e0b',
};

const TYPE_COLORS: Record<string, string> = {
  client: '#00D4FF',
  user: '#FFDE59',
  lead: '#666',
};

export default function AdminUsersPage() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'user' | 'lead'>('all');

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) {
      setApiKey(stored);
      setAuthed(true);
      loadUsers(stored);
    }
  }, []);

  async function loadUsers(key: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
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
    loadUsers(apiKey);
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      search === '' ||
      (user.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.company_name || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || user.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const counts = {
    client: users.filter((u) => u.type === 'client').length,
    user: users.filter((u) => u.type === 'user').length,
    lead: users.filter((u) => u.type === 'lead').length,
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Admin: User Directory</h1>
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
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">User Directory</h1>
          <div className="flex gap-3">
            <a href="/admin/clients" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Clients
            </a>
            <a href="/admin" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Main Admin
            </a>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or company..."
          className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none mb-4"
        />

        {/* Type Filter Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 text-sm font-bold uppercase transition-colors ${
              typeFilter === 'all'
                ? 'bg-[#E51B23] text-white'
                : 'border border-[#333333] text-[#999999] hover:text-white'
            }`}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setTypeFilter('client')}
            className={`px-4 py-2 text-sm font-bold uppercase transition-colors ${
              typeFilter === 'client'
                ? 'bg-[#00D4FF] text-black'
                : 'border border-[#333333] text-[#999999] hover:text-white'
            }`}
          >
            Clients ({counts.client})
          </button>
          <button
            onClick={() => setTypeFilter('user')}
            className={`px-4 py-2 text-sm font-bold uppercase transition-colors ${
              typeFilter === 'user'
                ? 'bg-[#FFDE59] text-black'
                : 'border border-[#333333] text-[#999999] hover:text-white'
            }`}
          >
            Users ({counts.user})
          </button>
          <button
            onClick={() => setTypeFilter('lead')}
            className={`px-4 py-2 text-sm font-bold uppercase transition-colors ${
              typeFilter === 'lead'
                ? 'bg-[#666] text-white'
                : 'border border-[#333333] text-[#999999] hover:text-white'
            }`}
          >
            Leads ({counts.lead})
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333333]">
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Name</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Email</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Type</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Company</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Products</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Tier</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#666666]">Loading...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#666666]">No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#222222] hover:bg-[#111111] cursor-pointer"
                    onClick={() => (window.location.href = '/admin/users/' + user.id)}
                  >
                    <td className="py-3 px-2 text-white">
                      {user.full_name || user.email}
                    </td>
                    <td className="py-3 px-2 text-[#999999]">{user.email}</td>
                    <td className="py-3 px-2">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5"
                        style={{
                          backgroundColor: TYPE_COLORS[user.type] || '#666',
                          color: user.type === 'lead' ? '#fff' : '#000',
                        }}
                      >
                        {user.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#999999]">
                      {user.company_name || '—'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1.5 items-center">
                        {user.products_used.map((product) => (
                          <span
                            key={product}
                            title={product.replace('_', ' ')}
                            className="inline-block rounded-full"
                            style={{
                              width: 6,
                              height: 6,
                              backgroundColor: PRODUCT_COLORS[product] || '#555',
                            }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="text-[10px] font-bold uppercase"
                        style={{
                          color:
                            user.highest_tier === 'pro'
                              ? '#E51B23'
                              : user.highest_tier === 'lead'
                              ? '#666'
                              : '#00D4FF',
                        }}
                      >
                        {user.highest_tier || 'free'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#666666] text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
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
