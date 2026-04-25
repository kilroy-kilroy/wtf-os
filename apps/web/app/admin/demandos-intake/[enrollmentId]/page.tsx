// apps/web/app/admin/demandos-intake/[enrollmentId]/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { SECTIONS, QUESTIONS } from '@/lib/demandos-intake/questions';

type AdminDoc = {
  id: string; category: string; title: string | null; file_name: string;
  storage_path: string; mime_type: string | null; size_bytes: number | null;
  uploaded_at: string; signedUrl: string | null;
};

type AdminResponse = {
  enrollment: { id: string; user_id: string; client_programs: { slug: string; name: string } | { slug: string; name: string }[] };
  intake: { answers: Record<string, unknown>; submitted_at: string | null; updated_at: string } | null;
  documents: AdminDoc[];
};

export default function AdminDemandosIntakePage() {
  const params = useParams<{ enrollmentId: string }>();
  const enrollmentId = params.enrollmentId;
  const [apiKey, setApiKey] = useState('');
  const [data, setData] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/demandos-intake/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = await res.json();
      if (!res.ok) { setErr(body.error ?? 'Failed'); return; }
      setData(body);
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <h1 className="text-xl font-bold mb-4">DemandOS Intake — Admin View</h1>
        <p className="text-sm text-slate-400 mb-4">Enter admin API key:</p>
        <div className="flex gap-2 max-w-md">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ADMIN_API_KEY"
            className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
          />
          <button
            onClick={load}
            disabled={!apiKey || loading}
            className="bg-[#E51B23] px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
        {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
      </div>
    );
  }

  const answers = data.intake?.answers ?? {};
  const program = Array.isArray(data.enrollment.client_programs)
    ? data.enrollment.client_programs[0]
    : data.enrollment.client_programs;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">DemandOS Intake</h1>
      <p className="text-sm text-slate-400 mb-6">
        Program: {program?.name} · Enrollment: {enrollmentId}<br/>
        {data.intake?.submitted_at
          ? `Submitted: ${new Date(data.intake.submitted_at).toLocaleString()}`
          : 'Not yet submitted'}
      </p>

      {SECTIONS.map((s) => {
        const qs = QUESTIONS.filter((q) => q.section === s.slug);
        return (
          <section key={s.slug} className="mb-8 border-t border-slate-800 pt-6">
            <h2 className="text-lg font-bold text-[#E51B23] uppercase tracking-wider mb-4">{s.title}</h2>
            <div className="space-y-4">
              {qs.map((q) => {
                if (q.type === 'upload') {
                  const docs = data.documents.filter((d) => d.category === q.uploadCategory);
                  return (
                    <div key={q.key}>
                      <div className="text-xs text-slate-400 mb-1">{q.label}</div>
                      {docs.length === 0 ? (
                        <div className="text-slate-600 text-sm">— no files —</div>
                      ) : (
                        <ul className="space-y-1">
                          {docs.map((d) => (
                            <li key={d.id} className="text-sm">
                              {d.signedUrl
                                ? <a href={d.signedUrl} target="_blank" rel="noreferrer" className="text-[#E51B23] underline">{d.file_name}</a>
                                : d.file_name}
                              {d.size_bytes ? <span className="text-slate-600 ml-2">({(d.size_bytes / 1024).toFixed(1)} KB)</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                }
                const v = answers[q.key];
                const display = Array.isArray(v) ? v.join(', ') : (v === undefined || v === null || v === '') ? '—' : String(v);
                return (
                  <div key={q.key}>
                    <div className="text-xs text-slate-400 mb-1">{q.label}</div>
                    <div className="text-sm whitespace-pre-wrap">{display}</div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
