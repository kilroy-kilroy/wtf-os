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
    <div className="bg-[#1A1A1A] border-2 border-[#333] p-6">
      <h2 className="font-anton text-xl tracking-wide text-white mb-5">
        MOMENTUM
      </h2>

      <div className="flex flex-col gap-4">
        {/* Biggest Win */}
        {biggestWin && (
          <div className="bg-[#0A0A0A] border-l-4 border-[#FFDE59] p-5">
            <div className="text-[9px] font-bold tracking-wider text-[#666] mb-2.5">
              BIGGEST WIN
            </div>
            <div className="text-[17px] font-bold text-[#FFDE59] leading-tight mb-1.5">
              {biggestWin.macro_name} ⚡
            </div>
            <div className="text-[11px] text-[#999] mb-2.5">
              Appearing in {biggestWin.frequency}/{biggestWin.total_calls} calls ({Math.round(biggestWin.percentage)}%)
            </div>
            {biggestWin.trend && (
              <div className="text-[11px] text-green-400 mb-2.5">
                {getTrendIcon(biggestWin.trend)} {getTrendLabel(biggestWin.trend)}
              </div>
            )}
            <div className="text-[12px] text-white leading-relaxed">
              {getWinContext(biggestWin.pattern_id)}
            </div>
          </div>
        )}

        {/* Biggest Thing to Fix */}
        {biggestFix && (
          <div className="bg-[#0A0A0A] border-l-4 border-[#E51B23] p-5">
            <div className="text-[9px] font-bold tracking-wider text-[#666] mb-2.5">
              BIGGEST THING TO FIX
            </div>
            <div className="text-[17px] font-bold text-[#E51B23] leading-tight mb-1.5">
              {biggestFix.macro_name}
            </div>
            <div className="text-[11px] text-[#999] mb-2.5">
              Appearing in {biggestFix.frequency}/{biggestFix.total_calls} calls ({Math.round(biggestFix.percentage)}%)
            </div>
            <div className="text-[12px] text-white leading-relaxed">
              {getFixContext(biggestFix.pattern_id)}
            </div>
          </div>
        )}

        {/* Next Call Focus */}
        {nextFocus && (
          <div className="bg-[#0A0A0A] border-l-4 border-[#4A90E2] p-5">
            <div className="text-[9px] font-bold tracking-wider text-[#666] mb-2.5">
              NEXT CALL FOCUS
            </div>
            <div className="text-[13px] text-white leading-relaxed">
              {nextFocus}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!biggestWin && !biggestFix && !nextFocus && (
          <div className="text-center py-10">
            <p className="text-[#666]">
              Analyze some calls to see your momentum
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MomentumSection;
