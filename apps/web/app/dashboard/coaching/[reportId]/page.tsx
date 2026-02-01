import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { format } from "date-fns";
import Link from "next/link";

interface CoachingReportFull {
  id: string;
  user_id: string;
  report_type: "weekly" | "monthly" | "quarterly";
  period_start: string;
  period_end: string;
  call_ids: string[];
  full_report: {
    the_one_thing?: {
      behavior: string;
      why: string;
      drill: string;
      last_period_check: string | null;
    };
    outcome_patterns?: {
      wins_driven_by: string;
      losses_driven_by: string;
      key_insight: string;
    };
    wtf_trends: {
      dimension: string;
      trend: "up" | "down" | "stable";
      change: number;
      insight: string;
      call_impact: string;
    }[];
    human_first_trendline: {
      overall_assessment: string;
      curiosity_vs_interrogation: string;
      listening_quality: string;
      tone_mirroring: string;
      prospect_safety_signals: string;
      psychological_profile: string | null;
    };
    reinforcements: {
      behavior: string;
      why_it_landed: string;
      micro_action: string;
    }[];
    attack_list: {
      gap: string;
      why_it_blocked: string;
      small_adjustment: string;
    }[];
    emergent_patterns: {
      signal: string;
      classification: "positive" | "concerning";
      implication: string;
      watch_for: string;
    }[];
    wrap_up: string;
  };
  scores_aggregate: {
    overall: number;
    trust_velocity: number;
    opening?: number;
    discovery?: number;
    diagnostic?: number;
    value_articulation?: number;
    objection_navigation?: number;
    commitment?: number;
    human_first?: number;
  };
  created_at: string;
}

export default async function CoachingReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: report, error } = await supabase
    .from("coaching_reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single<CoachingReportFull>();

  if (error || !report) {
    redirect("/dashboard");
  }

  const formatPeriodLabel = (): string => {
    const start = new Date(report.period_start);
    const end = new Date(report.period_end);

    switch (report.report_type) {
      case "weekly":
        return `Week of ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      case "monthly":
        return format(start, "MMMM yyyy");
      case "quarterly":
        const quarter = Math.ceil((start.getMonth() + 1) / 3);
        return `Q${quarter} ${format(start, "yyyy")}`;
      default:
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
  };

  const getReportTypeLabel = (): string => {
    switch (report.report_type) {
      case "weekly":
        return "WEEKLY COACHING";
      case "monthly":
        return "MONTHLY COACHING";
      case "quarterly":
        return "QUARTERLY COACHING";
      default:
        return "COACHING REPORT";
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-[#FFDE59]";
    }
  };

  const fullReport = report.full_report;

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
              {getReportTypeLabel()}
            </div>
            <h1 className="font-anton text-3xl uppercase tracking-wide text-[#FFDE59]">
              {formatPeriodLabel()}
            </h1>
            <p className="text-[#B3B3B3] mt-2">
              Generated {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          {report.scores_aggregate?.overall && (
            <div className="text-right">
              <div className="text-[#B3B3B3] text-xs uppercase">Overall Score</div>
              <div className="font-anton text-4xl text-[#FFDE59]">
                {report.scores_aggregate.overall.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        {/* The One Thing */}
        {fullReport?.the_one_thing && (
          <section className="border-2 border-[#FFDE59] rounded-lg px-6 py-4 space-y-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
              The One Thing
            </h2>
            <p className="text-[#666] text-xs uppercase tracking-wider">
              The single highest-leverage change for this period
            </p>
            <div className="bg-[#FFDE59] rounded-lg p-4">
              <p className="font-anton text-xl text-black">
                {fullReport.the_one_thing.behavior}
              </p>
            </div>
            <p className="text-[#B3B3B3] text-sm">{fullReport.the_one_thing.why}</p>
            <div className="bg-[#1A1A1A] border border-[#FFDE59] rounded-lg p-4">
              <h4 className="text-[#FFDE59] text-xs uppercase mb-2">Your Drill</h4>
              <p className="text-white text-sm">{fullReport.the_one_thing.drill}</p>
            </div>
            {fullReport.the_one_thing.last_period_check && (
              <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
                <h4 className="text-[#666] text-xs uppercase mb-1">Last Period Check-In</h4>
                <p className="text-white text-sm">{fullReport.the_one_thing.last_period_check}</p>
              </div>
            )}
          </section>
        )}

        {/* Outcome Patterns */}
        {fullReport?.outcome_patterns && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
              Win/Loss Patterns
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#1A1A1A] border border-green-900 rounded-lg p-4">
                <h4 className="text-green-400 text-xs uppercase mb-2">Wins Driven By</h4>
                <p className="text-white text-sm">{fullReport.outcome_patterns.wins_driven_by}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-red-900 rounded-lg p-4">
                <h4 className="text-red-400 text-xs uppercase mb-2">Losses Driven By</h4>
                <p className="text-white text-sm">{fullReport.outcome_patterns.losses_driven_by}</p>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#E51B23] rounded-lg p-4">
              <h4 className="text-[#E51B23] text-xs uppercase mb-1">The Uncomfortable Truth</h4>
              <p className="text-white text-sm italic">{fullReport.outcome_patterns.key_insight}</p>
            </div>
          </section>
        )}

        {/* WTF Trends */}
        {fullReport?.wtf_trends && fullReport.wtf_trends.length > 0 && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
              WTF Trends
            </h2>
            <div className="space-y-4">
              {fullReport.wtf_trends.map((trend, i) => (
                <div
                  key={i}
                  className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-anton text-sm uppercase tracking-wide text-white">
                      {trend.dimension}
                    </h3>
                    <div className={`flex items-center gap-2 ${getTrendColor(trend.trend)}`}>
                      <span className="text-lg">{getTrendIcon(trend.trend)}</span>
                      <span className="font-anton text-sm">
                        {trend.change > 0 ? "+" : ""}
                        {trend.change.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#B3B3B3] text-sm mb-2">{trend.insight}</p>
                  <p className="text-[#666] text-xs italic">{trend.call_impact}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Human-First Trendline */}
        {fullReport?.human_first_trendline && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
              Human-First Trendline
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
                <h4 className="text-[#666] text-xs uppercase mb-1">Overall Assessment</h4>
                <p className="text-white text-sm">{fullReport.human_first_trendline.overall_assessment}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
                <h4 className="text-[#666] text-xs uppercase mb-1">Curiosity vs Interrogation</h4>
                <p className="text-white text-sm">{fullReport.human_first_trendline.curiosity_vs_interrogation}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
                <h4 className="text-[#666] text-xs uppercase mb-1">Listening Quality</h4>
                <p className="text-white text-sm">{fullReport.human_first_trendline.listening_quality}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
                <h4 className="text-[#666] text-xs uppercase mb-1">Tone Mirroring</h4>
                <p className="text-white text-sm">{fullReport.human_first_trendline.tone_mirroring}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 md:col-span-2">
                <h4 className="text-[#666] text-xs uppercase mb-1">Prospect Safety Signals</h4>
                <p className="text-white text-sm">{fullReport.human_first_trendline.prospect_safety_signals}</p>
              </div>
              {fullReport.human_first_trendline.psychological_profile && (
                <div className="bg-[#1A1A1A] border border-[#E51B23] rounded-lg p-4 md:col-span-2">
                  <h4 className="text-[#E51B23] text-xs uppercase mb-1">Psychological Profile</h4>
                  <p className="text-white text-sm">{fullReport.human_first_trendline.psychological_profile}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Reinforcements */}
        {fullReport?.reinforcements && fullReport.reinforcements.length > 0 && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
              Keep Doing This
            </h2>
            <div className="space-y-3">
              {fullReport.reinforcements.map((r, i) => (
                <div
                  key={i}
                  className="bg-[#1A1A1A] border border-green-900 rounded-lg p-4"
                >
                  <h4 className="text-green-400 font-medium mb-1">{r.behavior}</h4>
                  <p className="text-[#B3B3B3] text-sm mb-2">{r.why_it_landed}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] text-xs uppercase">Stay mindful:</span>
                    <span className="text-white text-sm">{r.micro_action}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Attack List */}
        {fullReport?.attack_list && fullReport.attack_list.length > 0 && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
              Attack List
            </h2>
            <div className="space-y-3">
              {fullReport.attack_list.map((a, i) => (
                <div
                  key={i}
                  className="bg-[#1A1A1A] border border-red-900 rounded-lg p-4"
                >
                  <h4 className="text-red-400 font-medium mb-1">{a.gap}</h4>
                  <p className="text-[#B3B3B3] text-sm mb-2">{a.why_it_blocked}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] text-xs uppercase">Fix:</span>
                    <span className="text-white text-sm">{a.small_adjustment}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Emergent Patterns */}
        {fullReport?.emergent_patterns && fullReport.emergent_patterns.length > 0 && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59]">
              Emergent Patterns
            </h2>
            <div className="space-y-3">
              {fullReport.emergent_patterns.map((p, i) => (
                <div
                  key={i}
                  className={`bg-[#1A1A1A] border rounded-lg p-4 ${
                    p.classification === "positive"
                      ? "border-green-900"
                      : "border-yellow-900"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs uppercase px-2 py-0.5 rounded ${
                        p.classification === "positive"
                          ? "bg-green-900 text-green-300"
                          : "bg-yellow-900 text-yellow-300"
                      }`}
                    >
                      {p.classification}
                    </span>
                    <span className="text-white font-medium">{p.signal}</span>
                  </div>
                  <p className="text-[#B3B3B3] text-sm mb-2">{p.implication}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666] text-xs uppercase">Watch for:</span>
                    <span className="text-white text-sm">{p.watch_for}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Wrap Up */}
        {fullReport?.wrap_up && (
          <section className="border border-[#E51B23] rounded-lg px-6 py-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#FFDE59] mb-4">
              Bottom Line
            </h2>
            <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-6">
              <p className="text-white text-lg leading-relaxed italic">
                &ldquo;{fullReport.wrap_up}&rdquo;
              </p>
              <p className="text-[#666] text-sm mt-4 text-right">
                -- Your WTF Coach
              </p>
            </div>
          </section>
        )}

        {/* Score Details */}
        {report.scores_aggregate && (
          <section className="border border-[#333] rounded-lg px-6 py-4">
            <h2 className="font-anton text-lg uppercase tracking-wide text-[#B3B3B3] mb-4">
              Score Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Opening", value: report.scores_aggregate.opening },
                { label: "Discovery", value: report.scores_aggregate.discovery },
                { label: "Diagnostic", value: report.scores_aggregate.diagnostic },
                { label: "Value Articulation", value: report.scores_aggregate.value_articulation },
                { label: "Objection Navigation", value: report.scores_aggregate.objection_navigation },
                { label: "Commitment", value: report.scores_aggregate.commitment },
                { label: "Human-First", value: report.scores_aggregate.human_first },
                { label: "Trust Velocity", value: report.scores_aggregate.trust_velocity },
              ].map(
                (score, i) =>
                  score.value !== undefined && (
                    <div key={i} className="bg-[#1A1A1A] rounded p-3 text-center">
                      <div className="text-[#666] text-xs uppercase mb-1">{score.label}</div>
                      <div className="font-anton text-xl text-white">
                        {typeof score.value === "number" ? score.value.toFixed(1) : score.value}
                      </div>
                    </div>
                  )
              )}
            </div>
          </section>
        )}

        {/* Back to Dashboard */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-block font-anton text-sm uppercase border border-[#FFDE59] text-[#FFDE59] px-6 py-2 rounded hover:bg-[#FFDE59] hover:text-black transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
