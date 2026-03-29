'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DiscoveryBrief {
  id: string;
  target_company: string;
  target_contact_name: string | null;
  target_contact_title: string | null;
  version: string;
  created_at: string;
}

interface DiscoveryBriefLinkProps {
  reportId: string;
  linkedBrief: DiscoveryBrief | null;
  userBriefs: DiscoveryBrief[];
}

export function DiscoveryBriefLink({ reportId, linkedBrief, userBriefs }: DiscoveryBriefLinkProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLink(briefId: string) {
    setIsLinking(true);
    setError(null);
    try {
      const res = await fetch('/api/call-lab/link-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, discoveryBriefId: briefId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link brief');
      }
      setShowPicker(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link brief');
    } finally {
      setIsLinking(false);
    }
  }

  async function handleUnlink() {
    setIsLinking(true);
    setError(null);
    try {
      const res = await fetch('/api/call-lab/link-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, discoveryBriefId: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unlink brief');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink brief');
    } finally {
      setIsLinking(false);
    }
  }

  // If linked, show the linked brief with navigation
  if (linkedBrief) {
    return (
      <div className="mb-6 border border-[#333] rounded-lg p-4 bg-[#111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#FFDE59] text-xs font-anton uppercase tracking-wider">Linked Discovery Brief</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFDE59]/10 text-[#FFDE59] font-medium uppercase">
              {linkedBrief.version}
            </span>
          </div>
          <button
            onClick={handleUnlink}
            disabled={isLinking}
            className="text-[10px] text-[#666] hover:text-[#E51B23] transition-colors disabled:opacity-50"
          >
            Unlink
          </button>
        </div>
        <Link
          href={`/discovery-lab/report/${linkedBrief.id}`}
          className="mt-2 block group"
        >
          <p className="text-white font-medium group-hover:text-[#FFDE59] transition-colors">
            {linkedBrief.target_company}
            {linkedBrief.target_contact_name && (
              <span className="text-[#B3B3B3] font-normal"> - {linkedBrief.target_contact_name}</span>
            )}
          </p>
          {linkedBrief.target_contact_title && (
            <p className="text-[#666] text-xs mt-0.5">{linkedBrief.target_contact_title}</p>
          )}
          <p className="text-[#555] text-xs mt-1">
            Created {new Date(linkedBrief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            <span className="ml-2 text-[#FFDE59] opacity-0 group-hover:opacity-100 transition-opacity">View brief →</span>
          </p>
        </Link>
        {error && <p className="text-[#E51B23] text-xs mt-2">{error}</p>}
      </div>
    );
  }

  // Not linked - show link button / picker
  if (userBriefs.length === 0) return null;

  return (
    <div className="mb-6">
      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-[#666] hover:text-[#FFDE59] transition-colors border border-[#333] hover:border-[#FFDE59] rounded px-3 py-2"
        >
          + Link to Discovery Brief
        </button>
      ) : (
        <div className="border border-[#333] rounded-lg p-4 bg-[#111]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#FFDE59] text-xs font-anton uppercase tracking-wider">
              Link to Discovery Brief
            </span>
            <button
              onClick={() => setShowPicker(false)}
              className="text-[#666] hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {userBriefs.map((brief) => (
              <button
                key={brief.id}
                onClick={() => handleLink(brief.id)}
                disabled={isLinking}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#1A1A1A] transition-colors disabled:opacity-50 group"
              >
                <p className="text-white text-sm group-hover:text-[#FFDE59] transition-colors">
                  {brief.target_company}
                  {brief.target_contact_name && (
                    <span className="text-[#B3B3B3] font-normal"> - {brief.target_contact_name}</span>
                  )}
                </p>
                <p className="text-[#555] text-xs">
                  {brief.version.toUpperCase()} - {new Date(brief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </button>
            ))}
          </div>
          {error && <p className="text-[#E51B23] text-xs mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
