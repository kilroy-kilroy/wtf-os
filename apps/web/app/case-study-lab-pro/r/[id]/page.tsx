import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-auth-server";
import { getProReport } from "@/lib/case-study-lab/pro-db";
import type { ScoreResult } from "@repo/prompts";
import ProReport from "@/components/case-study-lab/ProReport";
import ScoreCard from "@/components/case-study-lab/ScoreCard";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export default async function ProReportPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const report = await getProReport(id);
  // Owner-only (unless published — the public wall handles that separately).
  if (!report || !report.result || report.user_id !== user.id) notFound();

  const quality = (report.quality as ScoreResult | null) ?? null;

  return (
    <div className="min-h-screen bg-[#eef0f3]">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14">
        <ProReport report={report} />
        {quality && <ScoreCard quality={quality} />}
        <a href="/case-study-lab-pro" className="text-sm text-[#5b6472] underline">
          Build another case study
        </a>
      </main>
    </div>
  );
}
