import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ConsolePanel, ConsoleHeading, ConsoleMarkdownRenderer } from '@/components/console';

interface DiscoveryBrief {
  id: string;
  lead_email: string;
  lead_name: string | null;
  lead_company: string | null;
  version: string;
  what_you_sell: string;
  target_company: string;
  target_contact_name: string | null;
  target_contact_title: string | null;
  target_company_url: string | null;
  markdown_response: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default async function DiscoveryReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerComponentClient({ cookies });

  // Try to get user - reports can be viewed by owner or via direct link
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the report
  const { data: report, error } = await supabase
    .from('discovery_briefs')
    .select('*')
    .eq('id', id)
    .single<DiscoveryBrief>();

  if (error || !report) {
    redirect('/discovery-lab');
  }

  // Check access - either owner or public access for lead magnet
  const isOwner = user?.email === report.lead_email;

  // For now, allow public access to reports via direct link (lead magnet flow)
  // In future, could restrict Pro reports to authenticated users only

  const isPro = report.version === 'pro';
  const createdDate = new Date(report.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-black py-12 px-4 font-poppins">
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons */}
        <div className="flex gap-4 justify-between mb-6">
          <Link
            href="/discovery-lab"
            className="font-anton text-sm uppercase border border-[#333] text-[#B3B3B3] px-4 py-2 rounded hover:border-[#FFDE59] hover:text-[#FFDE59] transition"
          >
            ← NEW RESEARCH
          </Link>
          {isPro ? (
            <Link
              href="/discovery-lab-pro"
              className="font-anton text-sm uppercase bg-[#FFDE59] text-black px-4 py-2 rounded hover:bg-[#E5C94F] transition"
            >
              DISCOVERY LAB PRO
            </Link>
          ) : (
            <Link
              href="/discovery-lab-pro?utm_source=report"
              className="font-anton text-sm uppercase bg-[#E51B23] text-white px-4 py-2 rounded hover:bg-[#C41820] transition"
            >
              UPGRADE TO PRO
            </Link>
          )}
        </div>

        {/* Report Header */}
        <ConsolePanel className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <ConsoleHeading level={1} variant="yellow">
                DISCOVERY LAB {isPro && <span className="text-[#E51B23]">PRO</span>}
              </ConsoleHeading>
              <p className="text-[#666] text-sm mt-1">{createdDate}</p>
            </div>
            <div className="text-right">
              <p className="text-[#FFDE59] font-anton text-lg uppercase tracking-wide">
                {report.target_company}
              </p>
              {report.target_contact_name && (
                <p className="text-[#B3B3B3]">
                  {report.target_contact_name}
                  {report.target_contact_title && (
                    <span className="text-[#666]"> - {report.target_contact_title}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </ConsolePanel>

        {/* Report Content */}
        <ConsolePanel>
          {report.markdown_response ? (
            <ConsoleMarkdownRenderer content={report.markdown_response} />
          ) : (
            <div className="text-center py-12">
              <p className="text-[#666]">Report content not available</p>
            </div>
          )}
        </ConsolePanel>

        {/* Upgrade CTA for Lite reports */}
        {!isPro && (
          <div className="mt-8 bg-[#111] border-2 border-[#E51B23] rounded-lg p-8">
            <div className="text-center mb-6">
              <h2 className="font-anton text-2xl text-[#FFDE59] uppercase tracking-wide mb-2">
                Discovery Lab showed you the basics.
              </h2>
              <h3 className="font-anton text-xl text-white uppercase tracking-wide">
                Discovery Lab Pro shows you how to win.
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
              <div className="space-y-2 text-[#B3B3B3]">
                <div>→ <span className="text-white">Stakeholder Map:</span> Every decision-maker and their priorities</div>
                <div>→ <span className="text-white">Competitive Intel:</span> What they&apos;re using now and why they might switch</div>
                <div>→ <span className="text-white">Objection Predictions:</span> What they&apos;ll push back on and how to handle it</div>
              </div>
              <div className="space-y-2 text-[#B3B3B3]">
                <div>→ <span className="text-white">Custom Talk Tracks:</span> Word-for-word scripts for this specific prospect</div>
                <div>→ <span className="text-white">Trigger Events:</span> The moments that make them ready to buy</div>
                <div>→ <span className="text-white">Deal Strategy:</span> The path from first call to closed-won</div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/discovery-lab-pro?utm_source=report"
                className="inline-block bg-[#E51B23] text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#C41820] transition-colors"
              >
                Unlock Pro Intelligence →
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-[#666] text-sm">
          <p>Report generated by Discovery Lab • timkilroy.com</p>
        </div>
      </div>
    </div>
  );
}
