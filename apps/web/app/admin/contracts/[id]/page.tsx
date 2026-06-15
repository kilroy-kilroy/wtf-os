import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContract } from '@/lib/contracts/queries';
import { combineMergedHtml } from '@/lib/contracts/template-engine';
import ContractActions from './ContractActions';

const BADGE: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-200', sending: 'bg-sky-900 text-sky-200',
  sent: 'bg-blue-900 text-blue-200', viewed: 'bg-indigo-900 text-indigo-200',
  signed: 'bg-amber-900 text-amber-200', completed: 'bg-emerald-900 text-emerald-200',
  declined: 'bg-red-900 text-red-200', voided: 'bg-slate-800 text-slate-400',
};

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getContract(id);
  if (!data) notFound();
  const { contract, template, sowTemplate, signers } = data;

  // Re-merge the immutable snapshot for an on-screen preview. If a field is
  // missing the merge throws — surface that rather than rendering a broken doc.
  let preview = '';
  let previewError: string | null = null;
  try {
    preview = combineMergedHtml(
      template?.body_html ?? '', sowTemplate?.body_html ?? null,
      contract.field_values ?? {}, contract.sow_html ?? '',
    ).replace(/<div class="page-break"><\/div>/g, '<hr style="margin:24px 0;border:none;border-top:2px dashed #ccc"/>');
  } catch (e) {
    previewError = e instanceof Error ? e.message : 'preview failed';
  }

  const fields = Object.entries((contract.field_values ?? {}) as Record<string, string>);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/contracts" className="text-slate-400 text-sm hover:text-white">← All contracts</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{contract.title}</h1>
          <p className="text-slate-500 text-xs mt-1">
            {[template?.name, sowTemplate?.name].filter(Boolean).join(' + ') || 'Unknown template'} · {new Date(contract.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${BADGE[contract.status] ?? 'bg-slate-700'}`}>{contract.status}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ContractActions id={contract.id} status={contract.status} />

          {contract.last_error && (
            <div className="rounded border border-red-900/60 bg-red-950/30 p-3">
              <p className="text-red-300 text-xs font-medium mb-1">Last send error</p>
              <p className="text-red-200/80 text-xs">{contract.last_error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs">
            {contract.pdf_path && (
              <a href={`/api/contracts/${contract.id}/file?which=draft`} target="_blank" rel="noreferrer"
                className="text-blue-300 underline">Generated PDF</a>
            )}
            {contract.signed_pdf_path && (
              <a href={`/api/contracts/${contract.id}/file`} target="_blank" rel="noreferrer"
                className="text-blue-300 underline">Signed PDF</a>
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-300 mb-2">Signers</h2>
            <div className="rounded border border-slate-800 divide-y divide-slate-800">
              {signers.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="text-white">{s.name} <span className="text-slate-500">({s.role})</span></p>
                    <p className="text-slate-500 text-xs">{s.email}</p>
                  </div>
                  <span className="text-xs text-slate-400">{s.status}{s.signed_at ? ' ✓' : ''}</span>
                </div>
              ))}
              {signers.length === 0 && <p className="p-3 text-slate-500 text-sm">No signers.</p>}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-300 mb-2">Details</h2>
            <div className="rounded border border-slate-800 divide-y divide-slate-800 text-sm">
              {fields.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 p-2.5">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-200 text-right">{String(v)}</span>
                </div>
              ))}
              {fields.length === 0 && <p className="p-2.5 text-slate-500">No fields.</p>}
            </div>
          </div>
        </div>

        <div className="md:sticky md:top-6 h-fit">
          <h2 className="text-sm font-medium text-slate-300 mb-2">Preview</h2>
          {previewError ? (
            <p className="text-amber-400 text-sm">Can’t preview: {previewError}</p>
          ) : (
            <div className="bg-white text-black rounded p-6 text-sm overflow-auto max-h-[80vh]"
              dangerouslySetInnerHTML={{ __html: preview }} />
          )}
        </div>
      </div>
    </div>
  );
}
