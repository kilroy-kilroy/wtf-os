'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { ClientRoadmap } from '@/types/client';

export default function ClientRoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<ClientRoadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      // Get user's active enrollment
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!enrollment) { router.push('/client/login'); return; }

      // Fetch roadmaps (RLS filters to this user's enrollment)
      const { data } = await supabase
        .from('client_roadmaps')
        .select('*')
        .eq('enrollment_id', enrollment.id)
        .order('uploaded_at', { ascending: false });

      setRoadmaps(data || []);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Your Roadmap</h1>
            <p className="text-[#666666] text-sm mt-1">Your strategic go-forward plan</p>
          </div>
          <a href="/client/dashboard" className="text-[#666666] hover:text-white text-sm border border-[#333333] px-4 py-2 transition-colors">
            &larr; Dashboard
          </a>
        </div>

        {roadmaps.length === 0 ? (
          <div className="text-center py-16 text-[#666666]">
            <p className="text-lg">No roadmap available yet</p>
            <p className="text-sm mt-2">Your roadmap will appear here once it&apos;s ready.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {roadmaps.map((rm) => (
              <div key={rm.id} className="border border-[#333333] hover:border-[#E51B23] transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-anton text-xl uppercase text-[#FFDE59]">{rm.title}</h2>
                      {rm.description && (
                        <p className="text-[#999999] text-sm mt-1">{rm.description}</p>
                      )}
                      <p className="text-[#666666] text-xs mt-2">
                        Updated {new Date(rm.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setViewingUrl(viewingUrl === rm.file_url ? null : rm.file_url)}
                        className={`text-xs uppercase font-bold border px-4 py-2 transition-colors ${
                          viewingUrl === rm.file_url
                            ? 'border-[#E51B23] text-[#E51B23]'
                            : 'border-[#333333] text-[#999999] hover:text-white hover:border-white'
                        }`}
                      >
                        {viewingUrl === rm.file_url ? 'Close' : 'View'}
                      </button>
                      <a
                        href={rm.file_url}
                        download={rm.file_name}
                        className="text-xs uppercase font-bold border border-[#333333] px-4 py-2 text-[#999999] hover:text-[#FFDE59] hover:border-[#FFDE59] transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>

                {/* Inline HTML Viewer */}
                {viewingUrl === rm.file_url && (
                  <div className="border-t border-[#333333]">
                    <iframe
                      src={rm.file_url}
                      className="w-full bg-white"
                      style={{ height: '80vh' }}
                      title={rm.title}
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
