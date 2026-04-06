'use client';

import { useState, useEffect } from 'react';

const PROGRAMS = [
  { slug: 'agency-studio', name: 'Agency Studio' },
  { slug: 'agency-studio-plus', name: 'Agency Studio+' },
  { slug: 'salesos-studio', name: 'SalesOS Studio' },
  { slug: 'salesos-growth', name: 'SalesOS Growth' },
  { slug: 'salesos-team', name: 'SalesOS Team' },
  { slug: 'demandos-studio', name: 'DemandOS Studio' },
  { slug: 'demandos-growth', name: 'DemandOS Growth' },
  { slug: 'demandos-team', name: 'DemandOS Team' },
];

type SessionType = 'office-hours' | 'one-on-one';
type ViewState = 'list' | 'upload' | 'review';

interface Enrollment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  program_name: string;
  company_name: string | null;
  org_id: string | null;
}

interface OrgGroup {
  org_id: string;
  company_name: string;
  enrollments: Enrollment[];
}

interface SessionListItem {
  id: string;
  title: string;
  session_type: SessionType;
  status: 'draft' | 'published';
  target_name: string;
  created_at: string;
}

interface DraftSession {
  title: string;
  synopsis: string;
  teaching: string;
  vtt_url: string;
  original_filename: string;
  parsed_transcript: string;
  type: SessionType;
  target_id: string;
}

export default function AdminSessionsPage() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<ViewState>('list');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload form state
  const [sessionType, setSessionType] = useState<SessionType>('one-on-one');
  const [targetId, setTargetId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  // Review state
  const [draft, setDraft] = useState<DraftSession | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSynopsis, setEditSynopsis] = useState('');
  const [editTeaching, setEditTeaching] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_api_key');
    if (stored) {
      setApiKey(stored);
      setAuthed(true);
      loadSessions(stored);
      loadEnrollments(stored);
    }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('admin_api_key', apiKey);
    setAuthed(true);
    loadSessions(apiKey);
    loadEnrollments(apiKey);
  }

  async function loadSessions(key: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
    setLoading(false);
  }

  async function loadEnrollments(key: string) {
    try {
      const res = await fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        const enrollmentList: Enrollment[] = (data.clients || []).map((c: any) => ({
          id: c.enrollment_id || c.id,
          user_id: c.user_id,
          user_name: c.full_name || c.email || 'Unknown',
          user_email: c.email || '',
          program_name: c.program_name || '',
          company_name: c.company_name || null,
          org_id: c.org_id || null,
        }));
        setEnrollments(enrollmentList);
      }
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    }
  }

  async function handleUpload() {
    if (!file || !targetId) {
      alert('Please select a file and a target');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', sessionType);
      formData.append('target_id', targetId);

      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error || 'Upload failed'}`);
        setUploading(false);
        return;
      }

      const data = await res.json();
      setDraft({
        title: data.title,
        synopsis: data.synopsis,
        teaching: data.teaching,
        vtt_url: data.vtt_url,
        original_filename: data.original_filename,
        parsed_transcript: data.parsed_transcript,
        type: sessionType,
        target_id: targetId,
      });
      setEditTitle(data.title);
      setEditSynopsis(data.synopsis);
      setEditTeaching(data.teaching);
      setView('review');
    } catch (err) {
      alert('Upload failed');
    }
    setUploading(false);
  }

  async function handleRegenerate(field: 'synopsis' | 'teaching' | 'both') {
    if (!draft) return;
    setRegenerating(field);
    try {
      const res = await fetch('/api/admin/sessions/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          transcript: draft.parsed_transcript,
          field,
          type: draft.type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.synopsis) setEditSynopsis(data.synopsis);
        if (data.teaching) setEditTeaching(data.teaching);
      } else {
        alert('Regeneration failed');
      }
    } catch (err) {
      alert('Regeneration failed');
    }
    setRegenerating(null);
  }

  async function handlePublish() {
    if (!draft) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/admin/sessions/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: draft.type,
          target_id: draft.target_id,
          title: editTitle,
          synopsis: editSynopsis,
          teaching: editTeaching,
          vtt_url: draft.vtt_url,
          original_filename: draft.original_filename,
        }),
      });

      if (res.ok) {
        setDraft(null);
        setView('list');
        setFile(null);
        setTargetId('');
        await loadSessions(apiKey);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Publish failed'}`);
      }
    } catch (err) {
      alert('Publish failed');
    }
    setPublishing(false);
  }

  // ── Auth gate ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <form onSubmit={handleAuth} className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-anton uppercase text-[#E51B23]">Admin: Sessions</h1>
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

  // ── Review view ──
  if (view === 'review' && draft) {
    return (
      <div className="min-h-screen bg-black text-white p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Review Session</h1>
            <button
              onClick={() => { setView('list'); setDraft(null); }}
              className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
              />
            </div>

            {/* Synopsis */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] tracking-[2px] text-[#666666] uppercase">Synopsis</label>
                <button
                  onClick={() => handleRegenerate('synopsis')}
                  disabled={regenerating !== null}
                  className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59] transition-colors disabled:opacity-50"
                >
                  {regenerating === 'synopsis' ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
              <textarea
                value={editSynopsis}
                onChange={(e) => setEditSynopsis(e.target.value)}
                rows={8}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none resize-y text-sm leading-relaxed"
              />
            </div>

            {/* Teaching */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] tracking-[2px] text-[#666666] uppercase">Teaching</label>
                <button
                  onClick={() => handleRegenerate('teaching')}
                  disabled={regenerating !== null}
                  className="text-[10px] uppercase font-bold border border-[#333333] px-2 py-1 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59] transition-colors disabled:opacity-50"
                >
                  {regenerating === 'teaching' ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
              <textarea
                value={editTeaching}
                onChange={(e) => setEditTeaching(e.target.value)}
                rows={8}
                className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none resize-y text-sm leading-relaxed"
              />
            </div>

            {/* VTT download preview */}
            <div className="bg-[#1A1A1A] border border-[#333333] p-4">
              <p className="text-[#999999] text-sm">
                Call transcript: <a href={draft.vtt_url} target="_blank" className="text-[#00D4FF] hover:underline">{draft.original_filename}</a>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-[#E51B23] text-white px-8 py-3 font-anton uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
              <button
                onClick={() => handleRegenerate('both')}
                disabled={regenerating !== null}
                className="border border-[#333333] text-[#999999] px-6 py-3 font-anton uppercase hover:text-white hover:border-white transition-colors disabled:opacity-50"
              >
                {regenerating === 'both' ? 'Regenerating...' : 'Regenerate Both'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List + Upload view ──
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Sessions</h1>
          <div className="flex gap-3">
            <a href="/admin/content" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Content Library
            </a>
            <a href="/admin/clients" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Clients
            </a>
            <a href="/admin" className="text-sm border border-[#333333] px-4 py-2 text-[#999999] hover:text-white transition-colors">
              Main Admin
            </a>
          </div>
        </div>

        {/* Upload Form */}
        {view === 'upload' && (
          <div className="bg-[#1A1A1A] border border-[#333333] p-6 mb-8">
            <h2 className="text-xl font-anton uppercase text-[#FFDE59] mb-4">Upload Session Transcript</h2>
            <div className="space-y-4">
              {/* Session type */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Session Type *</label>
                <select
                  value={sessionType}
                  onChange={(e) => { setSessionType(e.target.value as SessionType); setTargetId(''); }}
                  className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                >
                  <option value="one-on-one">Monthly 1:1</option>
                  <option value="office-hours">Office Hours</option>
                </select>
              </div>

              {/* Target selection */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">
                  {sessionType === 'one-on-one' ? 'Client *' : 'Program *'}
                </label>
                {sessionType === 'one-on-one' ? (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                  >
                    <option value="">Select a client or agency...</option>
                    {(() => {
                      // Group enrollments by org
                      const orgGroups: OrgGroup[] = [];
                      const soloEnrollments: Enrollment[] = [];

                      const orgMap = new Map<string, OrgGroup>();
                      for (const e of enrollments) {
                        if (e.org_id && e.company_name) {
                          if (!orgMap.has(e.org_id)) {
                            orgMap.set(e.org_id, { org_id: e.org_id, company_name: e.company_name, enrollments: [] });
                          }
                          orgMap.get(e.org_id)!.enrollments.push(e);
                        } else {
                          soloEnrollments.push(e);
                        }
                      }
                      orgMap.forEach(g => { if (g.enrollments.length > 1) orgGroups.push(g); else soloEnrollments.push(...g.enrollments); });
                      orgGroups.sort((a, b) => a.company_name.localeCompare(b.company_name));

                      return (
                        <>
                          {orgGroups.map(org => (
                            <optgroup key={org.org_id} label={`── ${org.company_name} ──`}>
                              <option value={`org:${org.org_id}`}>
                                ★ All {org.company_name} contacts ({org.enrollments.length})
                              </option>
                              {org.enrollments.map(e => (
                                <option key={e.id} value={e.id}>
                                  {e.user_name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          {soloEnrollments.length > 0 && (
                            <optgroup label="── Individual ──">
                              {soloEnrollments.map(e => (
                                <option key={e.id} value={e.id}>
                                  {e.user_name} {e.company_name ? `(${e.company_name})` : e.program_name ? `(${e.program_name})` : ''}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                ) : (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-black border border-[#333333] text-white px-3 py-2 focus:border-[#E51B23] focus:outline-none"
                  >
                    <option value="">Select a program...</option>
                    {PROGRAMS.map(p => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* File upload */}
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666666] mb-1 uppercase">Transcript File *</label>
                <input
                  type="file"
                  accept=".vtt,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-[#999999] text-sm file:mr-4 file:py-2 file:px-4 file:border file:border-[#333333] file:bg-black file:text-white file:font-bold file:uppercase file:text-xs file:cursor-pointer hover:file:border-[#E51B23]"
                />
                {file && (
                  <p className="text-[#666666] text-xs mt-1">Title will be: &quot;{file.name.replace(/\.(vtt|txt)$/i, '')}&quot;</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file || !targetId}
                  className="bg-[#E51B23] text-white px-6 py-2 font-anton uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Processing...' : 'Upload & Generate'}
                </button>
                <button
                  onClick={() => { setView('list'); setFile(null); setTargetId(''); }}
                  className="border border-[#333333] text-[#999999] px-6 py-2 font-anton uppercase hover:text-white hover:border-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload button */}
        {view === 'list' && (
          <div className="mb-6">
            <button
              onClick={() => setView('upload')}
              className="bg-[#E51B23] text-white px-6 py-2 font-anton uppercase hover:bg-red-700 transition-colors"
            >
              + Upload Session
            </button>
          </div>
        )}

        {/* Sessions table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333333]">
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Title</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-28">Type</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase">Target</th>
                <th className="text-center py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-24">Status</th>
                <th className="text-left py-3 px-2 text-[11px] tracking-[2px] text-[#666666] uppercase w-28">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#666666]">Loading...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#666666]">No sessions yet. Click &quot;+ Upload Session&quot; above.</td></tr>
              ) : (
                sessions.map(session => (
                  <tr key={session.id} className="border-b border-[#222222] hover:bg-[#111111]">
                    <td className="py-3 px-2 text-white">{session.title}</td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        session.session_type === 'office-hours'
                          ? 'text-[#FFDE59] border-[#FFDE59]'
                          : 'text-[#00D4FF] border-[#00D4FF]'
                      }`}>
                        {session.session_type === 'office-hours' ? 'Office Hours' : '1:1'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#999999]">{session.target_name}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[10px] font-bold uppercase ${
                        session.status === 'published' ? 'text-[#22c55e]' : 'text-[#FFDE59]'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#666666] text-xs">
                      {new Date(session.created_at).toLocaleDateString()}
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
