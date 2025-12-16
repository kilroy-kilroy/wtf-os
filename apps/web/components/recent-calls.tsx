import { RecentCall } from "@/lib/dashboard-types";
import { PatternTag } from "./pattern-tag";

type Props = {
  calls: RecentCall[];
};

export function RecentCallsList({ calls }: Props) {
  if (!calls.length) {
    return (
      <div className="border border-dashed border-[#333] rounded-lg px-6 py-10 text-center text-sm text-[#777]">
        <div className="mb-3 text-2xl">📞</div>
        <p>No calls analyzed yet. Start by analyzing your first call.</p>
        <p className="mt-1 text-xs text-[#555]">
          Upload a transcript and Call Lab Pro will break it down for you.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {calls.map((call) => (
        <a
          key={call.id}
          href={`/call-lab/report/${call.id}`}
          className="border border-[#333] rounded-lg px-4 py-3 hover:border-[#FFDE59] transition bg-[#050505]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-anton text-sm uppercase text-[#FFDE59]">
                {call.buyerName || "Unknown buyer"}
                {call.companyName ? ` - ${call.companyName}` : ""}
              </div>
              <div className="text-xs text-[#777]">
                {new Date(call.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-anton text-lg text-white">
                {typeof call.score === "number"
                  ? (call.score > 10
                      ? `${Math.round(call.score)}/100`
                      : `${call.score.toFixed(1)}/10`)
                  : "--"}
              </div>
              <div className="text-[10px] text-[#777]">Overall score</div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {call.primaryPattern && (
              <PatternTag pattern={call.primaryPattern} />
            )}
            {call.improvementHighlight && (
              <span className="px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#333]">
                Focus: {call.improvementHighlight}
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
