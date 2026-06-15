'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContractActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDraft = status === 'draft' || status === 'sending';
  const isLive = ['sent', 'viewed', 'signed'].includes(status);

  async function send() {
    setBusy('Generating & sending…'); setError(null);
    try {
      const res = await fetch(`/api/contracts/${id}/send`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'send failed');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'send failed'); }
    finally { setBusy(null); }
  }

  async function refresh() {
    setBusy('Refreshing status…'); setError(null);
    try {
      const res = await fetch(`/api/contracts/${id}/sync`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'sync failed');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'sync failed'); }
    finally { setBusy(null); }
  }

  async function remove() {
    if (!confirm('Delete this contract? This cannot be undone.')) return;
    setBusy('Deleting…'); setError(null);
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'delete failed');
      router.push('/admin/contracts');
    } catch (e) { setError(e instanceof Error ? e.message : 'delete failed'); setBusy(null); }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <button onClick={send} disabled={!!busy}
            className="px-4 py-2 rounded bg-[#E51B23] text-white text-sm font-medium disabled:opacity-60">
            {busy === 'Generating & sending…' ? busy : 'Generate & Send'}
          </button>
        )}
        {isLive && (
          <button onClick={refresh} disabled={!!busy}
            className="px-4 py-2 rounded bg-slate-700 text-white text-sm disabled:opacity-60">
            {busy === 'Refreshing status…' ? busy : 'Refresh status'}
          </button>
        )}
        {(status === 'draft' || status === 'voided' || status === 'declined') && (
          <button onClick={remove} disabled={!!busy}
            className="px-4 py-2 rounded border border-slate-700 text-slate-300 text-sm disabled:opacity-60">
            Delete
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
