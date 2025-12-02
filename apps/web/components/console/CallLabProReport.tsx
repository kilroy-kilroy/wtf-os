'use client';

import { useMemo } from 'react';

interface CallLabProReportProps {
  content: string;
}

interface PerformanceScore {
  metric: string;
  score: number;
}

interface Pattern {
  name: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  whatItIs: string;
  symptoms: string[];
  whyItMatters: string;
  fixes: string[];
  exampleRewrite: string;
}

interface Framework {
  name: string;
  score: number;
  tldr: string;
  whatWorked: string[];
  whatMissed: string[];
  upgradeMove: string;
}

interface TacticalRewrite {
  context: string;
  whatYouSaid: string;
  whyItMissed: string;
  strongerAlternative: string;
}

interface TrustMoment {
  timestamp: string;
  event: string;
  delta: string;
  analysis: string;
}

interface ParsedReport {
  callInfo: string;
  duration: string;
  score: number;
  effectiveness: string;
  snapTake: string;
  snapTakeAnalysis: string;
  performanceScores: PerformanceScore[];
  kilroyFlavorIndex: number;
  kilroyFlavorNote: string;
  patterns: Pattern[];
  frameworks: Framework[];
  trustMapTldr: string;
  trustMoments: TrustMoment[];
  tacticalRewritesTldr: string;
  tacticalRewrites: TacticalRewrite[];
  nextStepsTldr: string;
  nextSteps: string[];
  followUpSubject: string;
  followUpBody: string;
  bottomLine: string;
}

function parseReport(content: string): ParsedReport {
  const report: ParsedReport = {
    callInfo: '',
    duration: '',
    score: 0,
    effectiveness: '',
    snapTake: '',
    snapTakeAnalysis: '',
    performanceScores: [],
    kilroyFlavorIndex: 0,
    kilroyFlavorNote: '',
    patterns: [],
    frameworks: [],
    trustMapTldr: '',
    trustMoments: [],
    tacticalRewritesTldr: '',
    tacticalRewrites: [],
    nextStepsTldr: '',
    nextSteps: [],
    followUpSubject: '',
    followUpBody: '',
    bottomLine: '',
  };

  // Extract call info
  const callMatch = content.match(/\*\*Call:\*\*\s*(.+)/);
  if (callMatch) report.callInfo = callMatch[1].trim();

  const durationMatch = content.match(/\*\*Duration:\*\*\s*(.+)/);
  if (durationMatch) report.duration = durationMatch[1].trim();

  const scoreMatch = content.match(/\*\*SCORE:\*\*\s*(\d+(?:\.\d+)?)/);
  if (scoreMatch) report.score = parseFloat(scoreMatch[1]);

  const effectivenessMatch = content.match(/\*\*Effectiveness:\*\*\s*(\w+)/);
  if (effectivenessMatch) report.effectiveness = effectivenessMatch[1].trim();

  // Extract Snap Take
  const snapTakeMatch = content.match(/## SNAP TAKE\s*\n+([^\n]+)\s*\n+([^#]+?)(?=##|$)/s);
  if (snapTakeMatch) {
    report.snapTake = snapTakeMatch[1].trim();
    report.snapTakeAnalysis = snapTakeMatch[2].trim();
  }

  // Extract Performance Scores from table
  const scoreTableMatch = content.match(/\| Metric \| Score \|[\s\S]*?\|[-\s|]+\|([\s\S]*?)(?=\n\n|\*\*Kilroy)/);
  if (scoreTableMatch) {
    const rows = scoreTableMatch[1].split('\n').filter(r => r.includes('|'));
    rows.forEach(row => {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2) {
        const scoreNum = parseInt(cols[1].replace('/100', ''));
        if (!isNaN(scoreNum)) {
          report.performanceScores.push({
            metric: cols[0],
            score: scoreNum,
          });
        }
      }
    });
  }

  // Extract Kilroy Flavor Index
  const kilroyMatch = content.match(/\*\*Kilroy Flavor Index:\*\*\s*(\d+)\/100\s*\n([^\n#]+)/);
  if (kilroyMatch) {
    report.kilroyFlavorIndex = parseInt(kilroyMatch[1]);
    report.kilroyFlavorNote = kilroyMatch[2].trim();
  }

  // Extract Patterns
  const patternsSection = content.match(/## PATTERNS DETECTED([\s\S]*?)(?=## SALES FRAMEWORK|$)/);
  if (patternsSection) {
    const patternBlocks = patternsSection[1].split(/### /).filter(Boolean);
    patternBlocks.forEach(block => {
      const nameMatch = block.match(/^([^-\n]+)\s*--\s*\[?SEVERITY:\s*(\w+)\]?/i);
      if (nameMatch) {
        const pattern: Pattern = {
          name: nameMatch[1].trim(),
          severity: nameMatch[2].toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
          whatItIs: '',
          symptoms: [],
          whyItMatters: '',
          fixes: [],
          exampleRewrite: '',
        };

        const whatItIsMatch = block.match(/\*\*What it is:\*\*\s*([^\n]+)/);
        if (whatItIsMatch) pattern.whatItIs = whatItIsMatch[1].trim();

        const symptomsMatch = block.match(/\*\*Symptoms:\*\*([\s\S]*?)(?=\*\*Why it matters|\*\*Recommended)/);
        if (symptomsMatch) {
          pattern.symptoms = symptomsMatch[1].split('\n')
            .filter(l => l.trim().startsWith('-'))
            .map(l => l.replace(/^-\s*/, '').trim());
        }

        const whyMatch = block.match(/\*\*Why it matters:\*\*\s*([^\n]+)/);
        if (whyMatch) pattern.whyItMatters = whyMatch[1].trim();

        const fixesMatch = block.match(/\*\*Recommended fixes:\*\*([\s\S]*?)(?=\*\*Example rewrite|###|$)/);
        if (fixesMatch) {
          pattern.fixes = fixesMatch[1].split('\n')
            .filter(l => l.trim().startsWith('-'))
            .map(l => l.replace(/^-\s*/, '').trim());
        }

        const rewriteMatch = block.match(/\*\*Example rewrite:\*\*\s*"?([^"]+)"?/);
        if (rewriteMatch) pattern.exampleRewrite = rewriteMatch[1].trim();

        report.patterns.push(pattern);
      }
    });
  }

  // Extract Sales Framework Analysis
  const frameworkSection = content.match(/## SALES FRAMEWORK ANALYSIS([\s\S]*?)(?=## TRUST MAP|$)/);
  if (frameworkSection) {
    const frameworkNames = ['Challenger', 'Gap Selling', 'SPIN', 'MEDDIC', 'Buyer Journey Alignment', 'WTF Method'];
    frameworkNames.forEach(name => {
      const regex = new RegExp(`### ${name}\\s*--\\s*(\\d+)\\/100([\\s\\S]*?)(?=### |## |$)`, 'i');
      const match = frameworkSection[1].match(regex);
      if (match) {
        const framework: Framework = {
          name,
          score: parseInt(match[1]),
          tldr: '',
          whatWorked: [],
          whatMissed: [],
          upgradeMove: '',
        };

        const blockContent = match[2];
        const tldrMatch = blockContent.match(/^([^\n*]+)/);
        if (tldrMatch) framework.tldr = tldrMatch[1].trim();

        const workedMatch = blockContent.match(/\*\*What worked:\*\*([\s\S]*?)(?=\*\*What missed|$)/);
        if (workedMatch) {
          framework.whatWorked = workedMatch[1].split('\n')
            .filter(l => l.trim().startsWith('-'))
            .map(l => l.replace(/^-\s*/, '').trim());
        }

        const missedMatch = blockContent.match(/\*\*What missed:\*\*([\s\S]*?)(?=\*\*Upgrade move|$)/);
        if (missedMatch) {
          framework.whatMissed = missedMatch[1].split('\n')
            .filter(l => l.trim().startsWith('-'))
            .map(l => l.replace(/^-\s*/, '').trim());
        }

        const upgradeMatch = blockContent.match(/\*\*Upgrade move:\*\*\s*([^\n]+)/);
        if (upgradeMatch) framework.upgradeMove = upgradeMatch[1].trim();

        report.frameworks.push(framework);
      }
    });
  }

  // Extract Trust Map
  const trustMapSection = content.match(/## TRUST MAP([\s\S]*?)(?=## TACTICAL REWRITES|$)/);
  if (trustMapSection) {
    const tldrMatch = trustMapSection[1].match(/^\s*\n([^\n*]+)/);
    if (tldrMatch) report.trustMapTldr = tldrMatch[1].trim();

    const momentMatches = trustMapSection[1].matchAll(/\*\*([^*]+)\*\*\s*--\s*([^\n]+)\s*\n-\s*Trust Delta:\s*([^\n]+)\s*\n-\s*([^\n]+)/g);
    for (const match of momentMatches) {
      report.trustMoments.push({
        timestamp: match[1].trim(),
        event: match[2].trim(),
        delta: match[3].trim(),
        analysis: match[4].trim(),
      });
    }
  }

  // Extract Tactical Rewrites
  const tacticalSection = content.match(/## TACTICAL REWRITES([\s\S]*?)(?=## NEXT STEPS|$)/);
  if (tacticalSection) {
    const tldrMatch = tacticalSection[1].match(/^\s*\n([^\n#]+)/);
    if (tldrMatch) report.tacticalRewritesTldr = tldrMatch[1].trim();

    const rewriteBlocks = tacticalSection[1].split(/### /).filter(Boolean);
    rewriteBlocks.forEach(block => {
      if (block.includes('What you said')) {
        const contextMatch = block.match(/^([^\n]+)/);
        const saidMatch = block.match(/\*\*What you said:\*\*\s*\n>\s*"?([^"]+)"?/);
        const missedMatch = block.match(/\*\*Why it missed:\*\*\s*([^\n]+)/);
        const altMatch = block.match(/\*\*Stronger alternative:\*\*\s*\n>\s*"?([^"]+)"?/);

        if (contextMatch || saidMatch) {
          report.tacticalRewrites.push({
            context: contextMatch ? contextMatch[1].trim() : '',
            whatYouSaid: saidMatch ? saidMatch[1].trim() : '',
            whyItMissed: missedMatch ? missedMatch[1].trim() : '',
            strongerAlternative: altMatch ? altMatch[1].trim() : '',
          });
        }
      }
    });
  }

  // Extract Next Steps
  const nextStepsSection = content.match(/## NEXT STEPS([\s\S]*?)(?=## FOLLOW-UP EMAIL|$)/);
  if (nextStepsSection) {
    const tldrMatch = nextStepsSection[1].match(/^\s*\n([^\n\d]+)/);
    if (tldrMatch) report.nextStepsTldr = tldrMatch[1].trim();

    const stepsMatch = nextStepsSection[1].match(/\d+\.\s+[^\n]+/g);
    if (stepsMatch) {
      report.nextSteps = stepsMatch.map(s => s.replace(/^\d+\.\s*/, '').trim());
    }
  }

  // Extract Follow-up Email
  const emailSection = content.match(/## FOLLOW-UP EMAIL([\s\S]*?)(?=## BOTTOM LINE|$)/);
  if (emailSection) {
    const subjectMatch = emailSection[1].match(/\*\*Subject:\*\*\s*([^\n]+)/);
    if (subjectMatch) report.followUpSubject = subjectMatch[1].trim();

    const bodyMatch = emailSection[1].match(/\*\*Subject:\*\*[^\n]+\n+([\s\S]*?)$/);
    if (bodyMatch) report.followUpBody = bodyMatch[1].trim();
  }

  // Extract Bottom Line
  const bottomLineSection = content.match(/## BOTTOM LINE([\s\S]*?)(?=---|$)/);
  if (bottomLineSection) {
    report.bottomLine = bottomLineSection[1].trim();
  }

  return report;
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center justify-center bg-[#FFDE59] rounded-lg px-6 py-4 min-w-[100px]">
      <span className="font-anton text-5xl text-black leading-none">{Math.round(score * 10)}</span>
      <span className="text-xs font-poppins font-semibold text-black uppercase tracking-wider mt-1">SCORE</span>
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
      <span className="text-sm font-poppins text-white w-40 truncate">{label}</span>
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

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    HIGH: 'bg-[#E51B23] text-white',
    MEDIUM: 'bg-[#FFDE59] text-black',
    LOW: 'bg-[#4CAF50] text-white',
  };
  return (
    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${colors[severity as keyof typeof colors] || colors.MEDIUM}`}>
      {severity}
    </span>
  );
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const borderColors = {
    HIGH: 'border-[#E51B23]',
    MEDIUM: 'border-[#FFDE59]',
    LOW: 'border-[#4CAF50]',
  };

  return (
    <div className={`bg-[#1A1A1A] border-l-4 ${borderColors[pattern.severity]} p-4 rounded-r mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-anton text-lg text-white">{pattern.name}</h4>
        <SeverityBadge severity={pattern.severity} />
      </div>
      <p className="text-sm text-[#B3B3B3] mb-3">{pattern.whatItIs}</p>

      {pattern.symptoms.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-semibold text-[#666] uppercase">Symptoms:</span>
          <ul className="mt-1">
            {pattern.symptoms.map((s, i) => (
              <li key={i} className="text-sm text-white flex items-start">
                <span className="text-[#E51B23] mr-2">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-[#FFDE59] mb-3">{pattern.whyItMatters}</p>

      {pattern.fixes.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-semibold text-[#4CAF50] uppercase">Recommended Fixes:</span>
          <ul className="mt-1">
            {pattern.fixes.map((f, i) => (
              <li key={i} className="text-sm text-white flex items-start">
                <span className="text-[#4CAF50] mr-2">▸</span>{f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pattern.exampleRewrite && (
        <div className="bg-[#0a0a0a] p-3 rounded border border-[#333]">
          <span className="text-xs font-semibold text-[#666] uppercase">Example Rewrite:</span>
          <p className="text-sm text-[#FFDE59] mt-1 italic">&ldquo;{pattern.exampleRewrite}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

function FrameworkCard({ framework }: { framework: Framework }) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-[#4CAF50]';
    if (s >= 40) return 'text-[#FFDE59]';
    return 'text-[#E51B23]';
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-anton text-lg text-white uppercase">{framework.name}</h4>
        <span className={`font-anton text-2xl ${getScoreColor(framework.score)}`}>{framework.score}</span>
      </div>

      <div className="h-2 bg-[#333] rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${framework.score}%`,
            backgroundColor: framework.score >= 70 ? '#4CAF50' : framework.score >= 40 ? '#FFDE59' : '#E51B23'
          }}
        />
      </div>

      <p className="text-sm text-[#B3B3B3] mb-3">{framework.tldr}</p>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-xs font-semibold text-[#4CAF50] uppercase block mb-1">What Worked</span>
          <ul>
            {framework.whatWorked.map((w, i) => (
              <li key={i} className="text-xs text-white flex items-start mb-1">
                <span className="text-[#4CAF50] mr-1">✓</span>{w}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="text-xs font-semibold text-[#E51B23] uppercase block mb-1">What Missed</span>
          <ul>
            {framework.whatMissed.map((m, i) => (
              <li key={i} className="text-xs text-white flex items-start mb-1">
                <span className="text-[#E51B23] mr-1">✗</span>{m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-[#0a0a0a] p-2 rounded">
        <span className="text-xs font-semibold text-[#FFDE59] uppercase">Upgrade Move:</span>
        <p className="text-xs text-white mt-1">{framework.upgradeMove}</p>
      </div>
    </div>
  );
}

function TacticalRewriteCard({ rewrite }: { rewrite: TacticalRewrite }) {
  return (
    <div className="mb-6">
      <h4 className="font-anton text-lg text-white mb-3">{rewrite.context}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] border border-[#E51B23] p-4 rounded">
          <span className="text-xs font-semibold text-[#E51B23] uppercase block mb-2">What You Said</span>
          <p className="text-sm text-white italic">&ldquo;{rewrite.whatYouSaid}&rdquo;</p>
          <p className="text-xs text-[#B3B3B3] mt-2">{rewrite.whyItMissed}</p>
        </div>
        <div className="bg-[#FFDE59] p-4 rounded">
          <span className="text-xs font-semibold text-black uppercase block mb-2">Stronger Alternative</span>
          <p className="text-sm text-black italic">&ldquo;{rewrite.strongerAlternative}&rdquo;</p>
        </div>
      </div>
    </div>
  );
}

export function CallLabProReport({ content }: CallLabProReportProps) {
  const report = useMemo(() => parseReport(content), [content]);

  return (
    <div className="space-y-8">
      {/* Header with Score */}
      <div className="flex items-start justify-between gap-6 pb-6 border-b border-[#E51B23]">
        <div>
          <h1 className="font-anton text-3xl text-white tracking-wide">
            CALL LAB <span className="text-[#E51B23]">PRO</span> - FULL DIAGNOSTIC
          </h1>
          <div className="mt-2 text-sm text-[#B3B3B3]">
            <span className="mr-4"><strong className="text-white">Call:</strong> {report.callInfo}</span>
            <span className="mr-4"><strong className="text-white">Duration:</strong> {report.duration}</span>
            <span><strong className="text-white">Effectiveness:</strong> {report.effectiveness}</span>
          </div>
        </div>
        <ScoreBadge score={report.score} />
      </div>

      {/* Snap Take */}
      <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-6 rounded-r">
        <h2 className="font-anton text-xl text-[#FFDE59] mb-3">SNAP TAKE</h2>
        <p className="text-lg text-white font-semibold mb-3">{report.snapTake}</p>
        <p className="text-sm text-[#B3B3B3]">{report.snapTakeAnalysis}</p>
      </div>

      {/* Performance Scores */}
      <div>
        <h2 className="font-anton text-xl text-[#FFDE59] mb-4">PERFORMANCE SCORES</h2>
        <div className="bg-[#1A1A1A] p-6 rounded">
          {report.performanceScores.map((ps, i) => (
            <ProgressBar key={i} score={ps.score} label={ps.metric} />
          ))}
          {report.kilroyFlavorIndex > 0 && (
            <div className="mt-4 pt-4 border-t border-[#333]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-poppins text-white">Kilroy Flavor Index</span>
                <span className="font-anton text-xl text-[#FFDE59]">{report.kilroyFlavorIndex}/100</span>
              </div>
              <p className="text-sm text-[#B3B3B3] mt-1 italic">{report.kilroyFlavorNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sales Framework Analysis */}
      {report.frameworks.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">SALES FRAMEWORK ANALYSIS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.frameworks.map((f, i) => (
              <FrameworkCard key={i} framework={f} />
            ))}
          </div>
        </div>
      )}

      {/* Patterns Detected */}
      {report.patterns.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">PATTERNS DETECTED</h2>
          {report.patterns.map((p, i) => (
            <PatternCard key={i} pattern={p} />
          ))}
        </div>
      )}

      {/* Tactical Rewrites */}
      {report.tacticalRewrites.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-2">TACTICAL REWRITES</h2>
          <p className="text-sm text-[#B3B3B3] mb-4">{report.tacticalRewritesTldr}</p>
          {report.tacticalRewrites.map((tr, i) => (
            <TacticalRewriteCard key={i} rewrite={tr} />
          ))}
        </div>
      )}

      {/* Trust Map */}
      {report.trustMoments.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-2">TRUST MAP</h2>
          <p className="text-sm text-[#B3B3B3] mb-4">{report.trustMapTldr}</p>
          <div className="space-y-3">
            {report.trustMoments.map((tm, i) => (
              <div key={i} className="bg-[#1A1A1A] p-4 rounded flex items-start gap-4">
                <span className="font-mono text-sm text-[#FFDE59] bg-black px-2 py-1 rounded">{tm.timestamp}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold">{tm.event}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-bold ${tm.delta.includes('+') ? 'text-[#4CAF50]' : tm.delta.includes('-') ? 'text-[#E51B23]' : 'text-[#FFDE59]'}`}>
                      Trust: {tm.delta}
                    </span>
                  </div>
                  <p className="text-sm text-[#B3B3B3] mt-1">{tm.analysis}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {report.nextSteps.length > 0 && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-2">NEXT STEPS</h2>
          <p className="text-sm text-[#B3B3B3] mb-4">{report.nextStepsTldr}</p>
          <ol className="space-y-2">
            {report.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 bg-[#1A1A1A] p-3 rounded">
                <span className="font-anton text-lg text-[#E51B23] min-w-[24px]">{i + 1}</span>
                <span className="text-white">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Follow-Up Email */}
      {report.followUpSubject && (
        <div>
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">FOLLOW-UP EMAIL</h2>
          <div className="bg-[#f5f5f5] text-black p-6 rounded">
            <div className="border-b border-gray-300 pb-3 mb-3">
              <span className="font-semibold">Subject:</span> {report.followUpSubject}
            </div>
            <div className="whitespace-pre-wrap text-sm">{report.followUpBody}</div>
          </div>
        </div>
      )}

      {/* Bottom Line */}
      {report.bottomLine && (
        <div className="bg-gradient-to-r from-[#E51B23] to-[#ff4444] p-6 rounded">
          <h2 className="font-anton text-xl text-white mb-3">BOTTOM LINE</h2>
          <p className="text-white text-lg font-semibold">{report.bottomLine}</p>
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
