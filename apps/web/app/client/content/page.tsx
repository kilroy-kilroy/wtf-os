'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { ClientContent } from '@/types/client';

const TYPE_ICONS: Record<string, string> = {
  video: '▶',
  deck: '◻',
  pdf: '◼',
  text: '≡',
  link: '↗',
  session: '◉',
};

const TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  deck: 'Deck',
  pdf: 'PDF',
  text: 'Article',
  link: 'Link',
  session: 'Session',
};

export default function ClientContentPage() {
  const [content, setContent] = useState<ClientContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ClientContent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadContent() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      // Fetch published content (RLS will filter by program)
      const { data } = await supabase
        .from('client_content')
        .select('*')
        .eq('published', true)
        .order('sort_order', { ascending: true });

      setContent(data || []);
      setLoading(false);
    }
    loadContent();
  }, [router, supabase]);

  const filtered = filterType === 'all'
    ? content
    : content.filter(c => c.content_type === filterType);

  const types = ['all', ...new Set(content.map(c => c.content_type))];

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
            <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Resource Library</h1>
            <p className="text-[#666666] text-sm mt-1">Videos, decks, and program materials</p>
          </div>
          <a href="/client/dashboard" className="text-[#666666] hover:text-white text-sm border border-[#333333] px-4 py-2 transition-colors">
            &larr; Dashboard
          </a>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                filterType === type ? 'bg-[#E51B23] text-white' : 'border border-[#333333] text-[#666666] hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : TYPE_LABELS[type] || type}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#666666]">
            <p className="text-lg">No content available yet</p>
            <p className="text-sm mt-2">Check back soon for new resources.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="border border-[#333333] hover:border-[#E51B23] transition-colors cursor-pointer"
                onClick={() => {
                  if (item.content_type === 'text' || item.content_type === 'session') {
                    setSelectedItem(item);
                  } else if (item.content_url) {
                    window.open(item.content_url, '_blank');
                  }
                }}
              >
                {item.thumbnail_url && (
                  <div className="aspect-video bg-[#111111] overflow-hidden">
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#FFDE59] text-xs">{TYPE_ICONS[item.content_type] || '?'}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#666666]">{TYPE_LABELS[item.content_type] || item.content_type}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{item.title}</h3>
                  {item.description && (
                    <p className="text-[#999999] text-xs mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text/Session content modal */}
        {selectedItem && (selectedItem.content_type === 'text' || selectedItem.content_type === 'session') && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-6">
            <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#1A1A1A] border border-[#333333] p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-anton uppercase text-[#E51B23]">{selectedItem.title}</h2>
                <button onClick={() => setSelectedItem(null)}
                  className="text-[#666666] hover:text-white text-lg">
                  ✕
                </button>
              </div>

              {selectedItem.content_type === 'session' && selectedItem.content_body ? (() => {
                try {
                  const session = JSON.parse(selectedItem.content_body);
                  return (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">What We Covered</h3>
                        <div className="text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
                          {session.synopsis}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[11px] tracking-[2px] text-[#FFDE59] uppercase mb-2">Key Takeaway</h3>
                        <div className="text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
                          {session.teaching}
                        </div>
                      </div>
                      {selectedItem.content_url && (
                        <div className="pt-4 border-t border-[#333333]">
                          <a
                            href={selectedItem.content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-[#00D4FF] hover:underline"
                          >
                            Download Call Transcript
                            <span className="text-[#666666] text-xs">(timestamped transcript)</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                } catch {
                  return (
                    <div className="prose prose-invert max-w-none text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedItem.content_body}
                    </div>
                  );
                }
              })() : (
                <div className="prose prose-invert max-w-none text-[#cccccc] text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedItem.content_body}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
