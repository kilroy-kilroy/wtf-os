'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Example Pro Report Page
 *
 * Public showcase of a Pro call analysis with synthetic data.
 * Updated to match the new CallLabProReport component format.
 * No auth required - all data is hardcoded.
 */

// Synthetic Pro report data - new format
const SYNTHETIC_REPORT = {
  // Executive Summary
  callInfo: 'Alex Morgan (Rep) → Sarah Chen, VP Operations @ TechCorp',
  duration: '42 minutes',
  score: 72,
  dynamicsProfile: 'The Skilled Diagnostician Who Forgets to Close',
  executiveSummary:
    'Alex ran a textbook discovery call for 38 minutes and then fumbled the last four. The diagnostic work was genuinely impressive -- you got Sarah to articulate pain she hadn\'t verbalized before, and the trust curve was climbing nicely. But the close was soft enough to sleep on. "I\'ll send you some info" is not a next step. It\'s a polite exit ramp. The good news: everything that matters is fixable, and the foundation you built is strong.',

  // Performance Scores
  performanceScores: [
    { metric: 'Gap Creation', score: 70 },
    { metric: 'Discovery Depth', score: 80 },
    { metric: 'Narrative Control', score: 60 },
    { metric: 'Emotional Warmth', score: 80 },
    { metric: 'Credibility Frame', score: 70 },
    { metric: 'Next Step Precision', score: 40 },
  ],

  // Call Stage Scorecard
  callStageScores: [
    {
      stage: 'Opening',
      score: 8,
      whatHappened: 'Referenced TechCorp\'s Series B news and connected it to operational scaling challenges. Sarah leaned in immediately.',
      whatGoodLooksLike: 'Industry-specific opener that earns the first 5 minutes.',
      gap: '',
    },
    {
      stage: 'Discovery',
      score: 9,
      whatHappened: 'Three levels deep on the scaling problem. Got Sarah to say "I hadn\'t thought about it that way before." Gold.',
      whatGoodLooksLike: 'Prospect articulates their own problem in new language.',
      gap: '',
    },
    {
      stage: 'Qualification',
      score: 7,
      whatHappened: 'Identified budget, timeline (Q2), and decision-makers. Missed quantifying the cost of inaction.',
      whatGoodLooksLike: 'Prospect attaches a dollar figure to the gap.',
      gap: 'Never asked "what is this costing you?" -- left the business case unanchored.',
    },
    {
      stage: 'Presentation',
      score: 5,
      whatHappened: 'Jumped to product description when Sarah asked "so what do you do?" Generic pitch that could have been for anyone.',
      whatGoodLooksLike: 'Connect your solution directly to THEIR stated pain using THEIR language.',
      gap: 'Switched from diagnostic mode to pitch mode. Lost the thread.',
    },
    {
      stage: 'Close',
      score: 4,
      whatHappened: 'Ended with "I\'ll send you some info and you can let me know." No date, no time, no calendar.',
      whatGoodLooksLike: 'Specific date/time proposed with a reason tied to their urgency.',
      gap: 'You did 40 minutes of trust-building and then gave her permission to ghost you.',
    },
  ],

  // Positive Patterns
  positivePatterns: [
    {
      name: 'The Mirror Close',
      category: 'Connection',
      strength: 'STRONG' as const,
      howItAppeared: 'Reflected Sarah\'s exact phrases back throughout the call -- "scaling wall," "things falling through cracks," "drowning in manual work."',
      whyItWorked: 'When buyers hear their own language, they feel understood. This is trust accelerant.',
      evidence: 'You mentioned hitting a scaling wall -- can you walk me through what that looks like day to day?',
      howToReplicate: 'Keep a mental (or literal) note of the prospect\'s exact words. Use them in your summaries and transitions.',
    },
    {
      name: 'The Diagnostic Reveal',
      category: 'Diagnosis',
      strength: 'STRONG' as const,
      howItAppeared: 'Named a pattern Sarah hadn\'t seen: that her "good enough" processes were actually compounding technical debt.',
      whyItWorked: 'Prospects who articulate their own problems are 4x more likely to buy. You helped Sarah see her situation more clearly.',
      evidence: 'What happens when that breaks down at 300 people instead of 150?',
      howToReplicate: 'Ask "what happens when..." to help prospects see second-order consequences they haven\'t considered.',
    },
    {
      name: 'The Vulnerability Flip',
      category: 'Connection',
      strength: 'MEDIUM' as const,
      howItAppeared: 'When Sarah mentioned a failed implementation, you shared a story about a similar mistake you\'d seen rather than dismissing it.',
      whyItWorked: 'Turning a potential objection into shared experience deepened trust at a critical moment.',
      evidence: 'Yeah, I\'ve seen that exact thing happen. The team at [company] had the same experience...',
      howToReplicate: 'When prospects share failures or concerns, match with a relevant story before pivoting to your solution.',
    },
  ],

  // Negative Patterns
  negativePatterns: [
    {
      name: 'The Soft Close Fade',
      category: 'Activation',
      severity: 'HIGH' as const,
      howItAppeared: 'Ended with "I\'ll send you some information" and "let me know what you think." No specific ask.',
      whyItHurt: 'Deals without specific next steps have a 73% lower close rate. You did the hard work and then gave it away.',
      evidence: 'Great conversation. Let me send you some info and you can let me know what you think.',
      fix: 'Always propose a specific date/time before the call ends. Use their stated urgency to justify it: "Given your Q2 deadline, let\'s schedule 30 minutes Tuesday to map this out."',
      counterName: 'The Permission Pivot',
      counterRationale: 'Ask "Based on what we discussed, is this the kind of conversation worth continuing?" before proposing next steps. Earns the right to close.',
    },
    {
      name: 'The Scenic Route',
      category: 'Control',
      severity: 'MEDIUM' as const,
      howItAppeared: 'Spent 6 minutes on company background before getting to the first real question. Sarah was polite but checked her phone.',
      whyItHurt: 'Senior buyers give you 3-5 minutes to prove the call is worth their time. You used yours on context she already knew.',
      evidence: 'So TechCorp was founded in 2019 and you\'ve grown to about 150 people...',
      fix: 'Open with a hypothesis, not a biography. "I saw TechCorp just closed Series B -- in my experience that\'s when ops challenges shift from annoying to blocking growth. Is that resonating?"',
      counterName: 'The Framework Drop',
      counterRationale: 'Give structure early that creates clarity and positions you as an authority, not a researcher.',
    },
  ],

  // Trust Acceleration Map
  trustPhases: [
    {
      phaseName: 'Opening (0:00-2:00)',
      patternName: 'The Mirror Close',
      whatRepDid: 'Referenced TechCorp\'s Series B news and connected it to a pattern you\'ve seen in similar companies.',
      whatBuyerFelt: 'This person did their homework. Worth giving them 5 more minutes.',
      evidence: 'I saw TechCorp just closed Series B -- congrats. In my experience, that\'s usually when ops challenges shift from annoying to blocking growth.',
      alternativeMove: '',
    },
    {
      phaseName: 'Discovery (14:00-22:00)',
      patternName: 'The Diagnostic Reveal',
      whatRepDid: 'Asked three levels of "what happens when" questions, helping Sarah see her problem at a deeper level.',
      whatBuyerFelt: 'This person sees something I missed. I should keep talking.',
      evidence: 'I hadn\'t thought about it that way before.',
      alternativeMove: '',
    },
    {
      phaseName: 'Mid-call (28:00)',
      patternName: 'The Vulnerability Flip',
      whatRepDid: 'Shared a relevant failure story when Sarah expressed concern about implementation.',
      whatBuyerFelt: 'They get it. They\'re not just selling, they actually understand.',
      evidence: '',
      alternativeMove: '',
    },
    {
      phaseName: 'Presentation (35:00)',
      patternName: 'The Scenic Route',
      whatRepDid: 'Switched to generic product pitch when asked "so what do you do?" Lost the diagnostic frame.',
      whatBuyerFelt: 'Oh, here comes the sales pitch. Guard going up.',
      evidence: 'We\'re a platform that helps companies scale their operations through automation.',
      alternativeMove: 'Connect back to her language: "Remember that scaling wall you mentioned? We help companies like TechCorp break through it -- specifically by..."',
    },
    {
      phaseName: 'Close (41:00)',
      patternName: 'The Soft Close Fade',
      whatRepDid: 'Said "I\'ll send you some info" instead of proposing a specific next step.',
      whatBuyerFelt: 'They\'re not confident enough to ask. Maybe this isn\'t as good a fit as I thought.',
      evidence: 'Let me send you some information and you can let me know what you think.',
      alternativeMove: '"Based on your Q2 timeline, I\'d suggest we reconnect Tuesday to map out what an implementation could look like. I have 2pm or 4pm -- which works better?"',
    },
  ],

  // Tactical Rewrites
  tacticalRewrites: [
    {
      context: 'At 35:00 -- Sarah asks "so what do you do?"',
      whatHappened: 'We\'re a platform that helps companies scale their operations through automation.',
      whyItMissed: 'Generic product description that sounds like every competitor. Didn\'t connect back to HER specific problem.',
      proRewrite: 'Remember that scaling wall you mentioned? We help companies like TechCorp break through it -- specifically by automating the manual processes that are eating your team alive right now. Want me to show you how one similar company did it?',
      spicierVersion: 'You just told me your team is drowning in manual work and it gets worse every month. That\'s literally the problem we solve. Want to see what it looks like when it\'s fixed?',
    },
    {
      context: 'At 41:15 -- Closing the call',
      whatHappened: 'Great conversation. Let me send you some information and you can let me know what you think.',
      whyItMissed: 'Puts all the work on the prospect. "Let me know" is the weakest close possible.',
      proRewrite: 'This was exactly the kind of conversation I was hoping for. Based on your Q2 timeline, I\'d suggest we reconnect Tuesday to map out what an implementation could look like. I have 2pm or 4pm -- which works better for your schedule?',
      spicierVersion: 'Sarah, you told me Q2 is the deadline and manual work is compounding every month. Let\'s not lose momentum. Tuesday at 2pm or 4pm -- I\'ll bring a specific plan for TechCorp.',
    },
    {
      context: 'At 28:15 -- Sarah mentions budget concerns',
      whatHappened: 'Yeah, that\'s something we can definitely work with.',
      whyItMissed: 'Dismissed her concern too quickly without acknowledging it or turning it into a conversation.',
      proRewrite: 'Budget\'s always a real consideration. Help me understand -- if we could show you a path that paid for itself in 90 days, would that change the conversation?',
      spicierVersion: 'Totally fair. But here\'s what I\'ve seen: the companies that wait to fix this end up spending 3x more when it finally breaks. What if I showed you the math on that?',
    },
  ],

  // Next-Call Blueprint
  nextCallBlueprint: [
    'Send follow-up email TODAY with specific meeting request for Tuesday 2pm.',
    'Include the case study from the similar company you mentioned on the call.',
    'Reference her "scaling wall" phrase in the email subject to show you were listening.',
    'Prepare a TechCorp-specific ROI model for the next call -- she needs data to build the internal business case.',
    'Research David Park (CTO) before the next call. He has veto power and you\'ll need him eventually.',
  ],

  // The One Thing
  oneThing: {
    behavior: 'Close with a specific date and time, not "let me know."',
    whatHappened: 'You ended with "I\'ll send you some info and you can let me know what you think." This is a polite exit, not a next step.',
    whatGoodLooksLike: '"Based on your Q2 deadline, let\'s schedule 30 minutes Tuesday to walk through the implementation plan. I have 2pm or 4pm -- which works better?"',
    drill: 'For the next 5 calls, write your closing sentence BEFORE the call starts. Have it on a sticky note. Read it verbatim if you have to. The goal is to never end a call without a specific date on the calendar.',
    whyItMatters: 'Everything else on this call was strong. This is the 5% change that will have a 50% impact on your close rate.',
  },

  // Bottom Line Insight
  bottomLineInsight:
    'You\'re a strong diagnostician who loses deals at the finish line. The trust you build is real, the discovery is excellent, and the rapport is genuine. But none of it matters if the prospect walks away without a next step. Fix the close and you\'re a top performer. That\'s not a pep talk -- it\'s math.',
};

function ScoreBadge({ score }: { score: number }) {
  const getGrade = (s: number) => {
    if (s >= 85) return 'STRONG';
    if (s >= 70) return 'SOLID';
    if (s >= 55) return 'DEVELOPING';
    return 'NEEDS WORK';
  };

  return (
    <div className="flex flex-col items-center justify-center bg-[#FFDE59] rounded-lg px-6 py-4 min-w-[120px]">
      <span className="font-anton text-5xl text-black leading-none">{score}</span>
      <span className="text-xs font-poppins font-semibold text-black uppercase tracking-wider mt-1">SCORE</span>
      <span className="text-xs font-poppins font-bold text-black mt-1">{getGrade(score)}</span>
    </div>
  );
}

function StrengthBadge({ strength }: { strength: string }) {
  const config: Record<string, { icon: string; bg: string; text: string }> = {
    STRONG: { icon: '⚡', bg: 'bg-[#FFDE59]', text: 'text-black' },
    MEDIUM: { icon: '◆', bg: 'bg-[#333]', text: 'text-white border border-[#666]' },
    DEVELOPING: { icon: '◇', bg: 'bg-transparent', text: 'text-[#666] border border-[#666]' },
  };
  const c = config[strength] || config.MEDIUM;

  return (
    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${c.bg} ${c.text}`}>
      {c.icon} {strength}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    HIGH: 'bg-[#E51B23] text-white',
    MEDIUM: 'bg-[#FF8C42] text-white',
    LOW: 'bg-[#333] text-white border border-[#666]',
  };

  return (
    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${colors[severity] || colors.MEDIUM}`}>
      {severity} IMPACT
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

export default function ExampleProReportPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'stages',
    'strengths',
    'friction',
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const report = SYNTHETIC_REPORT;

  return (
    <div className="min-h-screen bg-black font-poppins">
      {/* Header */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/call-lab-examples" className="flex items-center gap-3">
            <div>
              <div className="font-anton text-xl tracking-wide">
                <span className="text-white">CALL</span>
                <span className="text-[#E51B23]">LAB</span>
                <span className="bg-[#FFDE59] text-black text-xs px-2 py-0.5 ml-2">PRO</span>
              </div>
            </div>
          </Link>
          <Link
            href="/call-lab-pro?utm_source=example"
            className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
          >
            Unlock Pro Analysis
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Executive Summary */}
        <div className="bg-[#1A1A1A] border-2 border-[#E51B23] rounded-lg p-6">
          <h2 className="font-anton text-xl text-[#E51B23] mb-4">EXECUTIVE SUMMARY</h2>

          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="text-sm text-[#B3B3B3] space-y-1">
                <div><strong className="text-white">Call:</strong> {report.callInfo}</div>
                <div><strong className="text-white">Duration:</strong> {report.duration}</div>
                <div className="mt-2 p-2 bg-[#0a0a0a] rounded">
                  <span className="text-xs text-[#666]">DYNAMICS PROFILE</span>
                  <p className="text-[#FFDE59] font-bold">{report.dynamicsProfile}</p>
                </div>
              </div>
            </div>
            <ScoreBadge score={report.score} />
          </div>

          <div className="border-t border-[#333] pt-4">
            <p className="text-white">{report.executiveSummary}</p>
          </div>

          {/* Quick Wins & Misses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-sm font-bold text-[#4CAF50] mb-2">TOP WINS</h4>
              {report.positivePatterns.slice(0, 2).map((p, i) => (
                <div key={i} className="text-sm mb-1">
                  <span className="text-[#FFDE59] font-bold">{p.name}</span>
                  <span className="text-[#666] text-xs block">{p.whyItWorked}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#E51B23] mb-2">TOP MISSES</h4>
              {report.negativePatterns.slice(0, 2).map((p, i) => (
                <div key={i} className="text-sm mb-1">
                  <span className="text-white font-bold">{p.name}</span>
                  <span className="text-[#666] text-xs block">{p.whyItHurt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Scores */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4">PERFORMANCE SCORES</h2>
          <div className="bg-[#1A1A1A] p-6 rounded">
            {report.performanceScores.map((ps, i) => (
              <ProgressBar key={i} score={ps.score} label={ps.metric} />
            ))}
          </div>
        </div>

        {/* Call Stage Scorecard */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('stages')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-xl text-[#FFDE59] uppercase tracking-wider">
              Call Stage Scorecard
            </h2>
            <span className="text-[#666]">{expandedSections.includes('stages') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('stages') && (
            <div className="space-y-3 mt-4">
              {report.callStageScores.map((stage, i) => {
                const scoreColor = stage.score >= 8 ? '#4CAF50' : stage.score >= 5 ? '#FFDE59' : '#E51B23';
                return (
                  <div key={i} className="bg-[#1A1A1A] p-4 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-bold text-sm uppercase">{stage.stage}</h4>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-[#333] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${stage.score * 10}%`, backgroundColor: scoreColor }}
                          />
                        </div>
                        <span className="font-anton text-lg min-w-[32px] text-right" style={{ color: scoreColor }}>
                          {stage.score}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-[#B3B3B3] mb-1">{stage.whatHappened}</p>
                    {stage.gap && (
                      <div className="mt-2 p-2 bg-[#0a0a0a] rounded border-l-2 border-[#E51B23]">
                        <span className="text-xs font-semibold text-[#E51B23] uppercase">Gap: </span>
                        <span className="text-xs text-white">{stage.gap}</span>
                      </div>
                    )}
                    {stage.whatGoodLooksLike && !stage.gap && (
                      <div className="mt-2 p-2 bg-[#0a0a0a] rounded border-l-2 border-[#4CAF50]">
                        <span className="text-xs font-semibold text-[#4CAF50] uppercase">Benchmark: </span>
                        <span className="text-xs text-white">{stage.whatGoodLooksLike}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Strengths Detected */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('strengths')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-xl text-[#FFDE59] uppercase tracking-wider">
              Strengths Detected
            </h2>
            <span className="text-[#666]">{expandedSections.includes('strengths') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('strengths') && (
            <div className="mt-4 space-y-4">
              {report.positivePatterns.map((pattern, i) => (
                <div key={i} className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4 rounded-r">
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

                  <p className="text-sm text-[#B3B3B3] mb-2">
                    <strong className="text-white">How it appeared:</strong> {pattern.howItAppeared}
                  </p>

                  <p className="text-sm text-[#FFDE59] mb-2">{pattern.whyItWorked}</p>

                  {pattern.evidence && (
                    <blockquote className="text-sm text-[#999] italic border-l-2 border-[#333] pl-3 my-3">
                      &ldquo;{pattern.evidence}&rdquo;
                    </blockquote>
                  )}

                  <div className="bg-[#0a0a0a] p-3 rounded mt-3">
                    <span className="text-xs font-semibold text-[#4CAF50] uppercase">How to Replicate:</span>
                    <p className="text-sm text-white mt-1">{pattern.howToReplicate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friction Detected */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('friction')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-xl text-[#FFDE59] uppercase tracking-wider">
              Friction Detected
            </h2>
            <span className="text-[#666]">{expandedSections.includes('friction') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('friction') && (
            <div className="mt-4 space-y-6">
              {report.negativePatterns.map((pattern, i) => (
                <div key={i}>
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

                    <p className="text-sm text-[#B3B3B3] mb-2">
                      <strong className="text-white">How it appeared:</strong> {pattern.howItAppeared}
                    </p>

                    <p className="text-sm text-[#E51B23] mb-2">{pattern.whyItHurt}</p>

                    {pattern.evidence && (
                      <blockquote className="text-sm text-[#999] italic border-l-2 border-[#E51B23] pl-3 my-3">
                        &ldquo;{pattern.evidence}&rdquo;
                      </blockquote>
                    )}

                    <div className="bg-[#0a0a0a] p-3 rounded mt-3 border-l-4 border-[#E51B23]">
                      <span className="text-xs font-semibold text-[#E51B23] uppercase">Fix:</span>
                      <p className="text-sm text-white mt-1">{pattern.fix}</p>
                    </div>
                  </div>

                  {/* Counter Pattern */}
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trust Acceleration Map */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('trust')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-xl text-[#FFDE59] uppercase tracking-wider">
              Trust Acceleration Map
            </h2>
            <span className="text-[#666]">{expandedSections.includes('trust') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('trust') && (
            <div className="space-y-3 mt-4">
              {report.trustPhases.map((phase, i) => (
                <div key={i} className="bg-[#1A1A1A] p-4 rounded">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-anton text-lg text-[#E51B23]">{i + 1}</span>
                    <h4 className="text-white font-bold">{phase.phaseName}</h4>
                    {phase.patternName && (
                      <span className="text-[#FFDE59] text-sm">({phase.patternName})</span>
                    )}
                  </div>
                  <p className="text-sm text-[#B3B3B3] mb-1">
                    <strong className="text-white">Rep:</strong> {phase.whatRepDid}
                  </p>
                  <p className="text-sm text-[#B3B3B3] mb-1">
                    <strong className="text-white">Buyer felt:</strong> {phase.whatBuyerFelt}
                  </p>
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
          )}
        </div>

        {/* Tactical Moment Rewrites */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('rewrites')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-xl text-[#FFDE59] uppercase tracking-wider">
              Tactical Moment Rewrites
            </h2>
            <span className="text-[#666]">{expandedSections.includes('rewrites') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('rewrites') && (
            <div className="mt-4 space-y-6">
              {report.tacticalRewrites.map((rewrite, i) => (
                <div key={i}>
                  <h4 className="font-anton text-lg text-white mb-3">{rewrite.context}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1A] border border-[#E51B23] p-4 rounded">
                      <span className="text-xs font-semibold text-[#E51B23] uppercase block mb-2">What Happened</span>
                      <p className="text-sm text-white italic">&ldquo;{rewrite.whatHappened}&rdquo;</p>
                      <p className="text-xs text-[#B3B3B3] mt-2">{rewrite.whyItMissed}</p>
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
              ))}
            </div>
          )}
        </div>

        {/* Next-Call Blueprint */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-xl text-[#FFDE59] uppercase tracking-wider mb-4">
            Next-Call Blueprint
          </h2>
          <ol className="space-y-2">
            {report.nextCallBlueprint.map((step, i) => (
              <li key={i} className="flex items-start gap-3 bg-[#1A1A1A] p-3 rounded">
                <span className="font-anton text-lg text-[#E51B23] min-w-[24px]">{i + 1}</span>
                <span className="text-white">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* The One Thing */}
        <div className="bg-[#1A1A1A] border-2 border-[#FFDE59] rounded-lg p-6">
          <h2 className="font-anton text-xl text-[#FFDE59] mb-1">THE ONE THING</h2>
          <p className="text-xs text-[#666] mb-4 uppercase tracking-wider">The single highest-leverage change for your next call</p>

          <div className="bg-[#FFDE59] p-4 rounded mb-4">
            <p className="font-anton text-xl text-black">{report.oneThing.behavior}</p>
          </div>

          <div className="mb-3">
            <span className="text-xs font-semibold text-[#E51B23] uppercase">What you did: </span>
            <p className="text-sm text-[#B3B3B3] mt-1">{report.oneThing.whatHappened}</p>
          </div>

          <div className="mb-3">
            <span className="text-xs font-semibold text-[#4CAF50] uppercase">What good looks like: </span>
            <p className="text-sm text-white mt-1">{report.oneThing.whatGoodLooksLike}</p>
          </div>

          <div className="bg-[#0a0a0a] border border-[#FFDE59] p-4 rounded mb-3">
            <span className="text-xs font-semibold text-[#FFDE59] uppercase block mb-2">Your Drill</span>
            <p className="text-sm text-white">{report.oneThing.drill}</p>
          </div>

          <p className="text-xs text-[#666] italic">{report.oneThing.whyItMatters}</p>
        </div>

        {/* Bottom Line Insight */}
        <div className="bg-gradient-to-r from-[#E51B23] to-[#ff4444] rounded-lg p-6">
          <h2 className="font-anton text-xl text-white mb-3">BOTTOM LINE INSIGHT</h2>
          <p className="text-white text-lg font-semibold">{report.bottomLineInsight}</p>
        </div>

        {/* CTA Banner */}
        <div className="bg-[#E51B23] rounded-lg p-8 text-center">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wide mb-3">
            Get this analysis for your calls
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Pattern recognition. Stage scoring. Tactical rewrites. The One Thing. Everything you need to close
            more deals.
          </p>
          <Link
            href="/call-lab-pro?utm_source=example"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Unlock Pro Analysis →
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#333] pt-8 mt-8">
          <div className="flex items-center justify-between">
            <Link
              href="/call-lab-examples"
              className="text-[#B3B3B3] text-sm hover:text-white transition-colors"
            >
              ← Back to Call Lab Examples
            </Link>
            <span className="text-[#666] text-sm">Example data • Not a real report</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
