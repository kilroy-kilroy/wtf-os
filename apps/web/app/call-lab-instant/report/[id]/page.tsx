'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface WtfScores {
  radicalRelevance: number;
  radicalRelevanceNote: string;
  radicalRelevanceEvidence?: string;
  radicalRelevanceImprove?: string;
  diagnosticGenerosity: number;
  diagnosticGenerosityNote: string;
  diagnosticGenerosityEvidence?: string;
  diagnosticGenerosityImprove?: string;
  permissionProgression: number;
  permissionProgressionNote: string;
  permissionProgressionEvidence?: string;
  permissionProgressionImprove?: string;
  overall: string;
}

interface TechnicalScores {
  talkRatio?: string;
  questionQuality?: number;
  activeListening?: number;
}

interface ReportData {
  id: string;
  score: number;
  transcript: string;
  analysis: {
    wtf?: WtfScores;
    technical?: TechnicalScores;
    summary: string;
    what_worked: string[];
    what_to_watch: string[];
    one_move: string;
  };
  scenario_type?: string;
  created_at: string;
  view_count: number;
}

export default function ReportPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/call-lab-instant/report?id=${reportId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load report');
        }

        setReport(data.report);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const scenarioLabels: Record<string, string> = {
    discovery: 'Discovery Call Opener',
    value_prop: 'Value Proposition Pitch',
    pricing: 'Pricing Presentation',
    objection: 'Objection Response',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#E51B23]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xl">Loading report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <h1 className="font-anton text-4xl text-[#E51B23] mb-4">REPORT NOT FOUND</h1>
        <p className="text-white/70 mb-8">{error || 'This report may have been deleted or the link is invalid.'}</p>
        <a
          href="/call-lab-instant"
          className="bg-[#E51B23] text-white px-8 py-4 font-bold uppercase tracking-wide hover:bg-[#FFDE59] hover:text-black transition-colors"
        >
          Analyze a New Pitch
        </a>
      </div>
    );
  }

  const wtf = report.analysis.wtf;
  const technical = report.analysis.technical;

  return (
    <div className="min-h-screen bg-black text-white font-poppins">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="font-anton text-xl tracking-wider hover:opacity-80 transition-opacity">
              SALES<span className="text-[#E51B23]">OS</span>
            </a>
            <span className="text-white/50">/</span>
            <span className="text-white/70">Call Lab Report</span>
          </div>
          <a
            href="/call-lab-instant"
            className="text-sm text-[#FFDE59] hover:underline"
          >
            Analyze Another Pitch
          </a>
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
            {formatDate(report.created_at)}
            {report.scenario_type && (
              <span className="ml-3 px-2 py-1 bg-white/10 rounded">
                {scenarioLabels[report.scenario_type] || report.scenario_type}
              </span>
            )}
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

        {/* WTF Method Assessment - PROMINENT */}
        {wtf && (
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
                {wtf.radicalRelevanceEvidence && (
                  <p className="text-xs text-white/40 mt-2 italic">
                    &quot;{wtf.radicalRelevanceEvidence}&quot;
                  </p>
                )}
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
                {wtf.diagnosticGenerosityEvidence && (
                  <p className="text-xs text-white/40 mt-2 italic">
                    &quot;{wtf.diagnosticGenerosityEvidence}&quot;
                  </p>
                )}
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
                {wtf.permissionProgressionEvidence && (
                  <p className="text-xs text-white/40 mt-2 italic">
                    &quot;{wtf.permissionProgressionEvidence}&quot;
                  </p>
                )}
              </div>
            </div>

            {/* Overall Assessment */}
            <div className="bg-black/40 rounded p-4">
              <div className="text-sm text-white/80 leading-relaxed">
                <strong className="text-white">Overall:</strong> {wtf.overall}
              </div>
            </div>
          </div>
        )}

        {/* Technical Scores */}
        {technical && (
          <div className="mb-8">
            <h3 className="font-anton text-lg text-white/70 mb-4 tracking-wide uppercase">
              Technical Scores
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {technical.talkRatio && (
                <div className="bg-[#1a1a1a] rounded p-4 text-center">
                  <div className="text-2xl font-bold text-[#FFDE59]">{technical.talkRatio}</div>
                  <div className="text-xs text-white/50 mt-1">Talk Ratio</div>
                </div>
              )}
              {technical.questionQuality !== undefined && (
                <div className="bg-[#1a1a1a] rounded p-4 text-center">
                  <div className="text-2xl font-bold text-[#FFDE59]">{technical.questionQuality}/10</div>
                  <div className="text-xs text-white/50 mt-1">Question Quality</div>
                </div>
              )}
              {technical.activeListening !== undefined && (
                <div className="bg-[#1a1a1a] rounded p-4 text-center">
                  <div className="text-2xl font-bold text-[#FFDE59]">{technical.activeListening}/10</div>
                  <div className="text-xs text-white/50 mt-1">Active Listening</div>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* CTAs */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Try Another */}
          <a
            href="/call-lab-instant"
            className="block bg-white/10 border border-white/20 rounded-lg p-6 text-center hover:border-[#E51B23] transition-colors group"
          >
            <h3 className="font-anton text-xl text-white mb-2 group-hover:text-[#FFDE59] transition-colors">
              ANALYZE ANOTHER PITCH
            </h3>
            <p className="text-white/60 text-sm">
              Practice makes perfect. Record another 30 seconds.
            </p>
          </a>

          {/* Upgrade */}
          <a
            href="/call-lab-pro"
            className="block bg-[#E51B23] rounded-lg p-6 text-center hover:bg-[#E51B23]/80 transition-colors"
          >
            <h3 className="font-anton text-xl text-white mb-2">
              UPGRADE TO PRO
            </h3>
            <p className="text-white/80 text-sm">
              Track your WTF scores over time. See patterns across all your calls.
            </p>
          </a>
        </div>

        {/* WTF Guide CTA */}
        <div className="bg-black border-2 border-[#FFDE59] rounded-lg p-8 text-center">
          <h2 className="font-anton text-2xl text-[#FFDE59] mb-3 tracking-wide">
            WANT THE FULL FRAMEWORK?
          </h2>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            Learn the WTF Sales Method - the 3-pillar trust layer that makes every other sales methodology actually work.
          </p>
          <a
            href="/wtf-sales-guide"
            className="inline-block bg-[#FFDE59] text-black px-8 py-4 font-bold uppercase tracking-wide hover:bg-white transition-colors"
          >
            Read the WTF Sales Guide
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white/40 text-sm">
            Tim Kilroy - Agency Sales Coach
          </p>
          <a href="https://timkilroy.com" className="text-[#E51B23] text-sm hover:underline">
            timkilroy.com
          </a>
        </div>
      </footer>
    </div>
  );
}
