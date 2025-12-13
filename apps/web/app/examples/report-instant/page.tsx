'use client';

import Link from 'next/link';

/**
 * Example Instant Report Page
 *
 * Public showcase of an Instant pitch analysis with synthetic data.
 * No auth required - all data is hardcoded.
 */

// Synthetic instant report data
const SYNTHETIC_REPORT = {
  id: 'example-instant-001',
  score: 7,
  transcript: `Hi Sarah, thanks for taking the time. I noticed TechCorp just closed your Series B — congrats on that. I imagine that means the scaling challenges we discussed are about to get a lot more real.

I work with companies at exactly this stage — when the processes that got you here start breaking at 50 people. What we do is help you identify which systems are going to crack first and build the infrastructure to scale past 100 without losing what made you successful.

I'm curious — when you think about the next 12 months, what keeps you up at night about scaling the team?`,
  analysis: {
    wtf: {
      radicalRelevance: 8,
      radicalRelevanceNote: 'Strong opening tied to their specific situation. Mentioning Series B shows homework.',
      radicalRelevanceEvidence: 'I noticed TechCorp just closed your Series B',
      radicalRelevanceImprove: 'Could add a specific data point about their industry growth rate.',
      diagnosticGenerosity: 7,
      diagnosticGenerosityNote: 'Good framing of the problem but could give more tactical insight upfront.',
      diagnosticGenerosityEvidence: 'processes that got you here start breaking at 50 people',
      diagnosticGenerosityImprove: 'Share a specific example of what breaks first — make it tangible.',
      permissionProgression: 6,
      permissionProgressionNote: 'Question at the end is good but could build more permission before asking.',
      permissionProgressionEvidence: 'what keeps you up at night about scaling',
      permissionProgressionImprove: 'Try: "Would it be helpful if I shared what we see as the three biggest risks at this stage?"',
      overall: 'Solid opener with room to be more generous with insights before asking questions. You earned attention but haven\'t fully earned permission to dig deeper yet.',
    },
    technical: {
      talkRatio: '70/30',
      questionQuality: 7,
      activeListening: 6,
    },
    summary: 'A strong opening pitch that establishes relevance and positions you as an expert. The hook works, but you could be more generous with insights before pivoting to questions.',
    what_worked: [
      'Specific reference to their Series B funding — shows you did homework',
      'Clear problem framing: "processes that got you here start breaking"',
      'Open-ended question that invites them to share their real concerns',
      'Positioning as expert for their specific stage',
    ],
    what_to_watch: [
      'Talk ratio is still high — you\'re talking more than they are at this point',
      'Could give a concrete insight before asking them to open up',
      'Permission-building could be stronger — you jumped to a big question quickly',
    ],
    one_move: 'Before your next big question, offer something valuable first. Try: "What I typically see at this stage is [specific pattern]. Does that resonate, or is your situation different?" This earns you the right to dig deeper.',
  },
  scenario_type: 'discovery',
  created_at: new Date().toISOString(),
  view_count: 1,
};

export default function ExampleInstantReportPage() {
  const report = SYNTHETIC_REPORT;
  const wtf = report.analysis.wtf;
  const technical = report.analysis.technical;

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-600';
    if (score >= 6) return 'bg-[#FFDE59] text-black';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-[#E51B23]';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return 'Exceptional';
    if (score >= 8) return 'Strong';
    if (score >= 6) return 'Solid';
    if (score >= 4) return 'Needs Work';
    return 'Major Gaps';
  };

  return (
    <div className="min-h-screen bg-black text-white font-poppins">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/examples" className="flex items-center gap-2">
            <span className="font-anton text-xl tracking-wider hover:opacity-80 transition-opacity">
              SALES<span className="text-[#E51B23]">OS</span>
            </span>
            <span className="text-white/50">/</span>
            <span className="text-white/70">Instant Report</span>
          </Link>
          <Link
            href="/call-lab-instant?utm_source=example"
            className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
          >
            Analyze Your Call Now
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Report Header */}
        <div className="text-center mb-12">
          <h1 className="font-anton text-4xl md:text-5xl tracking-wide mb-4">
            CALL LAB <span className="text-[#E51B23]">REPORT</span>
          </h1>
          <div className="text-white/50 text-sm">
            Example Report
            <span className="ml-3 px-2 py-1 bg-white/10 rounded">
              Discovery Call Opener
            </span>
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-white/5 border-2 border-[#E51B23] rounded-xl p-8 mb-8 text-center">
          <div className={`inline-block px-8 py-4 rounded-lg ${getScoreColor(report.score)} mb-4`}>
            <span className="font-anton text-6xl">{report.score}</span>
            <span className="text-2xl">/10</span>
          </div>
          <div className="text-xl font-semibold text-white/90 mb-2">
            {getScoreLabel(report.score)}
          </div>
          <p className="text-white/70 max-w-xl mx-auto">
            {report.analysis.summary}
          </p>
        </div>

        {/* WTF Method Assessment */}
        <div className="bg-[#1a1a1a] border-l-4 border-[#E51B23] rounded-r-lg p-8 mb-8">
          <h2 className="font-anton text-2xl text-[#E51B23] mb-6 tracking-wide">
            WTF SALES METHOD ASSESSMENT
          </h2>

          {/* WTF Scores Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Radical Relevance */}
            <div>
              <div className="text-4xl font-bold text-[#E51B23] mb-1">
                {wtf.radicalRelevance}/10
              </div>
              <div className="text-sm font-semibold text-white mb-2">
                Radical Relevance
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                {wtf.radicalRelevanceNote}
              </p>
              <p className="text-xs text-white/40 mt-2 italic">
                &quot;{wtf.radicalRelevanceEvidence}&quot;
              </p>
            </div>

            {/* Diagnostic Generosity */}
            <div>
              <div className="text-4xl font-bold text-[#E51B23] mb-1">
                {wtf.diagnosticGenerosity}/10
              </div>
              <div className="text-sm font-semibold text-white mb-2">
                Diagnostic Generosity
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                {wtf.diagnosticGenerosityNote}
              </p>
              <p className="text-xs text-white/40 mt-2 italic">
                &quot;{wtf.diagnosticGenerosityEvidence}&quot;
              </p>
            </div>

            {/* Permission-Based Progression */}
            <div>
              <div className="text-4xl font-bold text-[#E51B23] mb-1">
                {wtf.permissionProgression}/10
              </div>
              <div className="text-sm font-semibold text-white mb-2">
                Permission-Based Progression
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                {wtf.permissionProgressionNote}
              </p>
              <p className="text-xs text-white/40 mt-2 italic">
                &quot;{wtf.permissionProgressionEvidence}&quot;
              </p>
            </div>
          </div>

          {/* Overall Assessment */}
          <div className="bg-black/40 rounded p-4">
            <div className="text-sm text-white/80 leading-relaxed">
              <strong className="text-white">Overall:</strong> {wtf.overall}
            </div>
          </div>
        </div>

        {/* Technical Scores */}
        <div className="mb-8">
          <h3 className="font-anton text-lg text-white/70 mb-4 tracking-wide uppercase">
            Technical Scores
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] rounded p-4 text-center">
              <div className="text-2xl font-bold text-[#FFDE59]">{technical.talkRatio}</div>
              <div className="text-xs text-white/50 mt-1">Talk Ratio</div>
            </div>
            <div className="bg-[#1a1a1a] rounded p-4 text-center">
              <div className="text-2xl font-bold text-[#FFDE59]">{technical.questionQuality}/10</div>
              <div className="text-xs text-white/50 mt-1">Question Quality</div>
            </div>
            <div className="bg-[#1a1a1a] rounded p-4 text-center">
              <div className="text-2xl font-bold text-[#FFDE59]">{technical.activeListening}/10</div>
              <div className="text-xs text-white/50 mt-1">Active Listening</div>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-white/5 border-l-4 border-[#E51B23] rounded-r-lg p-6 mb-8">
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4 tracking-wide">
            YOUR TRANSCRIPT
          </h2>
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {report.transcript}
          </p>
        </div>

        {/* Analysis Sections */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* What Worked */}
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="font-anton text-xl text-green-400 mb-4 tracking-wide flex items-center gap-2">
              <span className="text-2xl">+</span> WHAT WORKED
            </h2>
            <ul className="space-y-3">
              {report.analysis.what_worked.map((item, i) => (
                <li key={i} className="text-white/80 pl-4 border-l-2 border-green-400/50">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What to Watch */}
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="font-anton text-xl text-orange-400 mb-4 tracking-wide flex items-center gap-2">
              <span className="text-2xl">-</span> WHAT TO WATCH
            </h2>
            <ul className="space-y-3">
              {report.analysis.what_to_watch.map((item, i) => (
                <li key={i} className="text-white/80 pl-4 border-l-2 border-orange-400/50">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* One Move */}
        <div className="bg-[#FFDE59]/10 border-l-4 border-[#FFDE59] rounded-r-lg p-6 mb-12">
          <h2 className="font-anton text-xl text-[#FFDE59] mb-4 tracking-wide">
            YOUR ONE MOVE
          </h2>
          <p className="text-white/90 text-lg leading-relaxed">
            {report.analysis.one_move}
          </p>
        </div>

        {/* CTA - Full Call Review */}
        <div className="bg-[#E51B23] rounded-lg p-8 text-center mb-12">
          <h2 className="font-anton text-2xl text-white mb-3 tracking-wide">
            Ready to analyze your pitch?
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Paste any sales pitch or call opener and get instant feedback with WTF Method scoring and actionable improvements.
          </p>
          <Link
            href="/call-lab-instant?utm_source=example"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Analyze Your Call Now →
          </Link>
        </div>

        {/* Upsell to Full Analysis */}
        <div className="bg-white/5 border border-[#333] rounded-lg p-8 text-center mb-8">
          <h2 className="font-anton text-xl text-[#FFDE59] mb-3 tracking-wide">
            Want deeper analysis?
          </h2>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            Call Lab analyzes full call transcripts with pattern recognition, tactical rewrites, and framework scoring.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/call-lab?utm_source=example"
              className="border border-[#333] text-white px-6 py-3 font-anton text-sm uppercase tracking-wider hover:border-white transition-colors"
            >
              Try Call Lab Free
            </Link>
            <Link
              href="/call-lab-pro?utm_source=example"
              className="border border-[#FFDE59] text-[#FFDE59] px-6 py-3 font-anton text-sm uppercase tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
            >
              See Call Lab Pro
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/examples"
            className="text-white/50 text-sm hover:text-white transition-colors"
          >
            ← Back to Examples
          </Link>
          <span className="text-white/40 text-sm">Example data • Not a real report</span>
        </div>
      </footer>
    </div>
  );
}
