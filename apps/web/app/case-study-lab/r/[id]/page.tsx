import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CaseStudy, AgencyBrand } from "@repo/prompts";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCardModel } from "@/components/case-study-lab/cardModel";
import ReportBody from "@/components/case-study-lab/ReportBody";
import DownloadButtons from "@/components/case-study-lab/DownloadButtons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report?.result) return {};
  const cs = report.result as CaseStudy;
  return {
    title: `${cs.clientName}: ${cs.headline}`,
    description: cs.clientDescriptor,
  };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report || !report.result) notFound();

  const model = buildCardModel(report);

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
        <ReportBody
          result={report.result as CaseStudy}
          accent={model.accent}
          clientLogoUrl={report.client_logo_url}
          agencyLogoUrl={model.agencyLogoUrl}
          agencyName={model.agencyName}
        />
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-[#9aa0a6]">Download to post:</div>
          <DownloadButtons id={id} />
        </div>
        <a href="/case-study-lab" className="text-sm text-[#808080] underline">
          Build another case study
        </a>
      </main>
    </div>
  );
}
