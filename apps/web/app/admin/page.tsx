'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

interface TimeBucket {
  day: number;
  week: number;
  month: number;
  allTime: number;
}

interface ProductMetrics {
  reports: TimeBucket;
  users: Partial<TimeBucket>;
}

interface DashboardData {
  generatedAt: string;
  free: {
    callLabInstant: ProductMetrics;
    callLab: ProductMetrics;
    discoveryLab: ProductMetrics;
  };
  pro: {
    callLabPro: ProductMetrics;
    discoveryLabPro: ProductMetrics;
    subscriptions: { solo: number; team: number; total: number };
  };
  assessments: ProductMetrics;
  conversion: {
    instantLeads: { total: number; converted: number };
    conversionRate: number;
  };
  users: { total: number; day: number; week: number; month: number };
  recentReports: {
    callLab: Array<{ id: string; buyerName: string; companyName: string; score: number; tier: string; createdAt: string }>;
    discovery: Array<{ id: string; targetCompany: string; contactName: string; contactTitle: string; version: string; createdAt: string }>;
    assessments: Array<{ id: string; agencyName: string; founderName: string; score: number; createdAt: string }>;
  };
}

// ============================================
// COMPONENTS
// ============================================

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function TimeBucketRow({ label, data, color }: { label: string; data: TimeBucket; color?: string }) {
  return (
    <tr className="border-b border-slate-700/30">
      <td className="py-3 pr-4 text-sm font-medium" style={{ color: color || '#fff' }}>{label}</td>
      <td className="py-3 px-4 text-sm text-right text-slate-300">{data.day}</td>
      <td className="py-3 px-4 text-sm text-right text-slate-300">{data.week}</td>
      <td className="py-3 px-4 text-sm text-right text-slate-300">{data.month}</td>
      <td className="py-3 pl-4 text-sm text-right text-white font-semibold">{data.allTime.toLocaleString()}</td>
    </tr>
  );
}

function ProductTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    label: string;
    reports: TimeBucket;
    users: Partial<TimeBucket>;
    color?: string;
  }>;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>

      {/* Reports table */}
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Reports Generated</p>
      <table className="w-full mb-5">
        <thead>
          <tr className="border-b border-slate-600/50">
            <th className="text-left text-xs text-slate-500 pb-2 pr-4 font-medium">Product</th>
            <th className="text-right text-xs text-slate-500 pb-2 px-4 font-medium">24h</th>
            <th className="text-right text-xs text-slate-500 pb-2 px-4 font-medium">7d</th>
            <th className="text-right text-xs text-slate-500 pb-2 px-4 font-medium">30d</th>
            <th className="text-right text-xs text-slate-500 pb-2 pl-4 font-medium">All Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TimeBucketRow key={row.label} label={row.label} data={row.reports} color={row.color} />
          ))}
        </tbody>
      </table>

      {/* Users summary */}
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Unique Users</p>
      <div className="grid grid-cols-3 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">{row.label}</p>
            <p className="text-lg font-bold text-white">{(row.users.allTime || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Record<string, any>>;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600/50">
                {columns.map((col) => (
                  <th key={col} className="text-left text-xs text-slate-500 pb-2 pr-4 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {columns.map((col) => (
                    <td key={col} className="py-2.5 pr-4 text-slate-300">
                      {col === 'When' ? formatTimeAgo(row[col]) : row[col] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ============================================
// AUTH GATE
// ============================================

function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-4">Admin Dashboard</h1>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && key && onAuth(key)}
          placeholder="API Key"
          className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none text-sm mb-4"
          autoFocus
        />
        <button
          onClick={() => key && onAuth(key)}
          className="w-full py-3 rounded-xl bg-[#00D4FF] text-slate-900 font-bold text-sm"
        >
          Enter
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function AdminDashboardPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');

  // Persist key in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const fetchData = useCallback(async (key: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status === 401) {
        setError('Invalid API key');
        setApiKey(null);
        sessionStorage.removeItem('admin_api_key');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      sessionStorage.setItem('admin_api_key', apiKey);
      fetchData(apiKey);
    }
  }, [apiKey, fetchData]);

  if (!apiKey) {
    return <AuthGate onAuth={setApiKey} />;
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-[#00D4FF] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => fetchData(apiKey)} className="text-[#00D4FF] text-sm font-medium">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const d = data;

  // Totals row for free tier
  const freeTotal: TimeBucket = {
    day: d.free.callLabInstant.reports.day + d.free.callLab.reports.day + d.free.discoveryLab.reports.day,
    week: d.free.callLabInstant.reports.week + d.free.callLab.reports.week + d.free.discoveryLab.reports.week,
    month: d.free.callLabInstant.reports.month + d.free.callLab.reports.month + d.free.discoveryLab.reports.month,
    allTime: d.free.callLabInstant.reports.allTime + d.free.callLab.reports.allTime + d.free.discoveryLab.reports.allTime,
  };

  const proTotal: TimeBucket = {
    day: d.pro.callLabPro.reports.day + d.pro.discoveryLabPro.reports.day,
    week: d.pro.callLabPro.reports.week + d.pro.discoveryLabPro.reports.week,
    month: d.pro.callLabPro.reports.month + d.pro.discoveryLabPro.reports.month,
    allTime: d.pro.callLabPro.reports.allTime + d.pro.discoveryLabPro.reports.allTime,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">WTF Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Last updated: {new Date(d.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(apiKey)}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('admin_api_key'); setApiKey(null); }}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-500 text-sm hover:text-slate-300"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview' ? 'bg-[#00D4FF] text-slate-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'reports' ? 'bg-[#00D4FF] text-slate-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          Recent Reports
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Top-level KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Users" value={d.users.total} sub={`+${d.users.month} this month`} />
            <StatCard label="Reports (30d)" value={freeTotal.month + proTotal.month + d.assessments.reports.month} />
            <StatCard label="Active Subscriptions" value={d.pro.subscriptions.total} sub={`${d.pro.subscriptions.solo} solo, ${d.pro.subscriptions.team} team`} />
            <StatCard label="Conversion Rate" value={`${d.conversion.conversionRate}%`} sub={`${d.conversion.instantLeads.converted} / ${d.conversion.instantLeads.total} leads`} />
          </div>

          {/* New users row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="New Users (24h)" value={d.users.day} />
            <StatCard label="New Users (7d)" value={d.users.week} />
            <StatCard label="New Users (30d)" value={d.users.month} />
          </div>

          {/* Section 1: Free tier products */}
          <ProductTable
            title="Free Tier Products"
            rows={[
              { label: 'Call Lab Instant', reports: d.free.callLabInstant.reports, users: d.free.callLabInstant.users, color: '#00D4FF' },
              { label: 'Call Lab', reports: d.free.callLab.reports, users: d.free.callLab.users, color: '#00D4FF' },
              { label: 'Discovery Lab', reports: d.free.discoveryLab.reports, users: d.free.discoveryLab.users, color: '#00D4FF' },
            ]}
          />

          {/* Section 2: Pro tier products */}
          <ProductTable
            title="Pro Tier Products"
            rows={[
              { label: 'Call Lab Pro', reports: d.pro.callLabPro.reports, users: d.pro.callLabPro.users, color: '#E31B23' },
              { label: 'Discovery Lab Pro', reports: d.pro.discoveryLabPro.reports, users: d.pro.discoveryLabPro.users, color: '#E31B23' },
            ]}
          />

          {/* Section 3: Assessments */}
          <ProductTable
            title="WTF Assessments"
            rows={[
              { label: 'Agency Assessment', reports: d.assessments.reports, users: d.assessments.users, color: '#f59e0b' },
            ]}
          />

          {/* Section 4: Conversion funnel */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">Conversion Funnel</h2>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Instant Leads Captured" value={d.conversion.instantLeads.total} />
              <StatCard label="Upgraded to Pro" value={d.conversion.instantLeads.converted} />
              <StatCard label="Conversion Rate" value={`${d.conversion.conversionRate}%`} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Recent Reports tab */}
          <RecentTable
            title="Recent Call Lab Reports"
            columns={['Buyer', 'Company', 'Score', 'Tier', 'When']}
            rows={d.recentReports.callLab.map((r) => ({
              Buyer: r.buyerName || '-',
              Company: r.companyName || '-',
              Score: r.score != null ? `${r.score}/100` : '-',
              Tier: r.tier,
              When: r.createdAt,
            }))}
          />

          <RecentTable
            title="Recent Discovery Briefs"
            columns={['Company', 'Contact', 'Title', 'Version', 'When']}
            rows={d.recentReports.discovery.map((r) => ({
              Company: r.targetCompany || '-',
              Contact: r.contactName || '-',
              Title: r.contactTitle || '-',
              Version: r.version,
              When: r.createdAt,
            }))}
          />

          <RecentTable
            title="Recent Assessments"
            columns={['Agency', 'Founder', 'Score', 'When']}
            rows={d.recentReports.assessments.map((r) => ({
              Agency: r.agencyName || '-',
              Founder: r.founderName || '-',
              Score: r.score != null ? `${r.score}/5` : '-',
              When: r.createdAt,
            }))}
          />
        </>
      )}
    </div>
  );
}
