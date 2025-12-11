'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// ============================================
// DATA CONTRACTS
// ============================================

interface ExecutiveSummary {
  score: number;
  grade: string;
  one_line_snapshot: string;
  top_wins: Array<{ pattern: string; why: string }>;
  top_misses: Array<{ pattern: string; impact: string }>;
  one_thing_to_fix: string;
}

interface DetectedMicro {
  micro_id: string;
  micro_name: string;
  confidence: number;
  evidence: Array<{ quote: string; timestamp: string }>;
}

interface DetectedPattern {
  macro_id: string;
  macro_name: string;
  category: "connection" | "diagnosis" | "control" | "activation";
  polarity: "positive" | "negative";
  strength?: "STRONG" | "MEDIUM" | "DEVELOPING";
  severity?: "HIGH" | "MEDIUM" | "LOW";
  detected_micros: DetectedMicro[];
  macro_summary: string;
  why_it_worked?: string;
  how_to_reuse?: string;
  fix?: string;
  counter_pattern_id?: string;
}

interface ScoreBreakdown {
  overall: number;
  trust_velocity: number;
  discovery_depth: number;
  momentum_control: number;
  close_discipline: number;
}

interface NextStep {
  action: string;
  why: string;
  by_when: string;
}

interface FrameworkSpotlight {
  wtf_method_overview: string;
  connection_score: number;
  diagnosis_score: number;
  control_score: number;
  activation_score: number;
}

interface TacticalRewrite {
  moment: string;
  timestamp: string;
  what_you_said: string;
  what_to_say_instead: string;
  why_it_works: string;
}

interface ProgressTracker {
  calls_analyzed: number;
  current_win_streak: number;
  biggest_improvement: string;
  signature_move: string;
}

interface CallLabProData {
  call_metadata: {
    buyer_name: string;
    company: string;
    duration: string;
    date: string;
  };
  executive_summary: ExecutiveSummary;
  score_breakdown: ScoreBreakdown;
  positive_patterns: DetectedPattern[];
  negative_patterns: DetectedPattern[];
  next_steps: NextStep[];
  framework_spotlight: FrameworkSpotlight;
  tactical_rewrites: TacticalRewrite[];
  progress_tracker: ProgressTracker;
  follow_up_email: string;
}

// Legacy interface for backward compatibility
interface CallLabProReportProps {
  content?: string;
  data?: CallLabProData;
}

// ============================================
// COUNTER PATTERN DATA
// ============================================

const COUNTER_PATTERNS: Record<string, { name: string; summary: string }> = {
  framework_drop: {
    name: "The Framework Drop",
    summary: "Use a clear framework to structure the conversation and keep control."
  },
  cultural_handshake: {
    name: "The Cultural Handshake",
    summary: "Start with warmth and shared context before business talk."
  },
  diagnostic_reveal: {
    name: "The Diagnostic Reveal",
    summary: "Dig deeper into the problem before offering solutions."
  },
  self_diagnosis_pull: {
    name: "The Self Diagnosis Pull",
    summary: "Help buyers discover their own needs through questions."
  },
  permission_builder: {
    name: "The Permission Builder",
    summary: "Ask permission before shifting topics or going deeper."
  },
  mirror_close: {
    name: "The Mirror Close",
    summary: "Reflect the buyer's criteria back and ask for the decision."
  },
  intentional_silence: {
    name: "The Intentional Silence",
    summary: "Use strategic pauses to create space for the buyer to think."
  },
  pre_handle: {
    name: "The Pre-Handle",
    summary: "Address common objections before they're raised."
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    connection: "#FFDE59",
    diagnosis: "#4A90E2",
    control: "#FF8C42",
    activation: "#E51B23"
  };
  return colors[category] || "#666666";
}

function getScoreGrade(score: number): string {
  if (score >= 80) return "STRONG";
  if (score >= 60) return "DEVELOPING";
  return "NEEDS WORK";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#FFDE59";
  if (score >= 60) return "#4A90E2";
  return "#E51B23";
}

// ============================================
// LEGACY PARSER (for backward compatibility)
// ============================================

function parseMarkdownToData(content: string): CallLabProData {
  // Extract basic info
  const callMatch = content.match(/\*\*Call:\*\*\s*([^\n]+)/);
  const durationMatch = content.match(/\*\*Duration:\*\*\s*([^\n]+)/);
  const scoreMatch = content.match(/\*\*(?:Overall )?Score:\*\*\s*(\d+(?:\.\d+)?)/i);
  const profileMatch = content.match(/\*\*(?:Sales )?Dynamics Profile:\*\*\s*([^\n]+)/i);

  const score = scoreMatch ? parseFloat(scoreMatch[1]) * 10 : 0;

  // Extract exec summary
  const execSummaryMatch = content.match(/Executive Summary[:\s]*\n+([^\n#]+(?:\n[^\n#]+)*)/i);

  // Extract positive patterns
  const positivePatterns: DetectedPattern[] = [];
  const strengthsSection = content.match(/\*\*STRENGTHS DETECTED\*\*([\s\S]*?)(?=\*\*FRICTION DETECTED|$)/i);
  if (strengthsSection) {
    const patternBlocks = strengthsSection[1].split(/(?=[-•]\s*\*\*The )/);
    patternBlocks.forEach(block => {
      const nameMatch = block.match(/\*\*([^*]+)\*\*\s*\(([^)]+)\)/);
      if (nameMatch) {
        const strengthMatch = block.match(/Strength[:\s]*(STRONG|MEDIUM|DEVELOPING)/i);
        const appearedMatch = block.match(/How it appeared[:\s]*([^\n]+)/i);
        const whyMatch = block.match(/Why it worked[:\s]*([^\n]+)/i);
        const evidenceMatch = block.match(/Evidence[:\s]*"([^"]+)"/i);
        const replicateMatch = block.match(/How to replicate[:\s]*([^\n]+)/i);

        positivePatterns.push({
          macro_id: nameMatch[1].toLowerCase().replace(/\s+/g, '_').replace(/^the_/, ''),
          macro_name: nameMatch[1].trim(),
          category: nameMatch[2].toLowerCase() as "connection" | "diagnosis" | "control" | "activation",
          polarity: "positive",
          strength: (strengthMatch?.[1]?.toUpperCase() || "MEDIUM") as "STRONG" | "MEDIUM" | "DEVELOPING",
          detected_micros: evidenceMatch ? [{
            micro_id: "evidence",
            micro_name: "Evidence",
            confidence: 0.9,
            evidence: [{ quote: evidenceMatch[1], timestamp: "" }]
          }] : [],
          macro_summary: appearedMatch?.[1] || "",
          why_it_worked: whyMatch?.[1] || "",
          how_to_reuse: replicateMatch?.[1] || "",
        });
      }
    });
  }

  // Extract negative patterns
  const negativePatterns: DetectedPattern[] = [];
  const frictionSection = content.match(/\*\*FRICTION DETECTED\*\*([\s\S]*?)(?=(?:6\.|7\.|##\s*TACTICAL|$))/i);
  if (frictionSection) {
    const patternBlocks = frictionSection[1].split(/(?=[-•]\s*\*\*The )/);
    patternBlocks.forEach(block => {
      const nameMatch = block.match(/\*\*([^*]+)\*\*\s*\(([^)]+)\)/);
      if (nameMatch) {
        const severityMatch = block.match(/Severity[:\s]*(HIGH|MEDIUM|LOW)/i);
        const appearedMatch = block.match(/How it appeared[:\s]*([^\n]+)/i);
        const hurtMatch = block.match(/Why it hurt[:\s]*([^\n]+)/i);
        const evidenceMatch = block.match(/Evidence[:\s]*"([^"]+)"/i);
        const fixMatch = block.match(/Fix[:\s]*([^\n]+)/i);
        const counterMatch = block.match(/→\s*COUNTER[^:]*:\s*\*?\*?([^*\n-]+)\*?\*?\s*[-–]\s*([^\n]+)/i);

        const patternId = nameMatch[1].toLowerCase().replace(/\s+/g, '_').replace(/^the_/, '');

        negativePatterns.push({
          macro_id: patternId,
          macro_name: nameMatch[1].trim(),
          category: nameMatch[2].toLowerCase() as "connection" | "diagnosis" | "control" | "activation",
          polarity: "negative",
          severity: (severityMatch?.[1]?.toUpperCase() || "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
          detected_micros: evidenceMatch ? [{
            micro_id: "evidence",
            micro_name: "Evidence",
            confidence: 0.9,
            evidence: [{ quote: evidenceMatch[1], timestamp: "" }]
          }] : [],
          macro_summary: appearedMatch?.[1] || hurtMatch?.[1] || "",
          fix: fixMatch?.[1] || "",
          counter_pattern_id: counterMatch ? counterMatch[1].toLowerCase().replace(/\s+/g, '_').replace(/^the_/, '') : getCounterPatternId(patternId),
        });
      }
    });
  }

  // Extract tactical rewrites
  const tacticalRewrites: TacticalRewrite[] = [];
  const tacticalSection = content.match(/(?:6\.|##)\s*TACTICAL MOMENT REWRITE([\s\S]*?)(?=(?:7\.|##\s*NEXT|$))/i);
  if (tacticalSection) {
    const rewriteBlocks = tacticalSection[1].split(/###\s*/);
    rewriteBlocks.forEach(block => {
      if (block.includes('What happened') || block.includes('Pro rewrite')) {
        const contextMatch = block.match(/^([^\n]+)/);
        const happenedMatch = block.match(/What happened[:\s]*"([^"]+)"/i);
        const missedMatch = block.match(/Why it missed[:\s]*([^\n]+)/i);
        const proMatch = block.match(/(?:Pro rewrite|Try this)[:\s]*"([^"]+)"/i);

        if (happenedMatch || proMatch) {
          tacticalRewrites.push({
            moment: contextMatch?.[1]?.trim() || "",
            timestamp: "",
            what_you_said: happenedMatch?.[1] || "",
            what_to_say_instead: proMatch?.[1] || "",
            why_it_works: missedMatch?.[1] || "",
          });
        }
      }
    });
  }

  // Extract next steps
  const nextSteps: NextStep[] = [];
  const blueprintSection = content.match(/(?:7\.|##)\s*NEXT[- ]CALL BLUEPRINT([\s\S]*?)(?=(?:8\.|##\s*PERFORMANCE|$))/i);
  if (blueprintSection) {
    const steps = blueprintSection[1].matchAll(/[-•\d.]\s*([^\n]+)/g);
    let i = 0;
    for (const step of steps) {
      if (step[1].trim() && i < 3) {
        nextSteps.push({
          action: step[1].trim(),
          why: "Build on your momentum",
          by_when: i === 0 ? "Next call" : i === 1 ? "This week" : "Ongoing"
        });
        i++;
      }
    }
  }

  // Extract bottom line
  const bottomSection = content.match(/(?:9\.|##)\s*BOTTOM LINE INSIGHT([\s\S]*?)(?=(?:10\.|##\s*PRO VALUE|$))/i);
  const bottomLine = bottomSection ? bottomSection[1].trim().replace(/^["']|["']$/g, '') : "";

  // Build call info from matches
  const buyerCompany = callMatch?.[1]?.split(/→|with/i) || ["Unknown", "Unknown"];

  return {
    call_metadata: {
      buyer_name: buyerCompany[0]?.trim() || "Unknown",
      company: buyerCompany[1]?.trim() || "Unknown",
      duration: durationMatch?.[1]?.trim() || "N/A",
      date: new Date().toLocaleDateString(),
    },
    executive_summary: {
      score: Math.round(score),
      grade: getScoreGrade(score),
      one_line_snapshot: execSummaryMatch?.[1]?.trim() || profileMatch?.[1]?.trim() || "",
      top_wins: positivePatterns.slice(0, 2).map(p => ({
        pattern: p.macro_name,
        why: p.why_it_worked || p.macro_summary
      })),
      top_misses: negativePatterns.slice(0, 2).map(p => ({
        pattern: p.macro_name,
        impact: p.macro_summary
      })),
      one_thing_to_fix: negativePatterns[0]?.fix || bottomLine || "Focus on closing with clarity",
    },
    score_breakdown: {
      overall: Math.round(score),
      trust_velocity: Math.round(score * 0.9),
      discovery_depth: Math.round(score * 0.85),
      momentum_control: Math.round(score * 0.95),
      close_discipline: Math.round(score * 0.8),
    },
    positive_patterns: positivePatterns,
    negative_patterns: negativePatterns,
    next_steps: nextSteps.length > 0 ? nextSteps : [
      { action: "Review this report before your next call", why: "Preparation builds confidence", by_when: "Next call" }
    ],
    framework_spotlight: {
      wtf_method_overview: "The WTF Method combines Connection, Diagnosis, Control, and Activation to build trust while maintaining momentum toward close.",
      connection_score: Math.round(score * (positivePatterns.some(p => p.category === "connection") ? 1.1 : 0.8)),
      diagnosis_score: Math.round(score * (positivePatterns.some(p => p.category === "diagnosis") ? 1.1 : 0.85)),
      control_score: Math.round(score * (positivePatterns.some(p => p.category === "control") ? 1.1 : 0.9)),
      activation_score: Math.round(score * (positivePatterns.some(p => p.category === "activation") ? 1.1 : 0.75)),
    },
    tactical_rewrites: tacticalRewrites,
    progress_tracker: {
      calls_analyzed: 1,
      current_win_streak: score >= 70 ? 1 : 0,
      biggest_improvement: positivePatterns[0]?.macro_name || "Building foundation",
      signature_move: positivePatterns.find(p => p.strength === "STRONG")?.macro_name || "Developing your style",
    },
    follow_up_email: generateFollowUpEmail(callMatch?.[1] || "the prospect", positivePatterns, nextSteps),
  };
}

function getCounterPatternId(patternId: string): string {
  const counters: Record<string, string> = {
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
  return counters[patternId] || "framework_drop";
}

function generateFollowUpEmail(buyer: string, wins: DetectedPattern[], steps: NextStep[]): string {
  return `Hi ${buyer.split(/→|with/i)[0]?.trim() || "there"},

Thanks for taking the time to connect today. I appreciated learning more about your situation.

Based on our conversation, here's what I'm thinking as next steps:
${steps.map((s, i) => `${i + 1}. ${s.action}`).join('\n')}

Let me know if you have any questions, and I'll follow up ${steps[0]?.by_when?.toLowerCase() || "soon"}.

Best,
[Your name]`;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CallLabProReport({ content, data: providedData }: CallLabProReportProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Use provided data or parse from content
  const data: CallLabProData = providedData || (content ? parseMarkdownToData(content) : {
    call_metadata: { buyer_name: "Unknown", company: "Unknown", duration: "N/A", date: "N/A" },
    executive_summary: { score: 0, grade: "N/A", one_line_snapshot: "", top_wins: [], top_misses: [], one_thing_to_fix: "" },
    score_breakdown: { overall: 0, trust_velocity: 0, discovery_depth: 0, momentum_control: 0, close_discipline: 0 },
    positive_patterns: [],
    negative_patterns: [],
    next_steps: [],
    framework_spotlight: { wtf_method_overview: "", connection_score: 0, diagnosis_score: 0, control_score: 0, activation_score: 0 },
    tactical_rewrites: [],
    progress_tracker: { calls_analyzed: 0, current_win_streak: 0, biggest_improvement: "", signature_move: "" },
    follow_up_email: "",
  });

  return (
    <div className="bg-black min-h-screen text-white font-poppins">
      {/* Header */}
      <Header metadata={data.call_metadata} score={data.executive_summary.score} />

      {/* Executive Summary */}
      <ExecutiveSummarySection summary={data.executive_summary} />

      {/* Score Breakdown */}
      <ScoreBreakdownSection scores={data.score_breakdown} />

      {/* What You're Doing Right */}
      <PositivePatternsSection patterns={data.positive_patterns} />

      {/* Patterns to Watch */}
      <NegativePatternsSection patterns={data.negative_patterns} />

      {/* Next Steps */}
      <NextStepsSection steps={data.next_steps} />

      {/* Sales Framework Analysis */}
      <FrameworkSpotlightSection framework={data.framework_spotlight} />

      {/* Tactical Rewrites */}
      <TacticalRewritesSection rewrites={data.tactical_rewrites} />

      {/* Progress Tracker */}
      <ProgressTrackerSection tracker={data.progress_tracker} />

      {/* Follow-Up Email */}
      <FollowUpEmailSection
        email={data.follow_up_email}
        copied={copiedEmail}
        onCopy={() => {
          navigator.clipboard.writeText(data.follow_up_email);
          setCopiedEmail(true);
          setTimeout(() => setCopiedEmail(false), 2000);
        }}
      />

      {/* Footer CTA */}
      <FooterCTA />
    </div>
  );
}

// ============================================
// HEADER
// ============================================

function Header({ metadata, score }: {
  metadata: CallLabProData['call_metadata'];
  score: number;
}) {
  return (
    <header className="bg-[#1A1A1A] border-b-[3px] border-[#E51B23] px-12 py-8">
      <div className="text-[10px] text-[#999] tracking-[1.5px] mb-4">
        SYS_READY <span className="text-[#E51B23]">●</span> ANALYSIS COMPLETE
      </div>

      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-anton text-[52px] tracking-[3px] leading-none">CALL LAB PRO</h1>
          <div className="text-[11px] text-[#666] tracking-[3px] mt-2">FULL DIAGNOSTIC</div>
        </div>
        <div className="font-anton text-[80px] text-[#FFDE59] leading-none">{score}</div>
      </div>

      <div className="text-[12px] text-[#999]">
        <span className="text-[#FFDE59]">{metadata.buyer_name} → {metadata.company}</span>
        <span className="mx-4 text-[#666]">|</span>
        <span>{metadata.duration}</span>
        <span className="mx-4 text-[#666]">|</span>
        <span>{metadata.date}</span>
      </div>
    </header>
  );
}

// ============================================
// EXECUTIVE SUMMARY
// ============================================

function ExecutiveSummarySection({ summary }: { summary: ExecutiveSummary }) {
  return (
    <section className="bg-[#0A0A0A] p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        ⚡ EXECUTIVE SUMMARY
      </h2>

      <div className="grid grid-cols-[200px_1fr] gap-8 mb-8">
        {/* Score Hero */}
        <div className="bg-[#1A1A1A] border-[3px] border-[#E51B23] p-8 text-center">
          <div className="font-anton text-[72px] leading-none">{summary.score}</div>
          <div
            className="text-[14px] font-bold tracking-[2px] mt-3"
            style={{ color: getScoreColor(summary.score) }}
          >
            {summary.grade}
          </div>
        </div>

        {/* Snapshot */}
        <div className="bg-[#1A1A1A] border-2 border-[#333] p-8">
          <div className="text-[10px] font-bold tracking-[2px] text-[#666] mb-3">ONE-LINE SNAPSHOT</div>
          <p className="text-[16px] leading-[1.6]">{summary.one_line_snapshot || "Analysis complete. Review your patterns below."}</p>
        </div>
      </div>

      {/* Wins and Misses */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-[12px] font-bold tracking-[2px] text-[#FFDE59] mb-4">✓ TOP 2 WINS</h3>
          {summary.top_wins.map((win, i) => (
            <div key={i} className="bg-[#1A1A1A] border-2 border-[#333] border-l-4 border-l-[#FFDE59] p-4 mb-3">
              <div className="text-[14px] font-bold mb-1">{win.pattern}</div>
              <div className="text-[12px] text-[#999] leading-[1.5]">{win.why}</div>
            </div>
          ))}
          {summary.top_wins.length === 0 && (
            <div className="bg-[#1A1A1A] border-2 border-[#333] p-4 text-[#666] text-sm">
              No strong positive patterns detected
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[12px] font-bold tracking-[2px] text-[#E51B23] mb-4">! TOP 2 MISSES</h3>
          {summary.top_misses.map((miss, i) => (
            <div key={i} className="bg-[#1A1A1A] border-2 border-[#333] border-l-4 border-l-[#E51B23] p-4 mb-3">
              <div className="text-[14px] font-bold mb-1">{miss.pattern}</div>
              <div className="text-[12px] text-[#999] leading-[1.5]">{miss.impact}</div>
            </div>
          ))}
          {summary.top_misses.length === 0 && (
            <div className="bg-[#1A1A1A] border-2 border-[#333] p-4 text-[#666] text-sm">
              No significant friction patterns detected
            </div>
          )}
        </div>
      </div>

      {/* One Thing to Fix */}
      {summary.one_thing_to_fix && (
        <div className="bg-[#E51B23] border-[3px] border-[#E51B23] px-8 py-6">
          <div className="text-[10px] font-bold tracking-[2px] mb-3">THE ONE THING TO FIX</div>
          <div className="text-[16px] font-semibold leading-[1.5]">{summary.one_thing_to_fix}</div>
        </div>
      )}
    </section>
  );
}

// ============================================
// SCORE BREAKDOWN
// ============================================

function ScoreBreakdownSection({ scores }: { scores: ScoreBreakdown }) {
  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        📊 SCORE BREAKDOWN
      </h2>

      <div className="grid grid-cols-5 gap-4">
        <ScoreCard label="OVERALL" value={scores.overall} />
        <ScoreCard label="TRUST VELOCITY" value={scores.trust_velocity} />
        <ScoreCard label="DISCOVERY DEPTH" value={scores.discovery_depth} />
        <ScoreCard label="MOMENTUM CONTROL" value={scores.momentum_control} />
        <ScoreCard label="CLOSE DISCIPLINE" value={scores.close_discipline} />
      </div>
    </section>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1A1A1A] border-2 border-[#333] p-6 text-center">
      <div className="text-[10px] font-bold tracking-[1.5px] text-[#666] mb-4">{label}</div>
      <div
        className="font-anton text-[48px] leading-none mb-2"
        style={{ color: getScoreColor(value) }}
      >
        {value}
      </div>
      <div className="text-[11px] font-bold tracking-[1px] text-[#999]">{getScoreGrade(value)}</div>
    </div>
  );
}

// ============================================
// POSITIVE PATTERNS
// ============================================

function PositivePatternsSection({ patterns }: { patterns: DetectedPattern[] }) {
  if (patterns.length === 0) return null;

  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        ✓ WHAT YOU&apos;RE DOING RIGHT
      </h2>

      {patterns.map(pattern => (
        <div key={pattern.macro_id} className="bg-[#1A1A1A] border-2 border-[#333] border-l-[6px] border-l-[#FFDE59] p-8 mb-6">
          {/* Pattern Header */}
          <div className="mb-5 pb-5 border-b-2 border-[#333]">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-anton text-[22px] tracking-[1px] flex-1">{pattern.macro_name}</h3>
              <span
                className="px-3 py-1.5 text-[9px] font-bold tracking-[1.5px] text-black"
                style={{ backgroundColor: getCategoryColor(pattern.category) }}
              >
                {pattern.category.toUpperCase()}
              </span>
              {pattern.strength && (
                <span className="px-3 py-1.5 text-[9px] font-bold tracking-[1.5px] bg-[#0A0A0A] border border-[#333]">
                  {pattern.strength}
                </span>
              )}
            </div>

            {pattern.detected_micros.length > 0 && (
              <div className="text-[11px] text-[#999]">
                <span className="font-bold tracking-[1px] text-[#666]">DETECTED:</span> {pattern.detected_micros[0].micro_name}
              </div>
            )}
          </div>

          {/* Pattern Summary */}
          <div className="text-[14px] leading-[1.7] mb-5">{pattern.macro_summary}</div>

          {/* Evidence */}
          {pattern.detected_micros[0]?.evidence && pattern.detected_micros[0].evidence.length > 0 && (
            <div className="bg-[#0A0A0A] border-l-[3px] border-[#666] p-5 mb-5">
              {pattern.detected_micros[0].evidence.slice(0, 2).map((ev, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  {ev.timestamp && (
                    <span className="text-[10px] font-bold tracking-[1px] text-[#666] block mb-1">{ev.timestamp}</span>
                  )}
                  <span className="text-[13px] text-[#999] italic leading-[1.6]">&ldquo;{ev.quote}&rdquo;</span>
                </div>
              ))}
            </div>
          )}

          {/* Why It Worked */}
          {pattern.why_it_worked && (
            <div className="bg-[#0A0A0A] border-l-[3px] border-[#FFDE59] p-4 mb-4">
              <div className="text-[10px] font-bold tracking-[1.5px] text-[#FFDE59] mb-2">WHY IT WORKED:</div>
              <div className="text-[13px] leading-[1.6]">{pattern.why_it_worked}</div>
            </div>
          )}

          {/* How to Reuse */}
          {pattern.how_to_reuse && (
            <div className="bg-[#0A0A0A] border-l-[3px] border-[#FFDE59] p-4">
              <div className="text-[10px] font-bold tracking-[1.5px] text-[#FFDE59] mb-2">HOW TO REUSE:</div>
              <div className="text-[13px] leading-[1.6]">{pattern.how_to_reuse}</div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

// ============================================
// NEGATIVE PATTERNS
// ============================================

function NegativePatternsSection({ patterns }: { patterns: DetectedPattern[] }) {
  if (patterns.length === 0) return null;

  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        ⚠ PATTERNS TO WATCH
      </h2>

      {patterns.map(pattern => (
        <div key={pattern.macro_id}>
          {/* Negative Pattern */}
          <div className="bg-[#1A1A1A] border-2 border-[#333] border-l-[6px] border-l-[#E51B23] p-8 mb-4">
            {/* Pattern Header */}
            <div className="mb-5 pb-5 border-b-2 border-[#333]">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-anton text-[22px] tracking-[1px] flex-1">{pattern.macro_name}</h3>
                <span
                  className="px-3 py-1.5 text-[9px] font-bold tracking-[1.5px] text-black"
                  style={{ backgroundColor: getCategoryColor(pattern.category) }}
                >
                  {pattern.category.toUpperCase()}
                </span>
                {pattern.severity && (
                  <span className="px-3 py-1.5 text-[9px] font-bold tracking-[1.5px] bg-[#0A0A0A] border border-[#333]">
                    {pattern.severity}
                  </span>
                )}
              </div>

              {pattern.detected_micros.length > 0 && (
                <div className="text-[11px] text-[#999]">
                  <span className="font-bold tracking-[1px] text-[#666]">DETECTED:</span> {pattern.detected_micros[0].micro_name}
                </div>
              )}
            </div>

            {/* Pattern Summary */}
            <div className="text-[14px] leading-[1.7] mb-5">{pattern.macro_summary}</div>

            {/* Evidence */}
            {pattern.detected_micros[0]?.evidence && pattern.detected_micros[0].evidence.length > 0 && (
              <div className="bg-[#0A0A0A] border-l-[3px] border-[#666] p-5 mb-5">
                {pattern.detected_micros[0].evidence.slice(0, 2).map((ev, i) => (
                  <div key={i} className="mb-4 last:mb-0">
                    {ev.timestamp && (
                      <span className="text-[10px] font-bold tracking-[1px] text-[#666] block mb-1">{ev.timestamp}</span>
                    )}
                    <span className="text-[13px] text-[#999] italic leading-[1.6]">&ldquo;{ev.quote}&rdquo;</span>
                  </div>
                ))}
              </div>
            )}

            {/* Fix */}
            {pattern.fix && (
              <div className="bg-[#0A0A0A] border-l-[3px] border-[#E51B23] p-4">
                <div className="text-[10px] font-bold tracking-[1.5px] text-[#E51B23] mb-2">FIX:</div>
                <div className="text-[13px] leading-[1.6]">{pattern.fix}</div>
              </div>
            )}
          </div>

          {/* Counter Pattern */}
          {pattern.counter_pattern_id && (
            <CounterPattern counterId={pattern.counter_pattern_id} />
          )}
        </div>
      ))}
    </section>
  );
}

function CounterPattern({ counterId }: { counterId: string }) {
  const counterPattern = COUNTER_PATTERNS[counterId] || {
    name: "The Framework Drop",
    summary: "Use a clear framework to structure the conversation and keep control."
  };

  return (
    <div className="ml-10 mb-8">
      <div className="text-[12px] font-bold tracking-[1px] text-[#666] mb-3">
        ↔️ COUNTER WITH
      </div>
      <div className="bg-[#0A0A0A] border-2 border-[#FFDE59] border-l-[6px] p-5 flex items-start gap-4">
        <div className="text-[24px] text-[#FFDE59]">✓</div>
        <div>
          <h4 className="font-anton text-[18px] tracking-[1px] text-[#FFDE59] mb-2">{counterPattern.name}</h4>
          <p className="text-[13px] leading-[1.6]">{counterPattern.summary}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// NEXT STEPS
// ============================================

function NextStepsSection({ steps }: { steps: NextStep[] }) {
  if (steps.length === 0) return null;

  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        🎯 NEXT STEPS
      </h2>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="bg-[#1A1A1A] border-2 border-[#333] border-l-[6px] border-l-[#E51B23] p-6 flex gap-6">
            <div className="font-anton text-[48px] text-[#E51B23] leading-none">{i + 1}</div>
            <div className="flex-1">
              <div className="text-[16px] font-bold mb-3">{step.action}</div>
              <div className="text-[12px] text-[#999] leading-[1.6] mb-1">
                <span className="font-bold tracking-[1px] text-[#666]">WHY:</span> {step.why}
              </div>
              <div className="text-[12px] text-[#999] leading-[1.6]">
                <span className="font-bold tracking-[1px] text-[#666]">BY WHEN:</span> {step.by_when}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// FRAMEWORK SPOTLIGHT
// ============================================

function FrameworkSpotlightSection({ framework }: { framework: FrameworkSpotlight }) {
  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        📐 SALES FRAMEWORK ANALYSIS
      </h2>

      {/* WTF Method Hero Box */}
      <div className="bg-[#E51B23] border-[3px] border-[#E51B23] px-10 py-8 mb-8">
        <div className="font-anton text-[24px] tracking-[2px] mb-4">THE WTF METHOD</div>
        <p className="text-[14px] leading-[1.7]">{framework.wtf_method_overview}</p>
      </div>

      {/* Four Pillars */}
      <div className="grid grid-cols-4 gap-4">
        <FrameworkPillar
          title="CONNECTION"
          score={framework.connection_score}
          color="#FFDE59"
        />
        <FrameworkPillar
          title="DIAGNOSIS"
          score={framework.diagnosis_score}
          color="#4A90E2"
        />
        <FrameworkPillar
          title="CONTROL"
          score={framework.control_score}
          color="#FF8C42"
        />
        <FrameworkPillar
          title="ACTIVATION"
          score={framework.activation_score}
          color="#E51B23"
        />
      </div>
    </section>
  );
}

function FrameworkPillar({ title, score, color }: {
  title: string;
  score: number;
  color: string;
}) {
  return (
    <div
      className="bg-[#1A1A1A] border-2 border-[#333] border-t-[6px] p-8 text-center"
      style={{ borderTopColor: color }}
    >
      <div className="font-anton text-[16px] tracking-[2px] mb-5" style={{ color }}>{title}</div>
      <div className="font-anton text-[56px] leading-none mb-2" style={{ color }}>{score}</div>
      <div className="text-[11px] font-bold tracking-[1px] text-[#666]">{getScoreGrade(score)}</div>
    </div>
  );
}

// ============================================
// TACTICAL REWRITES
// ============================================

function TacticalRewritesSection({ rewrites }: { rewrites: TacticalRewrite[] }) {
  if (rewrites.length === 0) return null;

  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        💬 TACTICAL REWRITES
      </h2>

      {rewrites.map((rewrite, i) => (
        <div key={i} className="bg-[#1A1A1A] border-2 border-[#333] p-8 mb-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#333]">
            <div className="text-[14px] font-bold text-[#FFDE59]">{rewrite.moment}</div>
            {rewrite.timestamp && (
              <div className="text-[11px] text-[#666]">{rewrite.timestamp}</div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-6 mb-6">
            <div className="bg-[#0A0A0A] border-2 border-[#333] border-l-[6px] border-l-[#E51B23] p-5">
              <div className="text-[10px] font-bold tracking-[1.5px] text-[#666] mb-3">WHAT YOU SAID:</div>
              <div className="text-[13px] italic leading-[1.6]">&ldquo;{rewrite.what_you_said}&rdquo;</div>
            </div>

            <div className="text-[32px] text-[#666] flex items-center">→</div>

            <div className="bg-[#0A0A0A] border-2 border-[#333] border-l-[6px] border-l-[#FFDE59] p-5">
              <div className="text-[10px] font-bold tracking-[1.5px] text-[#666] mb-3">SAY THIS INSTEAD:</div>
              <div className="text-[13px] italic leading-[1.6]">&ldquo;{rewrite.what_to_say_instead}&rdquo;</div>
            </div>
          </div>

          {rewrite.why_it_works && (
            <div className="text-[12px] text-[#999] leading-[1.6]">
              <span className="font-bold tracking-[1px] text-[#FFDE59]">WHY IT WORKS:</span> {rewrite.why_it_works}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

// ============================================
// PROGRESS TRACKER
// ============================================

function ProgressTrackerSection({ tracker }: { tracker: ProgressTracker }) {
  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        📈 PROGRESS TRACKER
      </h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border-2 border-[#333] p-8 text-center">
          <div className="font-anton text-[56px] text-[#FFDE59] leading-none mb-3">{tracker.calls_analyzed}</div>
          <div className="text-[10px] font-bold tracking-[1.5px] text-[#666]">CALLS ANALYZED</div>
        </div>

        <div className="bg-[#1A1A1A] border-2 border-[#333] p-8 text-center">
          <div className="font-anton text-[56px] text-[#FFDE59] leading-none mb-3">{tracker.current_win_streak}</div>
          <div className="text-[10px] font-bold tracking-[1.5px] text-[#666]">WIN STREAK</div>
        </div>

        <div className="bg-[#1A1A1A] border-2 border-[#333] p-8 text-center col-span-2">
          <div className="text-[10px] font-bold tracking-[1.5px] text-[#666] mb-3">BIGGEST IMPROVEMENT</div>
          <div className="text-[14px] font-semibold leading-[1.4]">{tracker.biggest_improvement || "Keep analyzing calls"}</div>
        </div>

        <div className="bg-[#1A1A1A] border-2 border-[#333] p-8 text-center col-span-4">
          <div className="text-[10px] font-bold tracking-[1.5px] text-[#666] mb-3">YOUR SIGNATURE MOVE</div>
          <div className="text-[14px] font-semibold leading-[1.4]">{tracker.signature_move || "Developing your style"}</div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FOLLOW-UP EMAIL
// ============================================

function FollowUpEmailSection({ email, copied, onCopy }: { email: string; copied: boolean; onCopy: () => void }) {
  if (!email) return null;

  return (
    <section className="p-12 border-b-2 border-[#333]">
      <h2 className="font-anton text-[28px] tracking-[2px] text-[#E51B23] mb-8 pb-4 border-b-[3px] border-[#E51B23]">
        📧 FOLLOW-UP EMAIL
      </h2>

      <div className="bg-[#1A1A1A] border-2 border-[#333]">
        <div className="bg-[#0A0A0A] border-b-2 border-[#333] px-6 py-4">
          <button
            onClick={onCopy}
            className="bg-[#E51B23] border-2 border-[#E51B23] text-white px-6 py-3 font-anton text-[11px] tracking-[1.5px] hover:bg-[#FF2930] transition-colors"
          >
            {copied ? "✓ COPIED!" : "📋 COPY TO CLIPBOARD"}
          </button>
        </div>

        <div className="p-8 text-[13px] leading-[1.8] whitespace-pre-wrap">{email}</div>
      </div>
    </section>
  );
}

// ============================================
// FOOTER CTA
// ============================================

function FooterCTA() {
  return (
    <div className="bg-[#0A0A0A] border-t-[3px] border-[#E51B23] p-12 text-center">
      <h3 className="font-anton text-[32px] tracking-[2px] mb-4">READY FOR YOUR NEXT CALL?</h3>
      <p className="text-[14px] text-[#999] leading-[1.6] mb-8">
        Use these insights to close better. Review this report before your next discovery call.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-[#E51B23] border-[3px] border-[#E51B23] text-white px-12 py-5 font-anton text-[14px] tracking-[2px] hover:bg-[#FF2930] hover:border-[#FF2930] transition-all hover:-translate-y-0.5"
      >
        BACK TO DASHBOARD
      </Link>
    </div>
  );
}

export default CallLabProReport;
