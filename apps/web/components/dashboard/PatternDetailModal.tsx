'use client';

import Link from 'next/link';

// ============================================
// TYPES
// ============================================

export interface DetectedPattern {
  id: string;
  name: string;
  category: string;
  polarity: 'positive' | 'negative';
  frequency: number;
  percentage: number;
}

interface PatternDetailModalProps {
  pattern: DetectedPattern;
  onClose: () => void;
}

// Pattern counter mapping
const PATTERN_COUNTERS: Record<string, string> = {
  scenic_route: "framework_drop",
  business_blitzer: "cultural_handshake",
  generous_professor: "diagnostic_reveal",
  advice_avalanche: "self_diagnosis_pull",
  surface_scanner: "diagnostic_reveal",
  agenda_abandoner: "permission_builder",
  passenger: "framework_drop",
  premature_solution: "diagnostic_reveal",
  soft_close_fade: "mirror_close",
  over_explain_loop: "permission_builder",
};

// Counter pattern names
const COUNTER_PATTERN_NAMES: Record<string, string> = {
  framework_drop: "The Framework Drop",
  cultural_handshake: "The Cultural Handshake",
  diagnostic_reveal: "The Diagnostic Reveal",
  self_diagnosis_pull: "The Self Diagnosis Pull",
  permission_builder: "The Permission Builder",
  mirror_close: "The Mirror Close",
};

// Counter pattern summaries
const COUNTER_PATTERN_SUMMARIES: Record<string, string> = {
  framework_drop: "Use a clear framework to structure the conversation and maintain control.",
  cultural_handshake: "Start with warmth and shared context to build trust before business talk.",
  diagnostic_reveal: "Dig deeper into the problem to uncover the real pain before offering solutions.",
  self_diagnosis_pull: "Help buyers discover their own needs through strategic questions.",
  permission_builder: "Ask permission before shifting topics to create psychological safety.",
  mirror_close: "Reflect the buyer's criteria back and confidently ask for the decision.",
};

// Pattern summaries
const PATTERN_SUMMARIES: Record<string, string> = {
  cultural_handshake: "Fast shared context and comfort that accelerates trust.",
  peer_validation_engine: "Buyer treats you like a peer advisor and adopts your language.",
  vulnerability_flip: "A personal story unlocks truth and reduces buyer shame.",
  diagnostic_reveal: "You name a hidden cost or risk the buyer hadn't articulated.",
  self_diagnosis_pull: "The buyer talks themselves into realizing they have a problem.",
  framework_drop: "You introduce a mental model that reframes how the buyer thinks.",
  permission_builder: "You ask permission before going deeper, creating psychological safety.",
  mirror_close: "You reflect the buyer's stated criteria and calmly ask for the decision.",
  scenic_route: "Rapport drifts into tangents and control is lost.",
  business_blitzer: "You rush into business without emotional calibration.",
  generous_professor: "You teach too much, collapsing price leverage.",
  advice_avalanche: "You solve the problem in the call, eliminating buying urgency.",
  surface_scanner: "Discovery stays shallow; real pain never surfaces.",
  agenda_abandoner: "You drop your plan when the buyer pushes back.",
  passenger: "The buyer drives the call; you follow instead of lead.",
  premature_solution: "You pitch before fully understanding their situation.",
  soft_close_fade: "Momentum is high but no concrete next step locks in.",
  over_explain_loop: "When challenged, you over-explain instead of re-framing.",
};

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    connection: "#FFDE59",
    diagnosis: "#4A90E2",
    control: "#FF8C42",
    activation: "#E51B23",
  };
  return colors[category] || "#666666";
}

// ============================================
// COMPONENT
// ============================================

export function PatternDetailModal({ pattern, onClose }: PatternDetailModalProps) {
  const counterPatternId = pattern.polarity === 'negative'
    ? PATTERN_COUNTERS[pattern.id]
    : null;

  const counterPatternName = counterPatternId ? COUNTER_PATTERN_NAMES[counterPatternId] : null;
  const counterPatternSummary = counterPatternId ? COUNTER_PATTERN_SUMMARIES[counterPatternId] : null;

  const patternSummary = PATTERN_SUMMARIES[pattern.id] || "Pattern detected in your calls";

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A1A] border-[3px] border-[#E51B23] max-w-[700px] w-full max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 bg-[#0A0A0A] border-2 border-[#333] text-white w-10 h-10 text-xl cursor-pointer hover:bg-[#E51B23] hover:border-[#E51B23] transition-all flex items-center justify-center"
        >
          ✕
        </button>

        {/* Content */}
        <div className="p-10">
          {/* Header */}
          <div className="flex justify-between items-start gap-5 mb-6 pb-6 border-b-2 border-[#333]">
            <h2 className="font-anton text-[28px] tracking-wide text-white flex-1">
              {pattern.name}
            </h2>
            <span
              className="px-4 py-2 text-[10px] font-bold tracking-wider"
              style={{
                backgroundColor: getCategoryColor(pattern.category),
                color: '#000000'
              }}
            >
              {pattern.category.toUpperCase()}
            </span>
          </div>

          {/* Summary */}
          <p className="text-[14px] leading-relaxed text-white mb-8">
            {patternSummary}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-5 mb-8 p-6 bg-[#0A0A0A] border border-[#333]">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold tracking-wider text-[#666]">FREQUENCY</span>
              <span className="font-anton text-[32px] text-[#FFDE59] leading-none">
                {pattern.frequency}
              </span>
              <span className="text-[11px] text-[#999]">calls</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold tracking-wider text-[#666]">PERCENTAGE</span>
              <span className="font-anton text-[32px] text-[#FFDE59] leading-none">
                {Math.round(pattern.percentage)}%
              </span>
              <span className="text-[11px] text-[#999]">of calls</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold tracking-wider text-[#666]">POLARITY</span>
              <span className={`font-anton text-[32px] leading-none ${
                pattern.polarity === 'positive' ? 'text-[#FFDE59]' : 'text-[#E51B23]'
              }`}>
                {pattern.polarity === 'positive' ? '✓' : '!'}
              </span>
              <span className="text-[11px] text-[#999]">{pattern.polarity}</span>
            </div>
          </div>

          {/* Counter Pattern (for negative patterns) */}
          {counterPatternId && counterPatternName && (
            <div className="pt-8 border-t-2 border-[#333]">
              <h3 className="font-anton text-[16px] tracking-wide text-white mb-4">
                DEPLOY INSTEAD:
              </h3>
              <div className="bg-[#0A0A0A] border-2 border-[#FFDE59] p-6">
                <h4 className="font-anton text-xl tracking-wide text-[#FFDE59] mb-3">
                  {counterPatternName}
                </h4>
                <p className="text-[13px] leading-relaxed text-white mb-5">
                  {counterPatternSummary}
                </p>
                <button className="bg-[#E51B23] border-2 border-[#E51B23] text-white py-3.5 px-6 font-anton text-[12px] tracking-wider hover:bg-[#FF2930] hover:border-[#FF2930] transition-all w-full text-center">
                  LEARN THIS PATTERN →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatternDetailModal;
