import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAnalysis } from "@/lib/wah-wah/db";
import ScoreCard from "@/components/wah-wah/ScoreCard";
import ReportGate, { type WahWahResult } from "@/components/wah-wah/ReportGate";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) return {};
  const hostname = hostnameOf(analysis.url);
  return {
    title: `${hostname} scored ${analysis.score}% wah-wah`,
    description: "How much of your homepage says absolutely nothing? Find out.",
  };
}

export default async function ResultPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { admin } = await searchParams;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const result = analysis.result as WahWahResult & { verdict: string };
  const isAdmin = admin === "1";

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-10 px-4 py-16">
        <ScoreCard score={analysis.score} verdict={result.verdict} url={analysis.url} />
        <ReportGate
          analysisId={analysis.id}
          flagCount={result.flags.length}
          initialResult={isAdmin ? result : null}
        />
        <a href="/wah-wah" className="font-poppins text-sm text-[#808080] underline">
          Score another homepage
        </a>
      </main>
    </div>
  );
}
