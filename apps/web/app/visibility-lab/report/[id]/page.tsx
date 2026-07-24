import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/contracts/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { VisibilityReportClient } from './client';
import ReportEngagementFooter from '@/components/ReportEngagementFooter';

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}) {
  const { id } = await params;
  const { admin } = await searchParams;

  let report: VisibilityLabRecord | null = null;

  // Admin bypass: validate cookie against env var
  if (admin === '1') {
    if (await requireAdmin()) {
      const adminSupabase = getSupabaseServerClient();
      const { data } = await (adminSupabase as any)
        .from('visibility_lab_reports')
        .select('*')
        .eq('id', id)
        .single();
      if (data) report = data;
    }
  }

  // Normal flow: read by link=key (the UUID is the access token). This is a
  // public lead-magnet report; service-role read bypasses owner-only RLS so a
  // logged-out lead can open their report.
  if (!report) {
    const supabase = getSupabaseServerClient();
    const { data } = await (supabase as any)
      .from('visibility_lab_reports')
      .select('*')
      .eq('id', id)
      .single();
    if (data) report = data as VisibilityLabRecord;
  }

  if (!report || !report.full_report) {
    notFound();
  }

  // Pro is recorded in the `version` column at save time; `full_report.tier` is
  // never set, so the legacy check rendered paid Pro reports as lite. Prefer the
  // column, keeping the old check as a fallback for any legacy rows.
  const isPro = (report as any).version === 'pro' || (report.full_report as any)?.tier === 'pro';
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

        <ReportEngagementFooter
          currentTool="visibility"
          email={(report as any).email ?? null}
          reportId={id}
          reportUrl={`/visibility-lab/report/${id}`}
        />
      </div>
    </div>
  );
}
