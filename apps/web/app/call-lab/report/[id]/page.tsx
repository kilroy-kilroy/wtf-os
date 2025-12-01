import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { format } from "date-fns";
import Link from "next/link";
import { ConsolePanel, ConsoleHeading, ConsoleMarkdownRenderer } from "@/components/console";

interface CallReport {
  id: string;
  user_id: string;
  buyer_name: string | null;
  company_name: string | null;
  call_type: string | null;
  call_date: string | null;
  duration_minutes: number | null;
  overall_score: number | null;
  opening_score: number | null;
  discovery_score: number | null;
  diagnostic_score: number | null;
  value_score: number | null;
  objection_score: number | null;
  commitment_score: number | null;
  human_first_score: number | null;
  trust_velocity: number | null;
  agenda_control: number | null;
  pattern_density: number | null;
  patterns_detected: string[] | null;
  primary_pattern: string | null;
  improvement_highlight: string | null;
  key_moments: { timestamp: string; description: string; type: string }[] | null;
  full_report: { markdown?: string } | null;
  tier: string;
  created_at: string;
}

export default async function CallReportPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: report, error } = await supabase
    .from("call_lab_reports")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single<CallReport>();

  if (error || !report) {
    redirect("/dashboard");
  }

  const scores = [
    { label: "Opening", value: report.opening_score },
    { label: "Discovery", value: report.discovery_score },
    { label: "Diagnostic", value: report.diagnostic_score },
    { label: "Value", value: report.value_score },
    { label: "Objection", value: report.objection_score },
    { label: "Commitment", value: report.commitment_score },
    { label: "Human-First", value: report.human_first_score },
  ].filter((s) => s.value !== null);

  const callDate = report.call_date || report.created_at;
  const prospect = report.buyer_name || report.company_name || "Unknown Prospect";

  return (
    <div className="min-h-screen bg-black py-8 px-4 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-[#B3B3B3] hover:text-white text-sm mb-4 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <div className="font-anton text-xs uppercase tracking-wider text-[#E51B23] mb-1">
              CALL LAB {report.tier?.toUpperCase() || "PRO"} REPORT
            </div>
            <h1 className="font-anton text-3xl uppercase tracking-wide text-[#FFDE59]">
              {prospect}
            </h1>
            <p className="text-[#B3B3B3] mt-2">
              {format(new Date(callDate), "MMMM d, yyyy 'at' h:mm a")}
              {report.duration_minutes && ` • ${report.duration_minutes} minutes`}
              {report.call_type && ` • ${report.call_type.replace("_", " ")}`}
            </p>
          </div>
          {report.overall_score !== null && (
            <div className="text-right">
              <div className="text-[#B3B3B3] text-xs uppercase">Overall Score</div>
              <div className="font-anton text-4xl text-[#FFDE59]">
                {report.overall_score.toFixed(1)}/10
              </div>
            </div>
          )}
        </div>

        {/* Quick Metrics */}
        <section className="grid grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-center">
            <div className="text-[#666] text-xs uppercase mb-1">Trust Velocity</div>
            <div className="font-anton text-2xl text-white">
              {report.trust_velocity?.toFixed(0) ?? "--"}
            </div>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-center">
            <div className="text-[#666] text-xs uppercase mb-1">Agenda Control</div>
            <div className="font-anton text-2xl text-white">
              {report.agenda_control?.toFixed(0) ?? "--"}
            </div>
          </div>
          <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-center">
            <div className="text-[#666] text-xs uppercase mb-1">Red Flag Frequency</div>
            <div className="font-anton text-2xl text-white">
              {report.pattern_density?.toFixed(0) ?? "--"}
            </div>
          </div>
        </section>

        {/* Score Breakdown */}
        {scores.length > 0 && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
              WTF Method Scores
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {scores.map((score) => (
                <div key={score.label} className="bg-[#1A1A1A] rounded p-3 text-center">
                  <div className="text-[#666] text-xs uppercase mb-1">{score.label}</div>
                  <div className="font-anton text-xl text-white">
                    {score.value?.toFixed(1)}/10
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Patterns Detected */}
        {report.patterns_detected && report.patterns_detected.length > 0 && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
              Patterns Detected
            </h2>
            <div className="flex flex-wrap gap-2">
              {report.patterns_detected.map((pattern, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded bg-[#1A1A1A] border border-[#E51B23] text-sm text-white"
                >
                  {pattern}
                </span>
              ))}
            </div>
            {report.primary_pattern && (
              <div className="mt-4 bg-[#1A1A1A] border border-[#333] rounded p-4">
                <span className="text-[#666] text-xs uppercase">Primary Pattern:</span>
                <span className="ml-2 text-[#FFDE59] font-medium">{report.primary_pattern}</span>
              </div>
            )}
          </section>
        )}

        {/* Key Moments */}
        {report.key_moments && report.key_moments.length > 0 && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
              Key Moments
            </h2>
            <div className="space-y-3">
              {report.key_moments.map((moment, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {moment.timestamp && (
                      <span className="text-[#E51B23] text-xs font-mono">{moment.timestamp}</span>
                    )}
                    {moment.type && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        moment.type === "positive" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                      }`}>
                        {moment.type}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm">{moment.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Improvement Highlight */}
        {report.improvement_highlight && (
          <section className="border border-[#FFDE59] rounded-lg px-6 py-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-2">
              Focus Area
            </h2>
            <p className="text-white">{report.improvement_highlight}</p>
          </section>
        )}

        {/* Full Report (Markdown) */}
        {report.full_report?.markdown && (
          <ConsolePanel>
            <ConsoleHeading level={2} variant="yellow" className="mb-4">
              Full Analysis
            </ConsoleHeading>
            <ConsoleMarkdownRenderer content={report.full_report.markdown} />
          </ConsolePanel>
        )}

        {/* Back to Dashboard */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-block font-anton text-sm uppercase border border-[#FFDE59] text-[#FFDE59] px-6 py-2 rounded hover:bg-[#FFDE59] hover:text-black transition"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/call-lab/new"
            className="inline-block font-anton text-sm uppercase bg-[#E51B23] text-white px-6 py-2 rounded hover:bg-[#C41820] transition"
          >
            Analyze Another Call
          </Link>
        </div>
      </div>
    </div>
  );
}
