import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase-auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
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
    const cookieStore = await cookies();
    const adminKey = cookieStore.get('admin_api_key')?.value;
    if (adminKey && adminKey === process.env.ADMIN_API_KEY) {
      const adminSupabase = getSupabaseServerClient();
      const { data } = await (adminSupabase as any)
        .from('visibility_lab_reports')
        .select('*')
        .eq('id', id)
        .single();
      if (data) report = data;
    }
  }

  // Normal user flow
  if (!report) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('visibility_lab_reports')
      .select('*')
      .eq('id', id)
      .single<VisibilityLabRecord>();

    if (!error && data) report = data;
  }

  if (!report || !report.full_report) {
    notFound();
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
