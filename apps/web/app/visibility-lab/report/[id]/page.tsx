import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth-server';
import Link from 'next/link';
import { VisibilityReportClient } from './client';

interface VisibilityLabRecord {
  id: string;
  user_id: string | null;
  email: string | null;
  brand_name: string | null;
  visibility_score: number | null;
  full_report: Record<string, unknown> | null;
  input_data: Record<string, unknown> | null;
  created_at: string;
}

export default async function VisibilityReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the report — RLS allows owner by user_id or email
  const { data: report, error } = await supabase
    .from('visibility_lab_reports')
    .select('*')
    .eq('id', id)
    .single<VisibilityLabRecord>();

  if (error || !report || !report.full_report) {
    redirect('/visibility-lab');
  }

  const isPro = (report.full_report as any)?.tier === 'pro';
  const createdDate = new Date(report.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-black py-12 px-4 font-poppins">
      <div className="max-w-5xl mx-auto">
        {/* Action Buttons */}
        <div className="flex gap-4 justify-between mb-6">
          <Link
            href="/visibility-lab"
            className="font-anton text-sm uppercase border border-[#333] text-[#B3B3B3] px-4 py-2 rounded hover:border-[#FFDE59] hover:text-[#FFDE59] transition"
          >
            &larr; NEW ANALYSIS
          </Link>
          {!isPro && (
            <Link
              href="/visibility-lab-pro?utm_source=report"
              className="font-anton text-sm uppercase bg-[#E51B23] text-white px-4 py-2 rounded hover:bg-[#C41820] transition"
            >
              UPGRADE TO PRO
            </Link>
          )}
        </div>

        {/* Report Header */}
        <div className="mb-6 border-b border-[#333] pb-4">
          <p className="text-[#666] text-xs uppercase tracking-widest mb-1">
            Visibility Lab {isPro ? 'Pro' : ''} Report &middot; {createdDate}
          </p>
          <h1 className="font-anton text-2xl text-white uppercase">
            {report.brand_name || 'Visibility Analysis'}
          </h1>
          {report.visibility_score != null && (
            <p className="text-[#FFDE59] text-sm mt-1">
              Visibility Score: <span className="font-bold">{report.visibility_score}/100</span>
            </p>
          )}
        </div>

        {/* Report Body — delegate to client component */}
        <VisibilityReportClient
          report={report.full_report}
          isPro={isPro}
        />
      </div>
    </div>
  );
}
