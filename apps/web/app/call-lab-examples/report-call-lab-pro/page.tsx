'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PatternTag } from '@/components/pattern-tag';

/**
 * Example Pro Report Page
 *
 * Public showcase of a Pro call analysis with synthetic data.
 * No auth required - all data is hardcoded.
 */

// Synthetic Pro report data
const SYNTHETIC_REPORT = {
  meta: {
    callId: 'example-001',
    version: 'pro',
    overallScore: 72,
    trustVelocity: 68,
    repName: 'Alex Morgan',
    prospectName: 'Sarah Chen',
    prospectCompany: 'TechCorp',
    callStage: 'Discovery',
  },
  snapTake: {
    tldr: 'Strong diagnostic skills undermined by weak close. You built significant trust but left without a concrete next step.',
    analysis:
      'Alex demonstrated excellent discovery technique, using strategic questions to uncover TechCorp\'s scaling challenges. The prospect self-diagnosed their problem (a strong sign). However, the call ended with "I\'ll send you some info" rather than a scheduled follow-up, putting the deal at risk.',
  },
  scores: {
    discovery: 81,
    rapport: 76,
    control: 68,
    qualification: 74,
    close: 52,
    overall: 72,
  },
  modelScores: {
    challenger: {
      score: 74,
      tldr: 'Good teaching moments but missed the reframe opportunity',
      analysis:
        'You shared valuable insights about scaling challenges common in their industry. Strong commercial teaching, but you could have pushed harder when Sarah mentioned their "good enough" current solution.',
      whatWorked: [
        'Shared industry benchmark data that surprised them',
        'Connected their problem to broader market trends',
        'Positioned as advisor, not vendor',
      ],
      whatMissed: [
        'Didn\'t challenge their assumption about timeline',
        'Could have reframed "good enough" as a risk',
      ],
      upgradeMove:
        'When they said their current solution was "working fine," try: "That\'s what I hear often. Can I share what similar companies discovered when they thought the same thing?"',
    },
    gapSelling: {
      score: 78,
      tldr: 'Strong problem identification but gap quantification was soft',
      analysis:
        'You effectively uncovered the current state and identified key pain points. The prospect articulated their future state well. However, you didn\'t quantify the cost of the gap.',
      whatWorked: [
        'Got them to articulate the current state in detail',
        'Connected symptoms to root cause',
        'Prospect described desired outcome clearly',
      ],
      whatMissed: [
        'Didn\'t quantify the cost of inaction',
        'Missed opportunity to attach dollar value to the gap',
      ],
      upgradeMove:
        'After they described the problem, ask: "If you had to put a number on what this is costing you per month — in time, money, or missed opportunities — what would that be?"',
    },
    wtfMethod: {
      score: 71,
      tldr: 'Strong relevance and diagnosis, permission-building needs work',
      analysis:
        'You demonstrated radical relevance by connecting to their specific context. Your diagnostic generosity was evident in the insights you shared. But you asked for permission to proceed without earning it fully.',
      whatWorked: [
        'Referenced a similar company in their space',
        'Gave actionable insight they could use immediately',
        'Asked open-ended questions that revealed real pain',
      ],
      whatMissed: [
        'Jumped to proposing next steps too quickly',
        'Didn\'t confirm they saw value before asking for commitment',
      ],
      upgradeMove:
        'Before proposing next steps, ask: "Based on what we\'ve discussed, is this the kind of conversation worth continuing?"',
    },
  },
  patterns: [
    {
      patternName: 'Mirror Close',
      severity: 'positive',
      tldr: 'Strong use of prospect\'s own language to create alignment',
      timestamps: ['14:32', '28:15', '35:42'],
      symptoms: [
        'Reflected Sarah\'s exact words back',
        'Used "scaling challenges" (her term) throughout',
        'Summarized her problems in her own framing',
      ],
      whyItMatters:
        'When prospects hear their own language, they feel understood. This builds trust and makes them more receptive to your solution.',
      recommendedFixes: [],
      exampleRewrite: '',
    },
    {
      patternName: 'Soft Close Fade',
      severity: 'critical',
      tldr: 'Ended with "let me know" instead of a specific next step',
      timestamps: ['41:15'],
      symptoms: [
        'Said "I\'ll send you some information"',
        'Ended with "let me know what you think"',
        'No calendar invite or specific date proposed',
      ],
      whyItMatters:
        'Deals that end without specific next steps have a 73% lower close rate. You did the hard work of building trust — don\'t leave it on the table.',
      recommendedFixes: [
        'Always propose a specific date/time before the call ends',
        'Frame follow-up as continuation, not new commitment',
        'Use their stated urgency to justify quick turnaround',
      ],
      exampleRewrite:
        'Instead of "I\'ll send you some info," try: "Based on what you shared about the Q2 deadline, let\'s schedule 30 minutes next Tuesday to walk through how this could work for TechCorp. I have 2pm or 4pm — which works better?"',
    },
    {
      patternName: 'Diagnostic Reveal',
      severity: 'positive',
      tldr: 'Uncovered root problem through strategic questioning',
      timestamps: ['18:45', '22:10'],
      symptoms: [
        'Asked "what happens when that breaks down?"',
        'Dug three levels deep on the scaling issue',
        'Got prospect to articulate problem they hadn\'t verbalized before',
      ],
      whyItMatters:
        'Prospects who articulate their own problems are 4x more likely to buy. You helped Sarah see her situation more clearly.',
      recommendedFixes: [],
      exampleRewrite: '',
    },
  ],
  trustMap: {
    tldr: 'Trust built steadily but dropped at close',
    timeline: [
      {
        timestamp: '02:00',
        event: 'Industry-specific opening',
        trustDelta: '+12',
        analysis: 'Mentioning the recent TechCorp news showed you did homework',
      },
      {
        timestamp: '14:32',
        event: 'First mirror close',
        trustDelta: '+8',
        analysis: 'Using her exact phrase "scaling wall" created connection',
      },
      {
        timestamp: '22:10',
        event: 'Root cause reveal',
        trustDelta: '+15',
        analysis:
          'Helping her see the real problem built significant credibility',
      },
      {
        timestamp: '35:00',
        event: 'Premature solution mention',
        trustDelta: '-5',
        analysis: 'Talking about your product before she asked slightly eroded trust',
      },
      {
        timestamp: '41:15',
        event: 'Soft close fade',
        trustDelta: '-10',
        analysis:
          'Ending without commitment created uncertainty about your confidence',
      },
    ],
  },
  tacticalRewrites: {
    tldr: '3 moments where different language would have changed the outcome',
    items: [
      {
        context: 'At 35:00 when Sarah asked "so what do you do?"',
        whatYouSaid:
          'We\'re a platform that helps companies scale their operations through automation.',
        whyItMissed:
          'Generic product description that sounds like every competitor. Didn\'t connect back to HER specific problem.',
        strongerAlternative:
          'Remember that scaling wall you mentioned? We help companies like TechCorp break through it — specifically by [addressing her stated pain]. Want me to show you how one similar company did it?',
      },
      {
        context: 'At 41:15 when closing the call',
        whatYouSaid:
          'Great conversation. Let me send you some information and you can let me know what you think.',
        whyItMissed:
          'Puts all the work on the prospect. "Let me know" is the weakest close possible.',
        strongerAlternative:
          'This was exactly the kind of conversation I was hoping for. Based on your Q2 timeline, I\'d suggest we reconnect Tuesday to map out what an implementation could look like. I have 2pm or 4pm — which works better for your schedule?',
      },
      {
        context: 'At 28:15 when she mentioned budget concerns',
        whatYouSaid: 'Yeah, that\'s something we can definitely work with.',
        whyItMissed:
          'Dismissed her concern too quickly without acknowledging it fully.',
        strongerAlternative:
          'Budget\'s always a real consideration. Help me understand — if we could show you a path that paid for itself in 90 days, would that change the conversation?',
      },
    ],
  },
  nextSteps: {
    tldr: 'Three actions to salvage and advance this opportunity',
    actions: [
      'Send follow-up email TODAY with specific meeting request for Tuesday 2pm',
      'Include the case study from the similar company you mentioned',
      'Reference her "scaling wall" phrase to show you were listening',
      'Add calendar link to make saying yes effortless',
    ],
  },
  followUpEmail: {
    subject: 'The scaling wall conversation + next step',
    body: `Sarah,

Great conversation today about TechCorp's scaling challenges. When you mentioned hitting "the wall" at 50 people, it reminded me exactly of what the team at [Similar Company] faced last year.

I mentioned I'd share some info — attached is the case study showing how they broke through. Pay attention to page 3 where they talk about the 90-day payback.

Given your Q2 deadline, I'd suggest we reconnect Tuesday to map out what this could look like for TechCorp specifically. I have 2pm or 4pm — either work for you?

[Calendar Link]

— Alex`,
  },
};

export default function ExampleProReportPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'patterns',
    'rewrites',
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
        {/* Score Header */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-anton text-2xl text-white uppercase tracking-wide mb-1">
                {report.meta.prospectName} — {report.meta.prospectCompany}
              </h1>
              <p className="text-[#666] text-sm">
                {report.meta.callStage} Call • Analyzed by Call Lab Pro
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-anton text-[#E51B23]">{report.meta.overallScore}</div>
              <div className="text-[#666] text-xs tracking-wider">OVERALL SCORE</div>
            </div>
          </div>

          {/* Snap Take */}
          <div className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4">
            <h3 className="font-anton text-[#FFDE59] text-sm tracking-wider mb-2">SNAP TAKE</h3>
            <p className="text-white text-lg mb-2">{report.snapTake.tldr}</p>
            <p className="text-[#B3B3B3]">{report.snapTake.analysis}</p>
          </div>
        </div>

        {/* Scores Grid */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Core Scores
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Object.entries(report.scores).map(([key, value]) => (
              <div
                key={key}
                className={`bg-[#0a0a0a] border border-[#333] p-4 rounded text-center ${
                  key === 'close' ? 'border-[#E51B23]' : ''
                }`}
              >
                <div
                  className={`text-3xl font-anton ${
                    value >= 75
                      ? 'text-green-500'
                      : value >= 60
                        ? 'text-[#FFDE59]'
                        : 'text-[#E51B23]'
                  }`}
                >
                  {value}
                </div>
                <div className="text-[#666] text-xs tracking-wider uppercase mt-1">{key}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Scores */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('models')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Sales Framework Analysis
            </h2>
            <span className="text-[#666]">{expandedSections.includes('models') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('models') && (
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {Object.entries(report.modelScores).map(([model, data]) => (
                <div key={model} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-anton text-white uppercase text-sm">
                      {model === 'gapSelling'
                        ? 'GAP SELLING'
                        : model === 'wtfMethod'
                          ? 'WTF METHOD'
                          : model.toUpperCase()}
                    </span>
                    <span className="text-2xl font-anton text-[#E51B23]">{data.score}</span>
                  </div>
                  <p className="text-[#FFDE59] text-sm mb-2">{data.tldr}</p>
                  <p className="text-[#B3B3B3] text-sm mb-3">{data.analysis}</p>

                  <div className="mb-2">
                    <p className="text-green-500 text-xs mb-1">WHAT WORKED:</p>
                    <ul className="text-[#B3B3B3] text-xs list-disc list-inside space-y-1">
                      {data.whatWorked.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-2">
                    <p className="text-[#E51B23] text-xs mb-1">WHAT MISSED:</p>
                    <ul className="text-[#B3B3B3] text-xs list-disc list-inside space-y-1">
                      {data.whatMissed.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#333]">
                    <p className="text-[#666] text-xs mb-1">UPGRADE MOVE:</p>
                    <p className="text-white text-sm">{data.upgradeMove}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patterns */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('patterns')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Patterns Detected
            </h2>
            <span className="text-[#666]">{expandedSections.includes('patterns') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('patterns') && (
            <div className="space-y-4 mt-4">
              {report.patterns.map((pattern, i) => (
                <div
                  key={i}
                  className={`bg-[#1A1A1A] border rounded p-4 ${
                    pattern.severity === 'critical'
                      ? 'border-[#E51B23]'
                      : pattern.severity === 'positive'
                        ? 'border-green-500/50'
                        : 'border-[#333]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <PatternTag pattern={pattern.patternName} className="font-anton text-base" />
                    <span
                      className={`text-xs px-2 py-1 rounded uppercase ${
                        pattern.severity === 'critical'
                          ? 'bg-[#E51B23] text-white'
                          : pattern.severity === 'positive'
                            ? 'bg-green-600 text-white'
                            : 'bg-[#333] text-white'
                      }`}
                    >
                      {pattern.severity}
                    </span>
                  </div>
                  <p className="text-[#B3B3B3] mb-3">{pattern.tldr}</p>

                  <div className="text-[#666] text-xs mb-2">
                    Timestamps: {pattern.timestamps.join(', ')}
                  </div>

                  <p className="text-[#FFDE59] text-sm mb-3">{pattern.whyItMatters}</p>

                  {pattern.recommendedFixes.length > 0 && (
                    <div className="bg-black/50 rounded p-3">
                      <p className="text-[#666] text-xs mb-2">RECOMMENDED FIXES:</p>
                      <ul className="text-white text-sm list-disc list-inside space-y-1">
                        {pattern.recommendedFixes.map((fix, j) => (
                          <li key={j}>{fix}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pattern.exampleRewrite && (
                    <div className="mt-3 pt-3 border-t border-[#333]">
                      <p className="text-[#666] text-xs mb-1">EXAMPLE REWRITE:</p>
                      <p className="text-green-400 text-sm italic">{pattern.exampleRewrite}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tactical Rewrites */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('rewrites')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Tactical Rewrites
            </h2>
            <span className="text-[#666]">{expandedSections.includes('rewrites') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('rewrites') && (
            <div className="space-y-4 mt-4">
              {report.tacticalRewrites.items.map((item, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <p className="text-[#666] text-xs mb-3">{item.context}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[#E51B23] text-xs mb-1">WHAT YOU SAID:</p>
                      <p className="text-[#999] text-sm italic">&quot;{item.whatYouSaid}&quot;</p>
                    </div>
                    <div>
                      <p className="text-green-500 text-xs mb-1">STRONGER ALTERNATIVE:</p>
                      <p className="text-white text-sm">&quot;{item.strongerAlternative}&quot;</p>
                    </div>
                  </div>
                  <p className="text-[#B3B3B3] text-sm mt-3">{item.whyItMissed}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Next Steps
          </h2>
          <ul className="space-y-2">
            {report.nextSteps.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-[#FFDE59] font-anton">{i + 1}.</span>
                <span className="text-[#B3B3B3]">{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Follow-up Email */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Follow-Up Email (Ready to Send)
          </h2>
          <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
            <div className="mb-4">
              <p className="text-[#666] text-xs mb-1">SUBJECT:</p>
              <p className="text-white font-medium">{report.followUpEmail.subject}</p>
            </div>
            <div>
              <p className="text-[#666] text-xs mb-1">BODY:</p>
              <pre className="text-[#B3B3B3] text-sm whitespace-pre-wrap">{report.followUpEmail.body}</pre>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-[#E51B23] rounded-lg p-8 text-center">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wide mb-3">
            Get this analysis for your calls
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Pattern recognition. Framework scoring. Tactical rewrites. Everything you need to close
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
