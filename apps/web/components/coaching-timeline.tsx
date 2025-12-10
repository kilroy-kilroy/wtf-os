"use client";

import { format } from "date-fns";
import Link from "next/link";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export interface CoachingReport {
  id: string;
  report_type: "weekly" | "monthly" | "quarterly";
  period_start: string;
  period_end: string;
  scores_aggregate?: {
    overall: number;
    trust_velocity: number;
  };
  created_at: string;
}

interface CoachingTimelineProps {
  reports: CoachingReport[];
}

const formatPeriodLabel = (report: CoachingReport): string => {
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

const getReportIcon = (type: string): string => {
  switch (type) {
    case "weekly":
      return "📅";
    case "monthly":
      return "📊";
    case "quarterly":
      return "📈";
    default:
      return "📋";
  }
};

export function CoachingTimeline({ reports }: CoachingTimelineProps) {
  // Group reports by type
  const weekly = reports.filter((r) => r.report_type === "weekly").slice(0, 5);
  const monthly = reports.filter((r) => r.report_type === "monthly").slice(0, 3);
  const quarterly = reports.filter((r) => r.report_type === "quarterly").slice(0, 2);

  const hasReports = reports.length > 0;

  return (
    <section className="border border-[#E51B23] rounded-lg px-6 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-anton text-lg md:text-xl uppercase tracking-wide text-[#FFDE59]">
          Your Coaching Timeline
        </h2>
        <InfoTooltip content="Personalized coaching reports generated from your call analysis. Weekly reports focus on micro-adjustments, monthly on patterns, quarterly on trajectory." />
      </div>

      {!hasReports ? (
        <div className="bg-[#1A1A1A] rounded-lg p-6 text-center">
          <p className="text-[#B3B3B3] mb-2">
            Your first weekly coaching session will appear here after Sunday.
          </p>
          <p className="text-[#666] text-sm">
            We analyze your calls every week and deliver personalized coaching Monday morning.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Weekly */}
          <div className="space-y-3">
            <h3 className="font-anton text-sm uppercase tracking-wide text-[#B3B3B3] flex items-center gap-2">
              <span>📅</span> Weekly
            </h3>
            {weekly.length === 0 ? (
              <p className="text-[#666] text-sm">No weekly reports yet</p>
            ) : (
              <div className="space-y-2">
                {weekly.map((report) => (
                  <Link
                    key={report.id}
                    href={`/dashboard/coaching/${report.id}`}
                    className="block bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 hover:border-[#E51B23] transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white group-hover:text-[#FFDE59] transition-colors">
                        {formatPeriodLabel(report)}
                      </span>
                      {report.scores_aggregate?.overall && (
                        <span className="text-xs text-[#666]">
                          {report.scores_aggregate.overall.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Monthly */}
          <div className="space-y-3">
            <h3 className="font-anton text-sm uppercase tracking-wide text-[#B3B3B3] flex items-center gap-2">
              <span>📊</span> Monthly
            </h3>
            {monthly.length === 0 ? (
              <p className="text-[#666] text-sm">No monthly reports yet</p>
            ) : (
              <div className="space-y-2">
                {monthly.map((report) => (
                  <Link
                    key={report.id}
                    href={`/dashboard/coaching/${report.id}`}
                    className="block bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 hover:border-[#E51B23] transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white group-hover:text-[#FFDE59] transition-colors">
                        {formatPeriodLabel(report)}
                      </span>
                      {report.scores_aggregate?.overall && (
                        <span className="text-xs text-[#666]">
                          {report.scores_aggregate.overall.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quarterly */}
          <div className="space-y-3">
            <h3 className="font-anton text-sm uppercase tracking-wide text-[#B3B3B3] flex items-center gap-2">
              <span>📈</span> Quarterly
            </h3>
            {quarterly.length === 0 ? (
              <p className="text-[#666] text-sm">No quarterly reports yet</p>
            ) : (
              <div className="space-y-2">
                {quarterly.map((report) => (
                  <Link
                    key={report.id}
                    href={`/dashboard/coaching/${report.id}`}
                    className="block bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 hover:border-[#E51B23] transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white group-hover:text-[#FFDE59] transition-colors">
                        {formatPeriodLabel(report)}
                      </span>
                      {report.scores_aggregate?.overall && (
                        <span className="text-xs text-[#666]">
                          {report.scores_aggregate.overall.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
