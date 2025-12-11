'use client';

type Trend = 'rising' | 'stable' | 'falling';

interface PatternStat {
  pattern_id: string;
  macro_name: string;
  frequency: number;
  total_calls: number;
  percentage: number;
  trend?: Trend;
}

interface MomentumSectionProps {
  biggestWin?: PatternStat;
  biggestFix?: PatternStat;
  nextFocus?: string;
}

// Context helpers for pattern explanations
function getWinContext(patternId: string): string {
  const contexts: Record<string, string> = {
    cultural_handshake: "Your strongest trust-building move",
    diagnostic_reveal: "You're great at uncovering the real problem",
    vulnerability_flip: "You create deep buyer connection",
    peer_validation_engine: "Buyers see you as a peer advisor",
    self_diagnosis_pull: "Buyers discover their needs with you",
    framework_drop: "You structure conversations clearly",
    permission_builder: "You create psychological safety",
    mirror_close: "You reflect buyer criteria effectively",
  };
  return contexts[patternId] || "Strong pattern detection";
}

function getFixContext(patternId: string): string {
  const contexts: Record<string, string> = {
    soft_close_fade: "You're losing deals at the finish line",
    scenic_route: "Conversations lack clear direction",
    generous_professor: "You're giving away too much for free",
    advice_avalanche: "You solve problems before they buy",
    surface_scanner: "Discovery isn't deep enough",
    business_blitzer: "You skip rapport and go straight to business",
    agenda_abandoner: "You lose control of the call flow",
    passenger: "Buyer drives while you follow",
    premature_solution: "You pitch before understanding",
    over_explain_loop: "You over-explain when challenged",
  };
  return contexts[patternId] || "Pattern needs attention";
}

function getTrendLabel(trend: Trend): string {
  const labels: Record<Trend, string> = {
    rising: 'Getting stronger',
    stable: 'Consistent strength',
    falling: 'Needs attention',
  };
  return labels[trend];
}

function getTrendIcon(trend: Trend): string {
  const icons: Record<Trend, string> = {
    rising: '↗',
    stable: '→',
    falling: '↘',
  };
  return icons[trend];
}

export function MomentumSection({
  biggestWin,
  biggestFix,
  nextFocus,
}: MomentumSectionProps) {
  return (
    <div className="bg-[#1A1A1A] border border-[#333]">
      <div className="p-6">
        <h2 className="font-anton text-lg uppercase tracking-wide text-white mb-5">
          MOMENTUM
        </h2>

        <div className="space-y-4">
          {/* Biggest Win */}
          {biggestWin && (
            <div className="bg-[rgba(255,222,89,0.05)] border-l-4 border-[#FFDE59] p-4">
              <div className="text-[10px] font-bold tracking-wide text-[#666] mb-2">
                BIGGEST WIN
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#FFDE59] font-bold text-base">
                  {biggestWin.macro_name}
                </span>
                <span className="text-[#FFDE59]">⚡</span>
              </div>
              <div className="text-[11px] text-[#999] mb-2">
                Appearing in {biggestWin.frequency}/{biggestWin.total_calls} calls ({Math.round(biggestWin.percentage)}%)
              </div>
              {biggestWin.trend && (
                <div className="text-[11px] text-green-400 mb-2">
                  {getTrendIcon(biggestWin.trend)} {getTrendLabel(biggestWin.trend)}
                </div>
              )}
              <div className="text-[12px] text-[#CCC] leading-relaxed">
                {getWinContext(biggestWin.pattern_id)}
              </div>
            </div>
          )}

          {/* Biggest Thing to Fix */}
          {biggestFix && (
            <div className="bg-[rgba(229,27,35,0.05)] border-l-4 border-[#E51B23] p-4">
              <div className="text-[10px] font-bold tracking-wide text-[#666] mb-2">
                BIGGEST THING TO FIX
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#E51B23] font-bold text-base">
                  {biggestFix.macro_name}
                </span>
              </div>
              <div className="text-[11px] text-[#999] mb-2">
                Appearing in {biggestFix.frequency}/{biggestFix.total_calls} calls ({Math.round(biggestFix.percentage)}%)
              </div>
              <div className="text-[12px] text-[#CCC] leading-relaxed">
                {getFixContext(biggestFix.pattern_id)}
              </div>
            </div>
          )}

          {/* Next Call Focus */}
          {nextFocus && (
            <div className="bg-[rgba(74,144,226,0.05)] border-l-4 border-[#4A90E2] p-4">
              <div className="text-[10px] font-bold tracking-wide text-[#666] mb-2">
                NEXT CALL FOCUS
              </div>
              <div className="text-[13px] text-white leading-relaxed">
                {nextFocus}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!biggestWin && !biggestFix && !nextFocus && (
            <div className="text-center py-8">
              <p className="text-[#666]">
                Analyze some calls to see your momentum
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MomentumSection;
