'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReEnrichButton({ assessmentId }: { assessmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleReEnrich() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/growthos/re-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Re-enrichment failed');
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleReEnrich}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-sm font-bold bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Re-enriching…' : 'Re-run Enrichment'}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
