'use client';

import { useMemo } from 'react';

interface CallLabProReportProps {
  content: string;
}

interface PerformanceScore {
  metric: string;
  score: number;
}

interface PositivePattern {
  name: string;
  category: string;
  strength: 'STRONG' | 'MEDIUM' | 'DEVELOPING';
  howItAppeared: string;
  whyItWorked: string;
  evidence: string;
  howToReplicate: string;
}

interface NegativePattern {
  name: string;
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  howItAppeared: string;
  whyItHurt: string;
  evidence: string;
  fix: string;
  counterName: string;
  counterRationale: string;
}

interface Framework {
  name: string;
  score: number;
  used: string;
  howItHelped: string;
  tacticalNote: string;
}

interface TacticalRewrite {
  context: string;
  whatHappened: string;
  whyItMissed: string;
  proRewrite: string;
  spicierVersion?: string;
}

interface TrustPhase {
  phaseName: string;
  patternName: string;
  whatRepDid: string;
  whatBuyerFelt: string;
  evidence: string;
  alternativeMove?: string;
}

interface ParsedReport {
  // Executive Summary
  callInfo: string;
  duration: string;
  score: number;
  dynamicsProfile: string;
  executiveSummary: string;

  // Scores
  performanceScores: PerformanceScore[];

  // Patterns
  positivePatterns: PositivePattern[];
  negativePatterns: NegativePattern[];

  // Trust Map
  trustPhases: TrustPhase[];

  // Buyer Arc
  buyerArc: string;

  // Frameworks
  frameworks: Framework[];

  // Tactical Rewrites
  tacticalRewrites: TacticalRewrite[];

  // Next Call Blueprint
  nextCallBlueprint: string[];

  // Bottom Line
  bottomLineInsight: string;

  // Raw content fallback
  rawContent: string;
}

function parseReport(content: string): ParsedReport {
  const report: ParsedReport = {
    callInfo: '',
    duration: '',
    score: 0,
    dynamicsProfile: '',
    executiveSummary: '',
    performanceScores: [],
    positivePatterns: [],
    negativePatterns: [],
    trustPhases: [],
    buyerArc: '',
    frameworks: [],
    tacticalRewrites: [],
    nextCallBlueprint: [],
    bottomLineInsight: '',
    rawContent: content,
  };

  // Extract call info from Executive Summary
  const callMatch = content.match(/\*\*Call:\*\*\s*([^\n]+)/);
  if (callMatch) report.callInfo = callMatch[1].trim();

  const durationMatch = content.match(/\*\*Duration:\*\*\s*([^\n]+)/);
  if (durationMatch) report.duration = durationMatch[1].trim();

  const scoreMatch = content.match(/\*\*(?:Overall )?Score:\*\*\s*(\d+(?:\.\d+)?)/i);
  if (scoreMatch) report.score = parseFloat(scoreMatch[1]);

  const profileMatch = content.match(/\*\*(?:Sales )?Dynamics Profile:\*\*\s*([^\n]+)/i);
  if (profileMatch) report.dynamicsProfile = profileMatch[1].trim();

  // Extract Executive Summary paragraph
  const execSummaryMatch = content.match(/Executive Summary[:\s]*\n+([^\n#]+(?:\n[^\n#]+)*)/i);
  if (execSummaryMatch) report.executiveSummary = execSummaryMatch[1].trim();

  // Extract Performance Scores (section 8)
  const scoresSection = content.match(/(?:8\.|##)\s*PERFORMANCE SCORES([\s\S]*?)(?=(?:9\.|##\s*BOTTOM|$))/i);
  if (scoresSection) {
    const scoreLines = scoresSection[1].matchAll(/[-•]\s*([^:]+):\s*(\d+)\/10/g);
    for (const match of scoreLines) {
      report.performanceScores.push({
        metric: match[1].trim(),
        score: parseInt(match[2]) * 10,
      });
    }
  }

  // Extract Positive Patterns (STRENGTHS DETECTED)
  const strengthsSection = content.match(/\*\*STRENGTHS DETECTED\*\*([\s\S]*?)(?=\*\*FRICTION DETECTED|$)/i);
  if (strengthsSection) {
    const patternBlocks = strengthsSection[1].split(/(?=[-•]\s*\*\*The )/);
    patternBlocks.forEach(block => {
      const nameMatch = block.match(/\*\*([^*]+)\*\*\s*\(([^)]+)\)/);
      if (nameMatch) {
        const pattern: PositivePattern = {
          name: nameMatch[1].trim(),
          category: nameMatch[2].trim(),
          strength: 'MEDIUM',
          howItAppeared: '',
          whyItWorked: '',
          evidence: '',
          howToReplicate: '',
        };

        const strengthMatch = block.match(/Strength[:\s]*(STRONG|MEDIUM|DEVELOPING)/i);
        if (strengthMatch) pattern.strength = strengthMatch[1].toUpperCase() as 'STRONG' | 'MEDIUM' | 'DEVELOPING';

        const appearedMatch = block.match(/How it appeared[:\s]*([^\n]+)/i);
        if (appearedMatch) pattern.howItAppeared = appearedMatch[1].trim();

        const whyMatch = block.match(/Why it worked[:\s]*([^\n]+)/i);
        if (whyMatch) pattern.whyItWorked = whyMatch[1].trim();

        const evidenceMatch = block.match(/Evidence[:\s]*"([^"]+)"/i);
        if (evidenceMatch) pattern.evidence = evidenceMatch[1].trim();

        const replicateMatch = block.match(/How to replicate[:\s]*([^\n]+)/i);
        if (replicateMatch) pattern.howToReplicate = replicateMatch[1].trim();

        report.positivePatterns.push(pattern);
      }
    });
  }

  // Extract Negative Patterns (FRICTION DETECTED)
  const frictionSection = content.match(/\*\*FRICTION DETECTED\*\*([\s\S]*?)(?=(?:6\.|7\.|##\s*TACTICAL|$))/i);
  if (frictionSection) {
    const patternBlocks = frictionSection[1].split(/(?=[-•]\s*\*\*The )/);
    patternBlocks.forEach(block => {
      const nameMatch = block.match(/\*\*([^*]+)\*\*\s*\(([^)]+)\)/);
      if (nameMatch) {
        const pattern: NegativePattern = {
          name: nameMatch[1].trim(),
          category: nameMatch[2].trim(),
          severity: 'MEDIUM',
          howItAppeared: '',
          whyItHurt: '',
          evidence: '',
          fix: '',
          counterName: '',
          counterRationale: '',
        };

        const severityMatch = block.match(/Severity[:\s]*(HIGH|MEDIUM|LOW)/i);
        if (severityMatch) pattern.severity = severityMatch[1].toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';

        const appearedMatch = block.match(/How it appeared[:\s]*([^\n]+)/i);
        if (appearedMatch) pattern.howItAppeared = appearedMatch[1].trim();

        const hurtMatch = block.match(/Why it hurt[:\s]*([^\n]+)/i);
        if (hurtMatch) pattern.whyItHurt = hurtMatch[1].trim();

        const evidenceMatch = block.match(/Evidence[:\s]*"([^"]+)"/i);
        if (evidenceMatch) pattern.evidence = evidenceMatch[1].trim();

        const fixMatch = block.match(/Fix[:\s]*([^\n]+)/i);
        if (fixMatch) pattern.fix = fixMatch[1].trim();

        const counterMatch = block.match(/→\s*COUNTER[^:]*:\s*\*?\*?([^*\n-]+)\*?\*?\s*[-–]\s*([^\n]+)/i);
        if (counterMatch) {
          pattern.counterName = counterMatch[1].trim();
          pattern.counterRationale = counterMatch[2].trim();
        }

        report.negativePatterns.push(pattern);
      }
    });
  }

  // Extract Trust Acceleration Map
  const trustSection = content.match(/(?:2\.|##)\s*TRUST ACCELERATION MAP([\s\S]*?)(?=(?:3\.|##\s*BUYER|$))/i);
  if (trustSection) {
    const phaseBlocks = trustSection[1].split(/###\s*/);
    phaseBlocks.forEach(block => {
      if (block.trim()) {
        const phaseMatch = block.match(/^([^\n:]+)/);
        if (phaseMatch) {
          const phase: TrustPhase = {
            phaseName: phaseMatch[1].trim(),
            patternName: '',
            whatRepDid: '',
            whatBuyerFelt: '',
            evidence: '',
            alternativeMove: '',
          };

          const patternMatch = block.match(/Pattern[:\s]*([^\n]+)/i);
          if (patternMatch) phase.patternName = patternMatch[1].trim();

          const repMatch = block.match(/What (?:the )?rep did[:\s]*([^\n]+)/i);
          if (repMatch) phase.whatRepDid = repMatch[1].trim();

          const buyerMatch = block.match(/What (?:the )?buyer felt[:\s]*([^\n]+)/i);
          if (buyerMatch) phase.whatBuyerFelt = buyerMatch[1].trim();

          const evidenceMatch = block.match(/Evidence[:\s]*"([^"]+)"/i);
          if (evidenceMatch) phase.evidence = evidenceMatch[1].trim();

          const altMatch = block.match(/Alternative move[:\s]*([^\n]+)/i);
          if (altMatch) phase.alternativeMove = altMatch[1].trim();

          if (phase.patternName || phase.whatRepDid) {
            report.trustPhases.push(phase);
          }
        }
      }
    });
  }

  // Extract Tactical Rewrites
  const tacticalSection = content.match(/(?:6\.|##)\s*TACTICAL MOMENT REWRITE([\s\S]*?)(?=(?:7\.|##\s*NEXT|$))/i);
  if (tacticalSection) {
    const rewriteBlocks = tacticalSection[1].split(/###\s*/);
    rewriteBlocks.forEach(block => {
      if (block.includes('What happened') || block.includes('Pro rewrite')) {
        const rewrite: TacticalRewrite = {
          context: '',
          whatHappened: '',
          whyItMissed: '',
          proRewrite: '',
        };

        const contextMatch = block.match(/^([^\n]+)/);
        if (contextMatch) rewrite.context = contextMatch[1].trim();

        const happenedMatch = block.match(/What happened[:\s]*"([^"]+)"/i);
        if (happenedMatch) rewrite.whatHappened = happenedMatch[1].trim();

        const missedMatch = block.match(/Why it missed[:\s]*([^\n]+)/i);
        if (missedMatch) rewrite.whyItMissed = missedMatch[1].trim();

        const proMatch = block.match(/(?:Pro rewrite|Try this)[:\s]*"([^"]+)"/i);
        if (proMatch) rewrite.proRewrite = proMatch[1].trim();

        const spicyMatch = block.match(/(?:Spicier|Bolder)[:\s]*"([^"]+)"/i);
        if (spicyMatch) rewrite.spicierVersion = spicyMatch[1].trim();

        if (rewrite.whatHappened || rewrite.proRewrite) {
          report.tacticalRewrites.push(rewrite);
        }
      }
    });
  }

  // Extract Next Call Blueprint
  const blueprintSection = content.match(/(?:7\.|##)\s*NEXT[- ]CALL BLUEPRINT([\s\S]*?)(?=(?:8\.|##\s*PERFORMANCE|$))/i);
  if (blueprintSection) {
    const steps = blueprintSection[1].matchAll(/[-•\d.]\s*([^\n]+)/g);
    for (const step of steps) {
      if (step[1].trim()) {
        report.nextCallBlueprint.push(step[1].trim());
      }
    }
  }

  // Extract Bottom Line Insight
  const bottomSection = content.match(/(?:9\.|##)\s*BOTTOM LINE INSIGHT([\s\S]*?)(?=(?:10\.|##\s*PRO VALUE|$))/i);
  if (bottomSection) {
    report.bottomLineInsight = bottomSection[1].trim().replace(/^["']|["']$/g, '');
  }

  return report;
}

function ScoreBadge({ score }: { score: number }) {
  const displayScore = Math.round(score * 10);
  const getGrade = (s: number) => {
    if (s >= 85) return 'STRONG';
    if (s >= 70) return 'SOLID';
    if (s >= 55) return 'DEVELOPING';
    return 'NEEDS WORK';
  };

  return (
    <div className="flex flex-col items-center justify-center bg-[#FFDE59] rounded-lg px-6 py-4 min-w-[120px]">
      <span className="font-anton text-5xl text-black leading-none">{displayScore}</span>
      <span className="text-xs font-poppins font-semibold text-black uppercase tracking-wider mt-1">SCORE</span>
      <span className="text-xs font-poppins font-bold text-black mt-1">{getGrade(displayScore)}</span>
    </div>
  );
}

function StrengthBadge({ strength }: { strength: string }) {
  const config = {
    STRONG: { icon: '⚡', bg: 'bg-[#FFDE59]', text: 'text-black' },
    MEDIUM: { icon: '◆', bg: 'bg-[#333]', text: 'text-white border border-[#666]' },
    DEVELOPING: { icon: '◇', bg: 'bg-transparent', text: 'text-[#666] border border-[#666]' },
  };
  const c = config[strength as keyof typeof config] || config.MEDIUM;

  return (
    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${c.bg} ${c.text}`}>
      {c.icon} {strength}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    HIGH: 'bg-[#E51B23] text-white',
    MEDIUM: 'bg-[#FF8C42] text-white',
    LOW: 'bg-[#333] text-white border border-[#666]',
  };
  const icons = { HIGH: '⚠️', MEDIUM: '⚠︎', LOW: '⚐' };

  return (
    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${colors[severity as keyof typeof colors] || colors.MEDIUM}`}>
      {icons[severity as keyof typeof icons] || ''} {severity} IMPACT
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Connection: 'bg-blue-600',
    Diagnosis: 'bg-purple-600',
    Control: 'bg-orange-600',
    Activation: 'bg-green-600',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold uppercase rounded ${colors[category] || 'bg-gray-600'} text-white`}>
      {category}
    </span>
  );
}

function PositivePatternCard({ pattern }: { pattern: PositivePattern }) {
  return (
    <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4 rounded-r mb-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#FFDE59]">✓</span>
          <h4 className="font-anton text-lg text-[#FFDE59]">{pattern.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <CategoryBadge category={pattern.category} />
          <StrengthBadge strength={pattern.strength} />
        </div>
      </div>

      {pattern.howItAppeared && (
        <p className="text-sm text-[#B3B3B3] mb-2">
          <strong className="text-white">How it appeared:</strong> {pattern.howItAppeared}
        </p>
      )}

      {pattern.whyItWorked && (
        <p className="text-sm text-[#FFDE59] mb-2">{pattern.whyItWorked}</p>
      )}

      {pattern.evidence && (
        <blockquote className="text-sm text-[#999] italic border-l-2 border-[#333] pl-3 my-3">
          &ldquo;{pattern.evidence}&rdquo;
        </blockquote>
      )}

      {pattern.howToReplicate && (
        <div className="bg-[#0a0a0a] p-3 rounded mt-3">
          <span className="text-xs font-semibold text-[#4CAF50] uppercase">How to Replicate:</span>
          <p className="text-sm text-white mt-1">{pattern.howToReplicate}</p>
        </div>
      )}
    </div>
  );
}

function NegativePatternCard({ pattern }: { pattern: NegativePattern }) {
  return (
    <div className="mb-6">
      <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-4 rounded-r">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#E51B23]">!</span>
            <h4 className="font-anton text-lg text-white">{pattern.name}</h4>
          </div>
          <div className="flex items-center gap-2">
            <CategoryBadge category={pattern.category} />
            <SeverityBadge severity={pattern.severity} />
          </div>
        </div>

        {pattern.howItAppeared && (
          <p className="text-sm text-[#B3B3B3] mb-2">
            <strong className="text-white">How it appeared:</strong> {pattern.howItAppeared}
          </p>
        )}

        {pattern.whyItHurt && (
          <p className="text-sm text-[#E51B23] mb-2">{pattern.whyItHurt}</p>
        )}

        {pattern.evidence && (
          <blockquote className="text-sm text-[#999] italic border-l-2 border-[#E51B23] pl-3 my-3">
            &ldquo;{pattern.evidence}&rdquo;
          </blockquote>
        )}

        {pattern.fix && (
          <div className="bg-[#0a0a0a] p-3 rounded mt-3 border-l-4 border-[#E51B23]">
            <span className="text-xs font-semibold text-[#E51B23] uppercase">Fix:</span>
            <p className="text-sm text-white mt-1">{pattern.fix}</p>
          </div>
        )}
      </div>

      {/* Counter Pattern */}
      {pattern.counterName && (
        <div className="ml-4 mt-2">
          <div className="flex items-center gap-2 text-[#666] text-sm mb-2">
            <span>↔️</span>
            <span className="font-semibold">COUNTER WITH</span>
          </div>
          <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-3 rounded-r">
            <h5 className="text-[#FFDE59] font-bold text-sm">✓ {pattern.counterName}</h5>
            <p className="text-xs text-[#B3B3B3] mt-1">{pattern.counterRationale}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TacticalRewriteCard({ rewrite }: { rewrite: TacticalRewrite }) {
  return (
    <div className="mb-6">
      {rewrite.context && (
        <h4 className="font-anton text-lg text-white mb-3">{rewrite.context}</h4>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] border border-[#E51B23] p-4 rounded">
          <span className="text-xs font-semibold text-[#E51B23] uppercase block mb-2">What Happened</span>
          <p className="text-sm text-white italic">&ldquo;{rewrite.whatHappened}&rdquo;</p>
          {rewrite.whyItMissed && (
            <p className="text-xs text-[#B3B3B3] mt-2">{rewrite.whyItMissed}</p>
          )}
        </div>
        <div className="bg-[#FFDE59] p-4 rounded">
          <span className="text-xs font-semibold text-black uppercase block mb-2">Try This</span>
          <p className="text-sm text-black italic">&ldquo;{rewrite.proRewrite}&rdquo;</p>
          {rewrite.spicierVersion && (
            <div className="mt-3 pt-3 border-t border-black/20">
              <span className="text-xs font-semibold text-black/70 uppercase">Spicier Version:</span>
              <p className="text-sm text-black italic mt-1">&ldquo;{rewrite.spicierVersion}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ score, label }: { score: number; label: string }) {
  const getColor = (s: number) => {
    if (s >= 70) return '#4CAF50';
    if (s >= 40) return '#FFDE59';
    return '#E51B23';
  };

  return (
    <div className="flex items-center gap-4 mb-3">
      <span className="text-sm font-poppins text-white w-48 truncate">{label}</span>
      <div className="flex-1 h-3 bg-[#333333] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: getColor(score) }}
        />
      </div>
      <span className="font-anton text-xl text-[#FFDE59] w-12 text-right">{score}</span>
    </div>
  );
}

export function CallLabProReport({ content }: CallLabProReportProps) {
  const report = useMemo(() => parseReport(content), [content]);

  return (
    <div className="space-y-8">
      {/* SECTION 1: Executive Summary */}
      <div className="bg-[#1A1A1A] border-2 border-[#E51B23] p-6 rounded">
        <h2 className="font-anton text-xl text-[#E51B23] mb-4">📊 EXECUTIVE SUMMARY</h2>

        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="text-sm text-[#B3B3B3] space-y-1">
              <div><strong className="text-white">Call:</strong> {report.callInfo || 'N/A'}</div>
              <div><strong className="text-white">Duration:</strong> {report.duration || 'N/A'}</div>
              {report.dynamicsProfile && (
                <div className="mt-2 p-2 bg-[#0a0a0a] rounded">
                  <span className="text-xs text-[#666]">DYNAMICS PROFILE</span>
                  <p className="text-[#FFDE59] font-bold">{report.dynamicsProfile}</p>
                </div>
              )}
            </div>
          </div>
          <ScoreBadge score={report.score} />
        </div>

        {report.executiveSummary && (
          <div className="border-t border-[#333] pt-4">
            <p className="text-white">{report.executiveSummary}</p>
          </div>
        )}

        {/* Quick Wins & Misses */}
        {(report.positivePatterns.length > 0 || report.negativePatterns.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {report.positivePatterns.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-[#4CAF50] mb-2">✓ TOP WINS</h4>
                {report.positivePatterns.slice(0, 2).map((p, i) => (
                  <div key={i} className="text-sm mb-1">
                    <span className="text-[#FFDE59] font-bold">{p.name}</span>
                    {p.whyItWorked && <span className="text-[#666] text-xs block">{p.whyItWorked}</span>}
                  </div>
                ))}
              </div>
            )}
            {report.negativePatterns.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-[#E51B23] mb-2">! TOP MISSES</h4>
                {report.negativePatterns.slice(0, 2).map((p, i) => (
                  <div key={i} className="text-sm mb-1">
                    <span className="text-white font-bold">{p.name}</span>
                    {p.whyItHurt && <span className="text-[#666] text-xs block">{p.whyItHurt}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Performance Scores */}
      {report.performanceScores.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">PERFORMANCE SCORES</h2>
          <div className="bg-[#1A1A1A] p-6 rounded">
            {report.performanceScores.map((ps, i) => (
              <ProgressBar key={i} score={ps.score} label={ps.metric} />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: What You're Doing Right (Positive Patterns) */}
      {report.positivePatterns.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">✓ WHAT YOU&apos;RE DOING RIGHT</h2>
          {report.positivePatterns.map((p, i) => (
            <PositivePatternCard key={i} pattern={p} />
          ))}
        </div>
      )}

      {/* SECTION 4: Patterns to Watch (Negative with Counters) */}
      {report.negativePatterns.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">🎯 PATTERNS TO WATCH</h2>
          {report.negativePatterns.map((p, i) => (
            <NegativePatternCard key={i} pattern={p} />
          ))}
        </div>
      )}

      {/* SECTION 5: Trust Acceleration Map */}
      {report.trustPhases.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">TRUST ACCELERATION MAP</h2>
          <div className="space-y-3">
            {report.trustPhases.map((phase, i) => (
              <div key={i} className="bg-[#1A1A1A] p-4 rounded">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-anton text-lg text-[#E51B23]">{i + 1}</span>
                  <h4 className="text-white font-bold">{phase.phaseName}</h4>
                  {phase.patternName && (
                    <span className="text-[#FFDE59] text-sm">({phase.patternName})</span>
                  )}
                </div>
                {phase.whatRepDid && (
                  <p className="text-sm text-[#B3B3B3] mb-1">
                    <strong className="text-white">Rep:</strong> {phase.whatRepDid}
                  </p>
                )}
                {phase.whatBuyerFelt && (
                  <p className="text-sm text-[#B3B3B3] mb-1">
                    <strong className="text-white">Buyer felt:</strong> {phase.whatBuyerFelt}
                  </p>
                )}
                {phase.evidence && (
                  <blockquote className="text-sm text-[#666] italic border-l-2 border-[#333] pl-3 mt-2">
                    &ldquo;{phase.evidence}&rdquo;
                  </blockquote>
                )}
                {phase.alternativeMove && (
                  <div className="mt-2 p-2 bg-[#0a0a0a] rounded text-sm">
                    <span className="text-[#FFDE59]">Alternative:</span> {phase.alternativeMove}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: Tactical Rewrites */}
      {report.tacticalRewrites.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">TACTICAL MOMENT REWRITES</h2>
          {report.tacticalRewrites.map((tr, i) => (
            <TacticalRewriteCard key={i} rewrite={tr} />
          ))}
        </div>
      )}

      {/* SECTION 7: Next Call Blueprint */}
      {report.nextCallBlueprint.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">NEXT-CALL BLUEPRINT</h2>
          <ol className="space-y-2">
            {report.nextCallBlueprint.map((step, i) => (
              <li key={i} className="flex items-start gap-3 bg-[#1A1A1A] p-3 rounded">
                <span className="font-anton text-lg text-[#E51B23] min-w-[24px]">{i + 1}</span>
                <span className="text-white">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* SECTION 8: Bottom Line Insight */}
      {report.bottomLineInsight && (
        <div className="bg-gradient-to-r from-[#E51B23] to-[#ff4444] p-6 rounded">
          <h2 className="font-anton text-xl text-white mb-3">BOTTOM LINE INSIGHT</h2>
          <p className="text-white text-lg font-semibold">{report.bottomLineInsight}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-[#666] pt-4 border-t border-[#333]">
        Check your dashboard to see how this call updated your patterns and momentum.
        Pro is a system that learns with you. One call at a time, you&apos;re building a win machine.
      </div>
    </div>
  );
}
