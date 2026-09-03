// apps/web/app/admin/call-vault/page.tsx
//
// Contributor list for the Call Vault corpus: who contributed, their agency,
// revenue band, how many calls, NDA status, and submission status/date. Lives
// under /admin so it inherits the admin sidebar chrome and is_admin gating —
// see middleware.ts's ADMIN_PREFIX check, which already covers every page
// under this prefix (no separate in-page gate needed; see the comment on
// requireAdminRequest in lib/contracts/require-admin.ts).
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { labelFor, REVENUE_BANDS } from '@/lib/call-vault/vocabularies';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-200',
  submitted: 'bg-emerald-900 text-emerald-200',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function CallVaultPage() {
  const db = getSupabaseServerClient();

  const { data: contributors } = await db
    .from('call_vault_contributors')
    .select('id, name, email, agency_name, revenue_band, nda_signed_at, status, submitted_at, created_at')
    .order('created_at', { ascending: false });

  // Call counts fetched in one grouped query and counted in JS — never one
  // query per contributor row (see listCallsForContributor in lib/call-vault/db.ts
  // for the same pattern).
  const { data: calls } = await db.from('call_vault_calls').select('id, contributor_id');
  const callCounts = new Map<string, number>();
  for (const c of calls ?? []) {
    callCounts.set(c.contributor_id, (callCounts.get(c.contributor_id) ?? 0) + 1);
  }

  const rows = contributors ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Call Vault</h1>
        <p className="text-sm text-slate-400 mt-1">
          Contributors to the sales-call corpus — {rows.length} total.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 divide-y divide-slate-800">
        {rows.length === 0 && <p className="p-4 text-slate-500 text-sm">No contributors yet.</p>}
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/admin/call-vault/${c.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-slate-900/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{c.name}</p>
              <p className="text-slate-500 text-xs truncate">
                {c.email}{c.agency_name ? ` · ${c.agency_name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 text-xs">
              <span className="text-slate-400 hidden sm:inline">{labelFor(REVENUE_BANDS, c.revenue_band)}</span>
              <span className="text-slate-300 w-16 text-right">
                {callCounts.get(c.id) ?? 0} call{(callCounts.get(c.id) ?? 0) === 1 ? '' : 's'}
              </span>
              <span className={c.nda_signed_at ? 'text-emerald-300' : 'text-slate-500'}>
                {c.nda_signed_at ? 'NDA ✓' : 'No NDA'}
              </span>
              <span className={`px-2 py-1 rounded ${STATUS_BADGE[c.status] ?? 'bg-slate-700 text-slate-200'}`}>
                {c.status}
              </span>
              <span className="text-slate-500 hidden md:inline">{fmtDate(c.submitted_at ?? c.created_at)}</span>
              <span className="text-slate-600">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
