'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Variable = { key: string; label: string; required?: boolean };
type Template = { id: string; name: string; variables: Variable[]; body_html: string };
type Snippet = { id: string; label: string; category: string; body_html: string };

export default function NewContractForm({ templates, snippets }: { templates: Template[]; snippets: Snippet[] }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [particulars, setParticulars] = useState('');
  const [sowHtml, setSowHtml] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [counterName, setCounterName] = useState('Tim Kilroy');
  const [counterEmail, setCounterEmail] = useState('tim@timkilroy.com');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

  async function draftWithAi() {
    setBusy('Drafting…'); setError(null);
    try {
      const res = await fetch('/api/contracts/draft-sow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ particulars, context: { company_name: fields.company_name, ...fields } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSowHtml(json.html);
    } catch (e) { setError(e instanceof Error ? e.message : 'draft failed'); }
    finally { setBusy(null); }
  }

  function addSnippet(s: Snippet) { setSowHtml((prev) => `${prev}\n${s.body_html}`); }

  async function saveAndSend(send: boolean) {
    setBusy(send ? 'Generating & sending…' : 'Saving…'); setError(null);
    try {
      const create = await fetch('/api/contracts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId, title: `${fields.company_name ?? 'Contract'} — ${template?.name ?? ''}`,
          fieldValues: fields, sowHtml,
          signers: [
            { role: 'client', name: clientName, email: clientEmail, order: 1 },
            { role: 'counter', name: counterName, email: counterEmail, order: 2 },
          ],
        }),
      });
      const created = await create.json();
      if (!create.ok) throw new Error(created.error);
      if (send) {
        const sent = await fetch(`/api/contracts/${created.id}/send`, { method: 'POST' });
        const sentJson = await sent.json();
        if (!sent.ok) throw new Error(sentJson.error);
      }
      router.push('/admin/contracts');
    } catch (e) { setError(e instanceof Error ? e.message : 'failed'); }
    finally { setBusy(null); }
  }

  const merged = useMemo(() => {
    if (!template) return '';
    let html = template.body_html.replace(/\{\{\s*sow\s*\}\}/gi, sowHtml);
    for (const [k, v] of Object.entries(fields)) html = html.replaceAll(`{{${k}}}`, v);
    return html;
  }, [template, fields, sowHtml]);

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-6xl">
      <div className="space-y-6">
        <section className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">1. Template</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm">
            <option value="">Select a template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </section>

        {template && (
          <section className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">2. Client details</label>
            {template.variables.map((v) => (
              <input key={v.key} placeholder={v.label} value={fields[v.key] ?? ''}
                onChange={(e) => setFields((f) => ({ ...f, [v.key]: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <input placeholder="Client signer name" value={clientName} onChange={(e) => setClientName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
              <input placeholder="Client signer email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
            </div>
          </section>
        )}

        {template && (
          <section className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">3. Statement of Work</label>
            <textarea placeholder="Rough particulars: deliverables, timeline, price…" value={particulars}
              onChange={(e) => setParticulars(e.target.value)} rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
            <button type="button" onClick={draftWithAi} disabled={!!busy}
              className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs">Draft with AI</button>
            <div className="flex flex-wrap gap-1 pt-1">
              {snippets.map((s) => (
                <button key={s.id} type="button" onClick={() => addSnippet(s)}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs">+ {s.label}</button>
              ))}
            </div>
            <textarea value={sowHtml} onChange={(e) => setSowHtml(e.target.value)} rows={8}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-xs font-mono" />
          </section>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {template && (
          <div className="flex gap-2">
            <button type="button" onClick={() => saveAndSend(false)} disabled={!!busy}
              className="px-4 py-2 rounded bg-slate-700 text-white text-sm">Save draft</button>
            <button type="button" onClick={() => saveAndSend(true)} disabled={!!busy}
              className="px-4 py-2 rounded bg-[#E51B23] text-white text-sm">{busy ?? 'Generate & Send'}</button>
          </div>
        )}
      </div>

      <div className="md:sticky md:top-6 h-fit">
        <label className="text-sm text-slate-300 font-medium">4. Preview</label>
        <div className="mt-2 bg-white text-black rounded p-6 text-sm overflow-auto max-h-[80vh]"
          dangerouslySetInnerHTML={{ __html: merged || '<p class="text-slate-400">Select a template…</p>' }} />
      </div>
    </div>
  );
}
