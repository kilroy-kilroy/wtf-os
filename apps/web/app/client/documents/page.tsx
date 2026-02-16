'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Image from 'next/image';
import Link from 'next/link';

interface ClientDocument {
  id: string;
  title: string;
  description: string | null;
  document_type: 'file' | 'link' | 'text';
  file_url: string | null;
  file_name: string | null;
  external_url: string | null;
  content_body: string | null;
  category: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  roadmap: 'Roadmap',
  transcript: 'Transcript',
  plan: 'Plan',
  resource: 'Resource',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  roadmap: '#FFDE59',
  transcript: '#00D4FF',
  plan: '#22c55e',
  resource: '#a855f7',
  other: '#666666',
};

export default function ClientDocumentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [textModal, setTextModal] = useState<ClientDocument | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      // Get enrollment
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!enrollment) { router.push('/client/login'); return; }

      // Get documents (RLS ensures only this client's docs are returned)
      const { data: docs } = await supabase
        .from('client_documents')
        .select('*')
        .eq('enrollment_id', enrollment.id)
        .order('created_at', { ascending: false });

      setDocuments(docs || []);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  const filtered = filter === 'all'
    ? documents
    : documents.filter(d => d.category === filter);

  const categories = ['all', ...new Set(documents.map(d => d.category))];

  function openDocument(doc: ClientDocument) {
    if (doc.document_type === 'text') {
      setTextModal(doc);
    } else if (doc.document_type === 'link' && doc.external_url) {
      window.open(doc.external_url, '_blank');
    } else if (doc.document_type === 'file' && doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#333333] border-t-[#E51B23] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-anton uppercase text-[#E51B23]">Your Documents</h1>
          <Link href="/client/dashboard" className="text-sm text-[#999999] hover:text-white transition-colors">
            Back to Dashboard
          </Link>
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors border ${
                  filter === cat
                    ? 'border-[#E51B23] text-[#E51B23]'
                    : 'border-[#333333] text-[#999999] hover:text-white hover:border-white'
                }`}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Documents list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#666666]">No documents yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => (
              <div
                key={doc.id}
                onClick={() => openDocument(doc)}
                className="bg-[#1A1A1A] border border-[#333333] p-4 hover:border-[#E51B23] transition-colors cursor-pointer flex items-center gap-4"
              >
                {/* Type icon */}
                <div className="w-10 h-10 flex items-center justify-center bg-[#0A0A0A] border border-[#333333] text-[10px] font-bold uppercase text-[#999999] shrink-0">
                  {doc.document_type === 'file' ? (doc.file_name?.split('.').pop() || 'FILE') : doc.document_type === 'link' ? 'LINK' : 'TXT'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium truncate">{doc.title}</h3>
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 shrink-0"
                      style={{ color: CATEGORY_COLORS[doc.category] || '#666', backgroundColor: `${CATEGORY_COLORS[doc.category] || '#666'}20` }}
                    >
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-[#999999] text-sm mt-0.5 truncate">{doc.description}</p>
                  )}
                  <p className="text-[#666666] text-xs mt-1">
                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {doc.file_name && <span className="ml-2">{doc.file_name}</span>}
                  </p>
                </div>

                {/* Arrow */}
                <span className="text-[#666666] text-xl shrink-0">&rarr;</span>
              </div>
            ))}
          </div>
        )}

        {/* Text content modal */}
        {textModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setTextModal(null)}>
            <div className="bg-[#1A1A1A] border border-[#333333] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-anton uppercase text-[#E51B23]">{textModal.title}</h2>
                <button onClick={() => setTextModal(null)} className="text-[#999999] hover:text-white text-xl">&times;</button>
              </div>
              <div className="text-[#CCCCCC] text-sm whitespace-pre-wrap leading-relaxed">
                {textModal.content_body}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
