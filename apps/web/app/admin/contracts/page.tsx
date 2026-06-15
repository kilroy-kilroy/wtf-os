import Link from 'next/link';
import { listContracts } from '@/lib/contracts/queries';

const BADGE: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-200', sending: 'bg-sky-900 text-sky-200',
  sent: 'bg-blue-900 text-blue-200',
  viewed: 'bg-indigo-900 text-indigo-200', signed: 'bg-amber-900 text-amber-200',
  completed: 'bg-emerald-900 text-emerald-200', declined: 'bg-red-900 text-red-200',
  voided: 'bg-slate-800 text-slate-400',
};

export default async function ContractsPage() {
  const contracts = await listContracts();
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Contracts</h1>
        <Link href="/admin/contracts/new" className="px-4 py-2 rounded-lg bg-[#E51B23] text-white text-sm font-medium">
          New contract
        </Link>
      </div>
      <div className="rounded-lg border border-slate-800 divide-y divide-slate-800">
        {contracts.length === 0 && <p className="p-4 text-slate-500 text-sm">No contracts yet.</p>}
        {contracts.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-white text-sm font-medium">{c.title}</p>
              <p className="text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${BADGE[c.status] ?? 'bg-slate-700'}`}>{c.status}</span>
              {c.signed_pdf_path && (
                <a href={`/api/contracts/${c.id}/file`} className="text-xs text-blue-300 underline">Signed PDF</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
