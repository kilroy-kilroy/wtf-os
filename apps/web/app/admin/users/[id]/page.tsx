'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  subscription_tier: string | null;
  call_lab_tier: string | null;
  discovery_lab_tier: string | null;
  visibility_lab_tier: string | null;
  auth_method: string | null;
  preferences: { title?: string; phone?: string } | null;
  tags: string[] | null;
  org_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  type: 'client' | 'user';
}

interface OrgData {
  id: string;
  name: string | null;
  website: string | null;
  target_industry: string | null;
  company_size: string | null;
  company_revenue: string | null;
}

interface EnrollmentData {
  id: string;
  status: string;
  onboarding_completed: boolean;
  leads_sales_calls: boolean;
  enrolled_at: string;
  program: { name: string; slug: string } | null;
  company: {
    company_name: string | null;
    url: string | null;
    industry_niche: string | null;
    hq_location: string | null;
    founded: string | null;
    team_size: string | null;
    revenue_range: string | null;
  } | null;
}

interface ActivityItem {
  type: 'call_lab' | 'discovery' | 'visibility' | 'assessment' | 'coaching' | 'friday' | 'loops_event';
  id: string;
  label: string;
  score?: number;
  version?: string;
  date: string;
  url?: string;
}

interface SubscriptionData {
  plan_type: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
}

interface DocumentData {
  id: string;
  title: string;
  document_type: string;
  file_url: string | null;
  external_url: string | null;
  category: string;
  created_at: string;
}

interface SameCompanyUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

interface ProfileResponse {
  user: UserProfile;
  org: OrgData | null;
  enrollments: EnrollmentData[];
  activity: ActivityItem[];
  subscriptions: SubscriptionData[];
  documents: DocumentData[];
  same_company_users: SameCompanyUser[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  call_lab: '#E51B23',
  discovery: '#00D4FF',
  visibility: '#a855f7',
  assessment: '#f59e0b',
  coaching: '#FFDE59',
  friday: '#22c55e',
  loops_event: '#666',
};

const TYPE_LABELS: Record<string, string> = {
  call_lab: 'Call Lab',
  discovery: 'Discovery',
  visibility: 'Visibility',
  assessment: 'Assessment',
  coaching: 'Coaching',
  friday: 'Friday',
  loops_event: 'Email',
};

const REVENUE_RANGE_OPTIONS = [
  'Under $500k',
  '$500k-$1M',
  '$1M-$2M',
  '$2M-$5M',
  '$5M-$10M',
  '$10M+',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 52) return `${diffWeeks}w ago`;
  return date.toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#222]">
      <span className="text-[10px] tracking-[2px] text-[#666] uppercase shrink-0 mr-3">
        {label}
      </span>
      <div className="text-sm text-right min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminUserProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Inline edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [orgSearchOpen, setOrgSearchOpen] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Array<{ id: string; name: string; website: string | null; primary_domain: string | null }>>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) {
      setApiKey(stored);
      setAuthed(true);
      loadProfile(stored);
    }
  }, []);

  async function loadProfile(key: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
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
    loadProfile(apiKey);
  }

  // ─── PATCH helpers ──────────────────────────────────────────────────────────

  async function patchUser(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Update failed: ${err.error || 'Unknown error'}`);
      return false;
    }
    return true;
  }

  function startEdit(field: string, currentValue: string) {
    setEditingField(field);
    setEditDraft(currentValue);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditDraft('');
  }

  async function saveField(field: string, value: string) {
    setEditingField(null);
    if (!profile) return;

    const trimmed = value.trim();

    // Map field paths to patch body shapes
    let patchBody: Record<string, unknown> = {};

    if (field === 'first_name') patchBody = { first_name: trimmed || null };
    else if (field === 'last_name') patchBody = { last_name: trimmed || null };
    else if (field === 'email') patchBody = { email: trimmed || null };
    else if (field === 'preferences.title') patchBody = { preferences: { title: trimmed || null } };
    else if (field === 'preferences.phone') patchBody = { preferences: { phone: trimmed || null } };
    else if (field === 'org.name') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, name: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, name: trimmed || null } };
      }
    } else if (field === 'org.website') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, website: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, website: trimmed || null } };
      }
    } else if (field === 'org.target_industry') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, target_industry: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, target_industry: trimmed || null } };
      }
    } else if (field === 'org.company_size') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, company_size: trimmed || null } };
      } else {
        patchBody = { company: { create_org: true, company_size: trimmed || null } };
      }
    }

    const ok = await patchUser(patchBody);
    if (!ok) return;

    // Update local state
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, user: { ...prev.user } };

      if (field === 'first_name') {
        updated.user.first_name = trimmed || null;
        updated.user.full_name = [trimmed, prev.user.last_name].filter(Boolean).join(' ') || null;
      } else if (field === 'last_name') {
        updated.user.last_name = trimmed || null;
        updated.user.full_name = [prev.user.first_name, trimmed].filter(Boolean).join(' ') || null;
      } else if (field === 'email') {
        updated.user.email = trimmed;
      } else if (field === 'preferences.title') {
        updated.user.preferences = { ...prev.user.preferences, title: trimmed || undefined };
      } else if (field === 'preferences.phone') {
        updated.user.preferences = { ...prev.user.preferences, phone: trimmed || undefined };
      } else if (field.startsWith('org.') && prev.org) {
        const subField = field.replace('org.', '') as keyof OrgData;
        return { ...prev, org: { ...prev.org, [subField]: trimmed || null } };
      } else if (field.startsWith('org.') && !prev.org) {
        // Org was just created — reload to get the full org data
        loadProfile(apiKey);
        return prev;
      }

      return updated;
    });
  }

  async function saveTier(field: 'subscription_tier' | 'call_lab_tier' | 'discovery_lab_tier' | 'visibility_lab_tier', value: string) {
    const ok = await patchUser({ [field]: value || null });
    if (!ok) return;
    setProfile((prev) =>
      prev ? { ...prev, user: { ...prev.user, [field]: value || null } } : prev
    );
  }

  async function saveCompanySelect(field: string, value: string) {
    if (!profile) return;
    let patchBody: Record<string, unknown> = {};
    if (field === 'org.company_revenue') {
      if (profile.org) {
        patchBody = { company: { org_id: profile.org.id, company_revenue: value || null } };
      } else {
        patchBody = { company: { create_org: true, company_revenue: value || null } };
      }
    }
    const ok = await patchUser(patchBody);
    if (!ok) return;
    setProfile((prev) => {
      if (!prev) return prev;
      if (prev.org) {
        return { ...prev, org: { ...prev.org, company_revenue: value || null } };
      }
      // Org was just created — reload
      loadProfile(apiKey);
      return prev;
    });
  }

  async function searchOrgs(query: string) {
    setOrgSearchQuery(query);
    if (query.length < 2) { setOrgSearchResults([]); return; }
    try {
      const res = await fetch(`/api/admin/orgs/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrgSearchResults(data.orgs || []);
      }
    } catch { setOrgSearchResults([]); }
  }

  async function linkToOrg(orgId: string) {
    const ok = await patchUser({ company: { org_id: orgId } });
    if (!ok) return;
    setOrgSearchOpen(false);
    setOrgSearchQuery('');
    setOrgSearchResults([]);
    loadProfile(apiKey);
  }

  // ─── Reusable inline edit render ─────────────────────────────────────────────

  function EditableField({
    field,
    value,
    placeholder = '—',
  }: {
    field: string;
    value: string | null | undefined;
    placeholder?: string;
  }) {
    if (editingField === field) {
      return (
        <input
          autoFocus
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          onBlur={() => saveField(field, editDraft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveField(field, editDraft);
            if (e.key === 'Escape') cancelEdit();
          }}
          className="bg-black border border-[#00D4FF] text-white px-2 py-0.5 text-sm focus:outline-none w-full text-right"
        />
      );
    }
    return (
      <span
        onClick={() => startEdit(field, value || '')}
        className="text-[#999] cursor-pointer hover:text-[#00D4FF] transition-colors"
        title="Click to edit"
      >
        {value || placeholder}
      </span>
    );
  }

  // ─── Auth gate ────────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Admin: User Profile</h1>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Admin API Key"
            className="w-full bg-black border border-[#333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none"
          />
          <button type="submit" className="w-full bg-[#E51B23] text-white py-3 font-anton uppercase">
            Access
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-[#666]">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-[#666]">User not found.</p>
      </div>
    );
  }

  const { user, org, enrollments, activity, subscriptions, documents, same_company_users } = profile;
  const isClient = enrollments.length > 0;
  const enrollment = enrollments[0] ?? null;
  const company = enrollment?.company ?? null;
  const fridayCount = activity.filter((a) => a.type === 'friday').length;
  const firstAssessment = activity.find((a) => a.type === 'assessment');

  // ─── Page ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-anton uppercase text-white">
              {user.full_name || user.email}
            </h1>
            <p className="text-[#999] text-sm mt-0.5">{user.email}</p>
          </div>
          <a
            href="/admin/users"
            className="text-sm border border-[#333] px-4 py-2 text-[#999] hover:text-white transition-colors shrink-0"
          >
            ← Back to Users
          </a>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-6">

          {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
          <div>

            {/* User Card */}
            <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded">

              {/* Type Badge */}
              <div className="mb-4">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-1 ${
                    user.type === 'client'
                      ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                      : 'bg-[#FFDE59]/20 text-[#FFDE59]'
                  }`}
                >
                  {user.type}
                </span>
              </div>

              {/* Fields */}
              <FieldRow label="First Name">
                <EditableField field="first_name" value={user.first_name} />
              </FieldRow>
              <FieldRow label="Last Name">
                <EditableField field="last_name" value={user.last_name} />
              </FieldRow>
              <FieldRow label="Email">
                <EditableField field="email" value={user.email} />
              </FieldRow>
              <FieldRow label="Title">
                <EditableField field="preferences.title" value={user.preferences?.title} />
              </FieldRow>
              <FieldRow label="Phone">
                <EditableField field="preferences.phone" value={user.preferences?.phone} />
              </FieldRow>
              <FieldRow label="Auth Method">
                <span className="text-[#666]">{user.auth_method || '—'}</span>
              </FieldRow>
              <FieldRow label="Last Sign-in">
                <span className="text-[#666]">
                  {user.last_sign_in_at ? formatTimeAgo(user.last_sign_in_at) : '—'}
                </span>
              </FieldRow>

              {/* Tier Dropdowns */}
              <FieldRow label="Subscription">
                <select
                  value={user.subscription_tier || ''}
                  onChange={(e) => saveTier('subscription_tier', e.target.value)}
                  className="bg-black border border-[#333] text-[#999] text-xs px-2 py-0.5 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                >
                  <option value="">—</option>
                  <option value="lead">lead</option>
                  <option value="free">free</option>
                  <option value="subscriber">subscriber</option>
                  <option value="client">client</option>
                </select>
              </FieldRow>
              <FieldRow label="Call Lab">
                <select
                  value={user.call_lab_tier || ''}
                  onChange={(e) => saveTier('call_lab_tier', e.target.value)}
                  className="bg-black border border-[#333] text-[#999] text-xs px-2 py-0.5 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                >
                  <option value="">—</option>
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                </select>
              </FieldRow>
              <FieldRow label="Discovery Lab">
                <select
                  value={user.discovery_lab_tier || ''}
                  onChange={(e) => saveTier('discovery_lab_tier', e.target.value)}
                  className="bg-black border border-[#333] text-[#999] text-xs px-2 py-0.5 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                >
                  <option value="">—</option>
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                </select>
              </FieldRow>
              <FieldRow label="Visibility Lab">
                <select
                  value={user.visibility_lab_tier || ''}
                  onChange={(e) => saveTier('visibility_lab_tier', e.target.value)}
                  className="bg-black border border-[#333] text-[#999] text-xs px-2 py-0.5 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                >
                  <option value="">—</option>
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                </select>
              </FieldRow>

              {/* Loops Link */}
              <a
                href={`https://app.loops.so/contacts?email=${encodeURIComponent(user.email)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase font-bold border border-[#333] px-3 py-1.5 text-[#999] hover:text-[#00D4FF] hover:border-[#00D4FF] transition-colors block text-center mt-3"
              >
                View in Loops
              </a>
            </div>

            {/* Company Card */}
            <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-anton text-sm uppercase text-[#FFDE59]">Company</h3>
                <button
                  onClick={() => setOrgSearchOpen(!orgSearchOpen)}
                  className="text-[9px] uppercase font-bold text-[#666] hover:text-[#00D4FF] transition-colors"
                >
                  {orgSearchOpen ? 'Cancel' : 'Link to org...'}
                </button>
              </div>

              {orgSearchOpen && (
                <div className="mb-3">
                  <input
                    autoFocus
                    value={orgSearchQuery}
                    onChange={(e) => searchOrgs(e.target.value)}
                    placeholder="Search orgs by name..."
                    className="bg-black border border-[#00D4FF] text-white px-2 py-1 text-xs focus:outline-none w-full mb-1"
                  />
                  {orgSearchResults.length > 0 && (
                    <div className="border border-[#333] bg-[#111] max-h-32 overflow-y-auto">
                      {orgSearchResults.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => linkToOrg(o.id)}
                          className="block w-full text-left px-2 py-1.5 text-xs text-[#999] hover:text-white hover:bg-[#222] transition-colors border-b border-[#222] last:border-0"
                        >
                          {o.name}
                          {o.primary_domain && (
                            <span className="text-[#666] ml-2">@{o.primary_domain}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {orgSearchQuery.length >= 2 && orgSearchResults.length === 0 && (
                    <p className="text-[#666] text-[10px] px-1">No orgs found</p>
                  )}
                </div>
              )}

              <FieldRow label="Name">
                <EditableField field="org.name" value={org?.name ?? null} />
              </FieldRow>
              <FieldRow label="Website">
                <EditableField field="org.website" value={org?.website ?? null} />
              </FieldRow>
              <FieldRow label="Industry">
                <EditableField field="org.target_industry" value={org?.target_industry ?? null} />
              </FieldRow>
              <FieldRow label="Size">
                <EditableField field="org.company_size" value={org?.company_size ?? null} />
              </FieldRow>
              <FieldRow label="Revenue">
                <select
                  value={org?.company_revenue || ''}
                  onChange={(e) => saveCompanySelect('org.company_revenue', e.target.value)}
                  className="bg-black border border-[#333] text-[#999] text-xs px-2 py-0.5 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                >
                  <option value="">—</option>
                  {REVENUE_RANGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </FieldRow>
            </div>

            {/* Same-Company Users */}
            {same_company_users.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] tracking-[2px] text-[#666] uppercase mb-2">Same Company</p>
                {same_company_users.map((u) => (
                  <a
                    key={u.id}
                    href={`/admin/users/${u.id}`}
                    className="block py-1 text-sm text-[#999] hover:text-[#00D4FF] transition-colors"
                  >
                    {u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}{' '}
                    <span className="text-[#666]">{u.email}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── CENTER COLUMN ─────────────────────────────────────────────────── */}
          <div>
            <h2 className="font-anton text-sm uppercase text-[#FFDE59] mb-4">
              Activity <span className="text-[#666] font-normal">({activity.length})</span>
            </h2>

            {activity.length === 0 ? (
              <p className="text-[#666] text-sm">No activity recorded yet.</p>
            ) : (
              <div>
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[#222]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[item.type] || '#666' }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase w-20 shrink-0"
                      style={{ color: TYPE_COLORS[item.type] || '#666' }}
                    >
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    <span className="text-white text-sm truncate flex-1">{item.label}</span>
                    {item.score != null && (
                      <span className="text-[#FFDE59] text-xs font-mono shrink-0">{item.score}</span>
                    )}
                    <span className="text-[#666] text-xs shrink-0">{formatTimeAgo(item.date)}</span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] uppercase font-bold border border-[#333] px-2 py-0.5 text-[#999] hover:text-[#00D4FF] hover:border-[#00D4FF] transition-colors shrink-0"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────────────── */}
          <div>

            {isClient ? (
              <>
                {/* Enrollment Card */}
                {enrollment && (
                  <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded">
                    <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Enrollment</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {enrollment.program?.name || '—'}
                        </p>
                      </div>
                      <FieldRow label="Status">
                        <span
                          className={`text-xs font-bold uppercase ${
                            enrollment.onboarding_completed ? 'text-green-400' : 'text-[#FFDE59]'
                          }`}
                        >
                          {enrollment.onboarding_completed ? 'Active' : 'Pending Onboarding'}
                        </span>
                      </FieldRow>
                      <FieldRow label="Enrolled">
                        <span className="text-[#999] text-xs">{formatDate(enrollment.enrolled_at)}</span>
                      </FieldRow>
                      <FieldRow label="Sales Calls">
                        <span className="text-[#999] text-xs">
                          {enrollment.leads_sales_calls ? 'Yes' : 'No'}
                        </span>
                      </FieldRow>
                    </div>
                  </div>
                )}

                {/* Documents Card */}
                {documents.length > 0 && (
                  <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded mt-4">
                    <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Documents</h3>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-start justify-between gap-2 py-1 border-b border-[#222]">
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-xs truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-bold uppercase px-1 py-0.5 bg-[#111] border border-[#333] text-[#666]">
                                {doc.category}
                              </span>
                              <span className="text-[10px] text-[#666]">{formatDate(doc.created_at)}</span>
                            </div>
                          </div>
                          {(doc.file_url || doc.external_url) && (
                            <a
                              href={doc.file_url || doc.external_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase font-bold border border-[#333] px-2 py-0.5 text-[#999] hover:text-[#00D4FF] hover:border-[#00D4FF] transition-colors shrink-0"
                            >
                              View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friday Streak */}
                <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded mt-4">
                  <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">5-Minute Friday</h3>
                  <p className="text-white text-sm">{fridayCount} submissions</p>
                </div>
              </>
            ) : (
              <>
                {/* Subscription Card */}
                {subscriptions.length > 0 && (
                  <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded">
                    <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Subscription</h3>
                    {subscriptions.map((sub, i) => (
                      <div key={i} className="space-y-1">
                        <FieldRow label="Plan">
                          <span className="text-white text-xs">{sub.plan_type}</span>
                        </FieldRow>
                        <FieldRow label="Status">
                          <span
                            className={`text-xs font-bold uppercase ${
                              sub.status === 'active' ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </FieldRow>
                        {sub.current_period_start && (
                          <FieldRow label="Period Start">
                            <span className="text-[#666] text-xs">{formatDate(sub.current_period_start)}</span>
                          </FieldRow>
                        )}
                        {sub.current_period_end && (
                          <FieldRow label="Period End">
                            <span className="text-[#666] text-xs">{formatDate(sub.current_period_end)}</span>
                          </FieldRow>
                        )}
                        {sub.canceled_at && (
                          <FieldRow label="Canceled">
                            <span className="text-red-400 text-xs">{formatDate(sub.canceled_at)}</span>
                          </FieldRow>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Assessment Snapshot */}
                {firstAssessment && (
                  <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded mt-4">
                    <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Assessment</h3>
                    <p className="text-white text-sm truncate">{firstAssessment.label}</p>
                    {firstAssessment.score != null && (
                      <p className="text-[#FFDE59] text-2xl font-mono font-bold mt-1">
                        {firstAssessment.score}
                      </p>
                    )}
                  </div>
                )}

                {/* Quick Stats */}
                <div className="bg-[#1A1A1A] border border-[#333] p-5 rounded mt-4">
                  <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">Quick Stats</h3>
                  <FieldRow label="Total Reports">
                    <span className="text-white text-sm">
                      {activity.filter((a) => a.url).length}
                    </span>
                  </FieldRow>
                  <FieldRow label="Member Since">
                    <span className="text-[#999] text-xs">{formatDate(user.created_at)}</span>
                  </FieldRow>
                </div>
              </>
            )}

            {/* Back link at bottom of right column */}
            <div className="mt-6">
              <a
                href="/admin/users"
                className="text-[10px] uppercase font-bold border border-[#333] px-3 py-1.5 text-[#999] hover:text-[#00D4FF] hover:border-[#00D4FF] transition-colors block text-center"
              >
                ← Back to Users
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
