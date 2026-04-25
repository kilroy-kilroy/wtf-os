// apps/web/app/client/demandos-intake/review/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import IntakeForm from '@/components/client/demandos-intake/IntakeForm';
import type { ExistingDoc } from '@/components/client/DocumentUploadSlot';

export default function DemandosIntakeReviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    answers: Record<string, unknown>;
    documents: ExistingDoc[];
    submittedAt: string | null;
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      const res = await fetch('/api/client/demandos-intake');
      if (!res.ok) { router.push('/client/dashboard'); return; }

      const body = await res.json();
      setData({
        answers: body.intake?.answers ?? {},
        documents: body.documents ?? [],
        submittedAt: body.intake?.submitted_at ?? null,
      });
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <IntakeForm
      initialAnswers={data.answers}
      initialDocuments={data.documents}
      submittedAt={data.submittedAt}
      readOnly
    />
  );
}
