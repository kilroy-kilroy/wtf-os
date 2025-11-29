import { QuickInsights } from "@/lib/dashboard-types";

type Props = {
  insights: QuickInsights;
};

export function QuickInsightsPanel({ insights }: Props) {
  return (
    <section className="border border-[#E51B23] rounded-lg px-4 py-3 space-y-3 bg-black">
      <h3 className="font-anton text-sm uppercase tracking-wide text-[#FFDE59]">
        Quick insights
      </h3>

      <div className="space-y-2 text-sm text-[#B3B3B3]">
        <div>
          <div className="font-anton text-[10px] uppercase text-[#777]">
            Top buyer quote
          </div>
          <p className="mt-1">
            {insights.topQuote
              ? `"${insights.topQuote}"`
              : "We will surface your sharpest buyer quote after your next analysis."}
          </p>
        </div>

        <div>
          <div className="font-anton text-[10px] uppercase text-[#777]">
            Biggest missed move
          </div>
          <p className="mt-1">
            {insights.missedMove ||
              "Once we see a consistent missed move across calls, it will show up here."}
          </p>
        </div>

        <div>
          <div className="font-anton text-[10px] uppercase text-[#777]">
            Skill to practice next call
          </div>
          <p className="mt-1">
            {insights.skillToPractice ||
              "Run another call through Call Lab Pro and we will tell you what to sharpen next."}
          </p>
        </div>
      </div>
    </section>
  );
}
