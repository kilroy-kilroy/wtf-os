// apps/web/app/admin/call-vault/[id]/page.tsx
//
// Full profile for one Call Vault contributor: their agency/services/revenue
// band, NDA status (with a link to the signed PDF when present), and every
// call they submitted with its stage/outcome/deal size/notes and files as
// download links. Lives under /admin so it inherits the admin sidebar chrome
// and is_admin gating from middleware.ts — no separate in-page gate needed
// (see the comment on requireAdminRequest in lib/contracts/require-admin.ts).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { listCallsForAdmin } from '@/lib/call-vault/db';
import { labelFor, SERVICES, REVENUE_BANDS, STAGES, OUTCOMES, DEAL_SIZE_BANDS } from '@/lib/call-vault/vocabularies';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-200',
  submitted: 'bg-emerald-900 text-emerald-200',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function fmtBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ContributorDetail {
  id: string;
  name: string;
  email: string;
  agency_name: string | null;
  agency_url: string | null;
  services: string[] | null;
  revenue_band: string | null;
  target_client: string | null;
  nda_contract_id: string | null;
  nda_signed_at: string | null;
  client_legal_name: string | null;
  client_address: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
}

export default async function CallVaultContributorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseServerClient();

  const { data: contributor } = await db
    .from('call_vault_contributors')
    .select(
      'id, name, email, agency_name, agency_url, services, revenue_band, target_client, ' +
        'nda_contract_id, nda_signed_at, client_legal_name, client_address, status, submitted_at, created_at',
    )
    .eq('id', id)
    .maybeSingle<ContributorDetail>();

  if (!contributor) notFound();

  const calls = await listCallsForAdmin(contributor.id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/call-vault" className="text-slate-400 text-sm hover:text-white">← All contributors</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{contributor.name}</h1>
          <p className="text-slate-500 text-xs mt-1">
            {contributor.email} · joined {fmtDateTime(contributor.created_at)}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${STATUS_BADGE[contributor.status] ?? 'bg-slate-700 text-slate-200'}`}>
          {contributor.status}{contributor.submitted_at ? ` · ${fmtDate(contributor.submitted_at)}` : ''}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-sm font-medium text-slate-300 mb-2">Profile</h2>
          <div className="rounded border border-slate-800 divide-y divide-slate-800 text-sm">
            <Row label="Agency" value={contributor.agency_name ?? '—'} />
            <Row
              label="Agency URL"
              value={
                contributor.agency_url ? (
                  <a href={contributor.agency_url} target="_blank" rel="noreferrer" className="text-blue-300 underline">
                    {contributor.agency_url}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <Row label="Services" value={(contributor.services ?? []).map((s) => labelFor(SERVICES, s)).join(', ') || '—'} />
            <Row label="Revenue band" value={labelFor(REVENUE_BANDS, contributor.revenue_band)} />
            <Row label="Target client" value={contributor.target_client ?? '—'} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-300 mb-2">NDA</h2>
          <div className="rounded border border-slate-800 divide-y divide-slate-800 text-sm">
            <Row label="Signed" value={contributor.nda_signed_at ? `Yes · ${fmtDateTime(contributor.nda_signed_at)}` : 'No'} />
            <Row label="Client legal name" value={contributor.client_legal_name ?? '—'} />
            <Row label="Client address" value={contributor.client_address ?? '—'} />
            <Row
              label="Signed PDF"
              value={
                contributor.nda_contract_id ? (
                  <a
                    href={`/api/contracts/${contributor.nda_contract_id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 underline"
                  >
                    Download
                  </a>
                ) : (
                  '—'
                )
              }
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-300 mb-2">
          Calls ({calls.length})
        </h2>
        <div className="space-y-4">
          {calls.length === 0 && <p className="text-slate-500 text-sm">No calls submitted.</p>}
          {calls.map((call, i) => (
            <div key={call.id} className="rounded border border-slate-800 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <div>
                  <p className="text-white text-sm font-medium">
                    {call.label || `Call ${i + 1}`}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {labelFor(STAGES, call.stage)} · {labelFor(OUTCOMES, call.outcome)} · {labelFor(DEAL_SIZE_BANDS, call.dealSizeBand)}
                    {call.callDate ? ` · ${fmtDate(call.callDate)}` : ''}
                  </p>
                </div>
              </div>
              {call.notes && (
                <p className="text-slate-300 text-sm whitespace-pre-wrap mb-3">{call.notes}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                {call.files.length === 0 && <span className="text-slate-600">No files.</span>}
                {call.files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/admin/call-vault/files/${f.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 underline"
                  >
                    {f.fileName} ({fmtBytes(f.sizeBytes)})
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 p-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 text-right">{value}</span>
    </div>
  );
}
