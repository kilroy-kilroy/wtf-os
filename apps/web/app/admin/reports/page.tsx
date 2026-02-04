'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

interface AgencyData {
  id: string;
  name: string;
  url: string | null;
  users: Array<{ id: string; name: string; email: string; role: string }>;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  agencies: Array<{ id: string; name: string; role: string }>;
  reportCounts: {
    callLabLite: number;
    callLabPro: number;
    discoveryLite: number;
    discoveryPro: number;
    assessments: number;
  };
}

interface CallLabReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  agencyName: string | null;
  buyerName: string | null;
  companyName: string | null;
  overallScore: number | null;
  tier: string;
  callType: string | null;
  createdAt: string;
}

interface DiscoveryReport {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  agencyName: string | null;
  targetCompany: string;
  contactName: string | null;
  contactTitle: string | null;
  version: string;
  createdAt: string;
}

interface AssessmentReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  agencyName: string | null;
  founderName: string | null;
  assessmentType: string;
  overallScore: number | null;
  createdAt: string;
}

interface ReportsData {
  agencies: AgencyData[];
  users: UserData[];
  reports: {
    callLab: CallLabReport[];
    discovery: DiscoveryReport[];
    assessments: AssessmentReport[];
  };
}

type TabType = 'agency' | 'user' | 'product';
type ProductFilter = 'all' | 'callLabLite' | 'callLabPro' | 'discoveryLite' | 'discoveryPro' | 'assessments';

const PRODUCT_LABELS: Record<string, string> = {
  callLabLite: 'Call Lab',
  callLabPro: 'Call Lab Pro',
  discoveryLite: 'Discovery Lab',
  discoveryPro: 'Discovery Lab Pro',
  assessments: 'WTF Assessment',
};

const PRODUCT_COLORS: Record<string, string> = {
  callLabLite: '#00D4FF',
  callLabPro: '#E51B23',
  discoveryLite: '#00D4FF',
  discoveryPro: '#E51B23',
  assessments: '#f59e0b',
};

// ============================================
// UTILITIES
// ============================================

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

function formatScore(score: number | null, max: number = 10): string {
  if (score == null) return '-';
  return `${Number(score).toFixed(1)}/${max}`;
}

function scoreColor(score: number | null, max: number = 10): string {
  if (score == null) return '#666';
  const pct = score / max;
  if (pct >= 0.8) return '#22c55e';
  if (pct >= 0.6) return '#FFDE59';
  return '#E51B23';
}

function totalReports(counts: UserData['reportCounts']): number {
  return counts.callLabLite + counts.callLabPro + counts.discoveryLite + counts.discoveryPro + counts.assessments;
}

// ============================================
// SMALL COMPONENTS
// ============================================

function ProductPill({ product, count, onClick }: { product: string; count: number; onClick?: () => void }) {
  if (count === 0) return null;
  const color = PRODUCT_COLORS[product] || '#666';
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {PRODUCT_LABELS[product]}
      <span className="bg-white/10 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
    </button>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-4">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function ReportLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#00D4FF] hover:underline text-xs"
    >
      {children}
    </a>
  );
}

// ============================================
// AGENCY VIEW
// ============================================

function AgencyView({
  data,
  search,
  onNavigateToUser,
  onNavigateToProduct,
}: {
  data: ReportsData;
  search: string;
  onNavigateToUser: (userId: string) => void;
  onNavigateToProduct: (product: ProductFilter, userId?: string) => void;
}) {
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleAgency = (id: string) => {
    setExpandedAgencies((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleUser = (key: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Build agency data with report counts
  const agenciesWithCounts = useMemo(() => {
    const userCountsMap = new Map<string, UserData['reportCounts']>();
    for (const u of data.users) {
      userCountsMap.set(u.id, u.reportCounts);
    }

    return data.agencies
      .map((agency) => {
        const usersWithCounts = agency.users.map((u) => ({
          ...u,
          reportCounts: userCountsMap.get(u.id) || {
            callLabLite: 0, callLabPro: 0, discoveryLite: 0, discoveryPro: 0, assessments: 0,
          },
        }));
        const agencyReportCount = usersWithCounts.reduce((sum, u) => sum + totalReports(u.reportCounts), 0);
        return { ...agency, usersWithCounts, reportCount: agencyReportCount };
      })
      .filter((a) => a.users.length > 0 || a.reportCount > 0);
  }, [data]);

  // Unassigned users (have reports but no agency)
  const unassignedUsers = useMemo(() => {
    const assignedUserIds = new Set(data.agencies.flatMap((a) => a.users.map((u) => u.id)));
    return data.users.filter((u) => !assignedUserIds.has(u.id) && totalReports(u.reportCounts) > 0);
  }, [data]);

  const lowerSearch = search.toLowerCase();
  const filteredAgencies = agenciesWithCounts.filter((a) =>
    !search || a.name.toLowerCase().includes(lowerSearch) ||
    a.usersWithCounts.some((u) =>
      u.name.toLowerCase().includes(lowerSearch) || u.email.toLowerCase().includes(lowerSearch)
    )
  );

  const filteredUnassigned = unassignedUsers.filter((u) =>
    !search || u.name.toLowerCase().includes(lowerSearch) || u.email.toLowerCase().includes(lowerSearch)
  );

  const getUserReportsForProduct = (userId: string, product: string) => {
    if (product === 'callLabLite') return data.reports.callLab.filter((r) => r.userId === userId && r.tier !== 'pro');
    if (product === 'callLabPro') return data.reports.callLab.filter((r) => r.userId === userId && r.tier === 'pro');
    if (product === 'discoveryLite') return data.reports.discovery.filter((r) => r.userId === userId && r.version !== 'pro');
    if (product === 'discoveryPro') return data.reports.discovery.filter((r) => r.userId === userId && r.version === 'pro');
    if (product === 'assessments') return data.reports.assessments.filter((r) => r.userId === userId);
    return [];
  };

  const renderUserRow = (
    user: { id: string; name: string; email: string; role: string; reportCounts: UserData['reportCounts'] },
    agencyId: string
  ) => {
    const key = `${agencyId}-${user.id}`;
    const isExpanded = expandedUsers.has(key);
    const reports = totalReports(user.reportCounts);

    return (
      <div key={key} className="border-b border-slate-700/30 last:border-0">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/30"
          onClick={() => toggleUser(key)}
        >
          {reports > 0 && <ChevronIcon expanded={isExpanded} />}
          {reports === 0 && <div className="w-4" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onNavigateToUser(user.id); }}
                className="text-sm text-white font-medium hover:text-[#00D4FF] transition-colors truncate"
              >
                {user.name}
              </button>
              <span className="text-xs text-slate-600">{user.email}</span>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider bg-slate-800 px-1.5 py-0.5 rounded">{user.role}</span>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {Object.entries(user.reportCounts).map(([product, count]) => (
              <ProductPill
                key={product}
                product={product}
                count={count}
                onClick={() => onNavigateToProduct(product as ProductFilter, user.id)}
              />
            ))}
          </div>
        </div>

        {isExpanded && reports > 0 && (
          <div className="pl-11 pr-4 pb-3 space-y-2">
            {Object.entries(user.reportCounts).map(([product, count]) => {
              if (count === 0) return null;
              const reports = getUserReportsForProduct(user.id, product);
              return (
                <div key={product} className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs font-medium mb-2" style={{ color: PRODUCT_COLORS[product] }}>
                    {PRODUCT_LABELS[product]} ({count})
                  </p>
                  <div className="space-y-1">
                    {reports.slice(0, 10).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 text-xs text-slate-400">
                        {'overallScore' in r && (
                          <span className="font-mono w-12" style={{ color: scoreColor(r.overallScore, r.assessmentType ? 5 : 10) }}>
                            {formatScore(r.overallScore, r.assessmentType ? 5 : 10)}
                          </span>
                        )}
                        <span className="text-slate-300 truncate flex-1">
                          {r.buyerName || r.targetCompany || r.founderName || r.companyName || '-'}
                          {r.companyName && r.buyerName ? ` @ ${r.companyName}` : ''}
                        </span>
                        <span className="text-slate-600 shrink-0">{formatTimeAgo(r.createdAt)}</span>
                        {product.startsWith('discovery') && (
                          <ReportLink href={`/discovery-lab/report/${r.id}`}>View</ReportLink>
                        )}
                      </div>
                    ))}
                    {reports.length > 10 && (
                      <p className="text-slate-600 text-xs">+ {reports.length - 10} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {filteredAgencies.length === 0 && filteredUnassigned.length === 0 && (
        <EmptyState message={search ? 'No agencies match your search' : 'No agencies with users found'} />
      )}

      {filteredAgencies.map((agency) => (
        <div key={agency.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl mb-3 overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-700/30"
            onClick={() => toggleAgency(agency.id)}
          >
            <ChevronIcon expanded={expandedAgencies.has(agency.id)} />
            <div className="flex-1">
              <span className="text-white font-semibold">{agency.name}</span>
              {agency.url && <span className="text-slate-600 text-xs ml-2">{agency.url}</span>}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                <span className="text-white font-medium">{agency.users.length}</span> users
              </span>
              <span className="text-slate-500">
                <span className="text-white font-medium">{agency.reportCount}</span> reports
              </span>
            </div>
          </div>

          {expandedAgencies.has(agency.id) && (
            <div className="border-t border-slate-700/30">
              {agency.usersWithCounts.length === 0 ? (
                <p className="text-sm text-slate-500 px-4 py-3">No users</p>
              ) : (
                agency.usersWithCounts.map((user) => renderUserRow(user, agency.id))
              )}
            </div>
          )}
        </div>
      ))}

      {filteredUnassigned.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl mb-3 overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-700/30"
            onClick={() => toggleAgency('__unassigned__')}
          >
            <ChevronIcon expanded={expandedAgencies.has('__unassigned__')} />
            <div className="flex-1">
              <span className="text-slate-400 font-semibold italic">No Agency Assigned</span>
            </div>
            <span className="text-xs text-slate-500">
              <span className="text-white font-medium">{filteredUnassigned.length}</span> users
            </span>
          </div>

          {expandedAgencies.has('__unassigned__') && (
            <div className="border-t border-slate-700/30">
              {filteredUnassigned.map((u) =>
                renderUserRow(
                  { ...u, name: u.name, email: u.email, role: '-', reportCounts: u.reportCounts },
                  '__unassigned__'
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// USER VIEW
// ============================================

function UserView({
  data,
  search,
  highlightUserId,
  onNavigateToProduct,
}: {
  data: ReportsData;
  search: string;
  highlightUserId: string | null;
  onNavigateToProduct: (product: ProductFilter, userId?: string) => void;
}) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(() => {
    return highlightUserId ? new Set([highlightUserId]) : new Set();
  });

  useEffect(() => {
    if (highlightUserId) {
      setExpandedUsers(new Set([highlightUserId]));
      // Scroll to the user after a brief delay
      setTimeout(() => {
        document.getElementById(`user-${highlightUserId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [highlightUserId]);

  const toggleUser = (id: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const lowerSearch = search.toLowerCase();
  const filteredUsers = data.users.filter((u) =>
    !search ||
    u.name.toLowerCase().includes(lowerSearch) ||
    u.email.toLowerCase().includes(lowerSearch) ||
    u.agencies.some((a) => a.name.toLowerCase().includes(lowerSearch))
  );

  const getUserReports = (userId: string) => {
    return {
      callLabLite: data.reports.callLab.filter((r) => r.userId === userId && r.tier !== 'pro'),
      callLabPro: data.reports.callLab.filter((r) => r.userId === userId && r.tier === 'pro'),
      discoveryLite: data.reports.discovery.filter((r) => r.userId === userId && r.version !== 'pro'),
      discoveryPro: data.reports.discovery.filter((r) => r.userId === userId && r.version === 'pro'),
      assessments: data.reports.assessments.filter((r) => r.userId === userId),
    };
  };

  const renderReport = (r: any, product: string) => {
    const isAssessment = product === 'assessments';
    const isDiscovery = product.startsWith('discovery');
    const maxScore = isAssessment ? 5 : 10;

    return (
      <div key={r.id} className="flex items-center gap-3 text-xs text-slate-400 py-1.5 border-b border-slate-800/50 last:border-0">
        {'overallScore' in r && (
          <span className="font-mono w-14 shrink-0" style={{ color: scoreColor(r.overallScore, maxScore) }}>
            {formatScore(r.overallScore, maxScore)}
          </span>
        )}
        <span className="text-slate-300 truncate flex-1">
          {r.buyerName || r.targetCompany || r.founderName || '-'}
          {r.companyName && r.buyerName ? <span className="text-slate-500"> @ {r.companyName}</span> : null}
          {r.contactName ? <span className="text-slate-500"> ({r.contactName})</span> : null}
        </span>
        {r.callType && (
          <span className="text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0">{r.callType}</span>
        )}
        <span className="text-slate-600 shrink-0 w-20 text-right">{formatTimeAgo(r.createdAt)}</span>
        {isDiscovery && <ReportLink href={`/discovery-lab/report/${r.id}`}>View</ReportLink>}
      </div>
    );
  };

  return (
    <div>
      {filteredUsers.length === 0 && (
        <EmptyState message={search ? 'No users match your search' : 'No users with reports found'} />
      )}

      {filteredUsers.map((user) => {
        const isExpanded = expandedUsers.has(user.id);
        const reports = getUserReports(user.id);
        const total = totalReports(user.reportCounts);
        const isHighlighted = user.id === highlightUserId;

        return (
          <div
            key={user.id}
            id={`user-${user.id}`}
            className={`bg-slate-800/50 border rounded-xl mb-3 overflow-hidden transition-colors ${
              isHighlighted ? 'border-[#00D4FF]/50' : 'border-slate-700/50'
            }`}
          >
            <div
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-700/30"
              onClick={() => toggleUser(user.id)}
            >
              <ChevronIcon expanded={isExpanded} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold truncate">{user.name}</span>
                  <span className="text-slate-600 text-xs truncate">{user.email}</span>
                </div>
                {user.agencies.length > 0 && (
                  <div className="flex gap-1.5 mt-1">
                    {user.agencies.map((a) => (
                      <span key={a.id} className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                        {a.name} ({a.role})
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {Object.entries(user.reportCounts).map(([product, count]) => (
                  <ProductPill key={product} product={product} count={count} />
                ))}
              </div>
              <div className="text-xs text-slate-500 shrink-0 ml-2">
                <span className="text-white font-medium">{total}</span> total
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-700/30 px-4 py-3 space-y-3">
                {Object.entries(reports).map(([product, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={product}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PRODUCT_COLORS[product] }}>
                          {PRODUCT_LABELS[product]}
                        </span>
                        <span className="text-[10px] text-slate-600">{items.length} reports</span>
                        <button
                          onClick={() => onNavigateToProduct(product as ProductFilter, user.id)}
                          className="text-[10px] text-[#00D4FF] hover:underline ml-auto"
                        >
                          View all in Product tab
                        </button>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg px-3 py-1">
                        {items.slice(0, 10).map((r: any) => renderReport(r, product))}
                        {items.length > 10 && (
                          <p className="text-slate-600 text-xs py-1.5">+ {items.length - 10} more reports</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {total === 0 && <p className="text-sm text-slate-500">No reports generated yet</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// PRODUCT VIEW
// ============================================

function ProductView({
  data,
  selectedProduct,
  onProductChange,
  filterUserId,
}: {
  data: ReportsData;
  selectedProduct: ProductFilter;
  onProductChange: (p: ProductFilter) => void;
  filterUserId: string | null;
}) {
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => (
    <th
      className={`text-left text-xs text-slate-500 pb-2 pr-4 font-medium cursor-pointer hover:text-slate-300 select-none ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        <span className="ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>
      )}
    </th>
  );

  // Filter user name for display
  const filterUserName = filterUserId
    ? data.users.find((u) => u.id === filterUserId)?.name || null
    : null;

  const sortReports = useCallback(<T extends Record<string, any>>(reports: T[]): T[] => {
    return [...reports].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortAsc ? cmp : -cmp;
    });
  }, [sortField, sortAsc]);

  const applyUserFilter = useCallback(<T extends { userId: string | null }>(reports: T[]): T[] => {
    if (!filterUserId) return reports;
    return reports.filter((r) => r.userId === filterUserId);
  }, [filterUserId]);

  const productTabs: Array<{ key: ProductFilter; label: string }> = [
    { key: 'all', label: 'All Products' },
    { key: 'callLabPro', label: 'Call Lab Pro' },
    { key: 'callLabLite', label: 'Call Lab' },
    { key: 'discoveryPro', label: 'Discovery Pro' },
    { key: 'discoveryLite', label: 'Discovery Lab' },
    { key: 'assessments', label: 'WTF Assessment' },
  ];

  const showCallLab = selectedProduct === 'all' || selectedProduct === 'callLabLite' || selectedProduct === 'callLabPro';
  const showDiscovery = selectedProduct === 'all' || selectedProduct === 'discoveryLite' || selectedProduct === 'discoveryPro';
  const showAssessments = selectedProduct === 'all' || selectedProduct === 'assessments';

  const callLabReports = useMemo(() => {
    let reports = data.reports.callLab;
    if (selectedProduct === 'callLabLite') reports = reports.filter((r) => r.tier !== 'pro');
    if (selectedProduct === 'callLabPro') reports = reports.filter((r) => r.tier === 'pro');
    return sortReports(applyUserFilter(reports));
  }, [data.reports.callLab, selectedProduct, sortReports, applyUserFilter]);

  const discoveryReports = useMemo(() => {
    let reports = data.reports.discovery;
    if (selectedProduct === 'discoveryLite') reports = reports.filter((r) => r.version !== 'pro');
    if (selectedProduct === 'discoveryPro') reports = reports.filter((r) => r.version === 'pro');
    return sortReports(applyUserFilter(reports));
  }, [data.reports.discovery, selectedProduct, sortReports, applyUserFilter]);

  const assessmentReports = useMemo(() => {
    return sortReports(applyUserFilter(data.reports.assessments));
  }, [data.reports.assessments, sortReports, applyUserFilter]);

  return (
    <div>
      {/* Product selector tabs */}
      <div className="flex gap-1 mb-4 bg-slate-800/50 rounded-xl p-1 flex-wrap">
        {productTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onProductChange(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedProduct === tab.key
                ? 'bg-[#00D4FF] text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active filter indicator */}
      {filterUserId && filterUserName && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg">
          <span className="text-xs text-[#00D4FF]">Filtered to:</span>
          <span className="text-xs text-white font-medium">{filterUserName}</span>
        </div>
      )}

      {/* Call Lab table */}
      {showCallLab && callLabReports.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-white mb-3">
            Call Lab Reports
            <span className="text-slate-500 font-normal ml-2">({callLabReports.length})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600/50">
                  <SortHeader field="overallScore">Score</SortHeader>
                  <SortHeader field="buyerName">Buyer</SortHeader>
                  <SortHeader field="companyName">Company</SortHeader>
                  <SortHeader field="userName">User</SortHeader>
                  <SortHeader field="agencyName">Agency</SortHeader>
                  <th className="text-left text-xs text-slate-500 pb-2 pr-4 font-medium">Tier</th>
                  <SortHeader field="createdAt">Date</SortHeader>
                </tr>
              </thead>
              <tbody>
                {callLabReports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-700/30">
                    <td className="py-2 pr-4">
                      <span className="font-mono text-xs" style={{ color: scoreColor(r.overallScore) }}>
                        {formatScore(r.overallScore)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-300 text-xs">{r.buyerName || '-'}</td>
                    <td className="py-2 pr-4 text-slate-300 text-xs">{r.companyName || '-'}</td>
                    <td className="py-2 pr-4 text-xs">
                      <span className="text-white">{r.userName}</span>
                      <span className="text-slate-600 ml-1 text-[10px]">{r.userEmail}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{r.agencyName || '-'}</td>
                    <td className="py-2 pr-4">
                      <span
                        className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded"
                        style={{
                          color: r.tier === 'pro' ? '#E51B23' : '#00D4FF',
                          backgroundColor: r.tier === 'pro' ? '#E51B2320' : '#00D4FF20',
                        }}
                      >
                        {r.tier}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 text-xs">{formatTimeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discovery table */}
      {showDiscovery && discoveryReports.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-white mb-3">
            Discovery Lab Reports
            <span className="text-slate-500 font-normal ml-2">({discoveryReports.length})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600/50">
                  <SortHeader field="targetCompany">Target Company</SortHeader>
                  <SortHeader field="contactName">Contact</SortHeader>
                  <SortHeader field="userName">User</SortHeader>
                  <SortHeader field="agencyName">Agency</SortHeader>
                  <th className="text-left text-xs text-slate-500 pb-2 pr-4 font-medium">Ver</th>
                  <SortHeader field="createdAt">Date</SortHeader>
                  <th className="text-left text-xs text-slate-500 pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {discoveryReports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-700/30">
                    <td className="py-2 pr-4 text-white text-xs font-medium">{r.targetCompany || '-'}</td>
                    <td className="py-2 pr-4 text-xs">
                      <span className="text-slate-300">{r.contactName || '-'}</span>
                      {r.contactTitle && <span className="text-slate-600 ml-1 text-[10px]">{r.contactTitle}</span>}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <span className="text-white">{r.userName}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{r.agencyName || '-'}</td>
                    <td className="py-2 pr-4">
                      <span
                        className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded"
                        style={{
                          color: r.version === 'pro' ? '#E51B23' : '#00D4FF',
                          backgroundColor: r.version === 'pro' ? '#E51B2320' : '#00D4FF20',
                        }}
                      >
                        {r.version}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{formatTimeAgo(r.createdAt)}</td>
                    <td className="py-2">
                      <ReportLink href={`/discovery-lab/report/${r.id}`}>View</ReportLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assessments table */}
      {showAssessments && assessmentReports.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-white mb-3">
            WTF Assessments
            <span className="text-slate-500 font-normal ml-2">({assessmentReports.length})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600/50">
                  <SortHeader field="overallScore">Score</SortHeader>
                  <SortHeader field="agencyName">Agency</SortHeader>
                  <SortHeader field="founderName">Founder</SortHeader>
                  <SortHeader field="userName">User</SortHeader>
                  <th className="text-left text-xs text-slate-500 pb-2 pr-4 font-medium">Type</th>
                  <SortHeader field="createdAt">Date</SortHeader>
                </tr>
              </thead>
              <tbody>
                {assessmentReports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-700/30">
                    <td className="py-2 pr-4">
                      <span className="font-mono text-xs" style={{ color: scoreColor(r.overallScore, 5) }}>
                        {formatScore(r.overallScore, 5)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-white text-xs font-medium">{r.agencyName || '-'}</td>
                    <td className="py-2 pr-4 text-slate-300 text-xs">{r.founderName || '-'}</td>
                    <td className="py-2 pr-4 text-xs">
                      <span className="text-white">{r.userName}</span>
                      <span className="text-slate-600 ml-1 text-[10px]">{r.userEmail}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-[10px] text-[#f59e0b] font-medium uppercase bg-[#f59e0b20] px-1.5 py-0.5 rounded">
                        {r.assessmentType}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 text-xs">{formatTimeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty states */}
      {showCallLab && callLabReports.length === 0 && selectedProduct !== 'all' && (
        <EmptyState message="No Call Lab reports found" />
      )}
      {showDiscovery && discoveryReports.length === 0 && selectedProduct !== 'all' && (
        <EmptyState message="No Discovery Lab reports found" />
      )}
      {showAssessments && assessmentReports.length === 0 && selectedProduct !== 'all' && (
        <EmptyState message="No assessments found" />
      )}
    </div>
  );
}

// ============================================
// AUTH GATE
// ============================================

function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-4">Admin Reports</h1>
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

export default function AdminReportsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('agency');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductFilter>('all');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [highlightUserId, setHighlightUserId] = useState<string | null>(null);

  // Persist key in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const fetchData = useCallback(async (key: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/client-reports', {
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

  // Cross-tab navigation handlers
  const navigateToUser = (userId: string) => {
    setActiveTab('user');
    setHighlightUserId(userId);
    setSearch('');
  };

  const navigateToProduct = (product: ProductFilter, userId?: string) => {
    setActiveTab('product');
    setSelectedProduct(product);
    setFilterUserId(userId || null);
    setSearch('');
  };

  // Clear cross-tab filters when manually switching tabs
  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearch('');
    if (tab !== 'user') setHighlightUserId(null);
    if (tab !== 'product') {
      setFilterUserId(null);
      setSelectedProduct('all');
    }
  };

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
          <button onClick={() => fetchData(apiKey)} className="text-[#00D4FF] text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Summary stats
  const totalAgencies = data.agencies.filter((a) => a.users.length > 0).length;
  const totalUsers = data.users.length;
  const totalCallLab = data.reports.callLab.length;
  const totalDiscovery = data.reports.discovery.length;
  const totalAssessments = data.reports.assessments.length;
  const totalAllReports = totalCallLab + totalDiscovery + totalAssessments;

  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'agency', label: 'By Agency' },
    { key: 'user', label: 'By User' },
    { key: 'product', label: 'By Product' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 hover:text-[#00D4FF] text-sm transition-colors">
              Dashboard
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-2xl font-bold text-white">Client Reports</h1>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span><span className="text-white font-medium">{totalAgencies}</span> agencies</span>
            <span><span className="text-white font-medium">{totalUsers}</span> users</span>
            <span><span className="text-white font-medium">{totalAllReports}</span> reports</span>
            <span className="text-slate-700">|</span>
            <span style={{ color: '#E51B23' }}>{data.reports.callLab.filter((r) => r.tier === 'pro').length} Call Lab Pro</span>
            <span style={{ color: '#00D4FF' }}>{data.reports.callLab.filter((r) => r.tier !== 'pro').length} Call Lab</span>
            <span style={{ color: '#E51B23' }}>{data.reports.discovery.filter((r) => r.version === 'pro').length} Disc Pro</span>
            <span style={{ color: '#00D4FF' }}>{data.reports.discovery.filter((r) => r.version !== 'pro').length} Disc</span>
            <span style={{ color: '#f59e0b' }}>{totalAssessments} Assessment</span>
          </div>
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
      <div className="flex gap-1 mb-4 bg-slate-800/50 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-[#00D4FF] text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search (for Agency and User tabs) */}
      {activeTab !== 'product' && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={
            activeTab === 'agency'
              ? 'Search agencies, users...'
              : 'Search users, emails, agencies...'
          }
        />
      )}

      {/* Tab content */}
      {activeTab === 'agency' && (
        <AgencyView
          data={data}
          search={search}
          onNavigateToUser={navigateToUser}
          onNavigateToProduct={navigateToProduct}
        />
      )}

      {activeTab === 'user' && (
        <UserView
          data={data}
          search={search}
          highlightUserId={highlightUserId}
          onNavigateToProduct={navigateToProduct}
        />
      )}

      {activeTab === 'product' && (
        <ProductView
          data={data}
          selectedProduct={selectedProduct}
          onProductChange={setSelectedProduct}
          filterUserId={filterUserId}
        />
      )}
    </div>
  );
}
