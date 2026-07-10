import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCaseStudyView } from "@/lib/case-study-lab/view";
import ReportBody from "@/components/case-study-lab/ReportBody";
import DownloadButtons from "@/components/case-study-lab/DownloadButtons";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report?.result) return {};
  const v = buildCaseStudyView(report);
  return { title: `${v.clientName}: ${v.headline}`, description: v.dek ?? v.clientDescriptor };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report || !report.result) notFound();
  const view = buildCaseStudyView(report);
  return (
    <div className="min-h-screen bg-[#eef0f3]">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14">
        <ReportBody view={view} />
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-[#5b6472]">Download &amp; share:</div>
          <DownloadButtons id={id} />
        </div>
        <a href="/case-study-lab" className="text-sm text-[#5b6472] underline">Build another case study</a>
      </main>
    </div>
  );
}
