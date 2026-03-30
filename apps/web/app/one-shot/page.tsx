'use client';

import React, { useState } from 'react';
import {
  ConsolePanel,
  ConsoleHeading,
  ConsoleButton,
  ConsoleInput,
} from '@/components/console';
import { Copy, Check, ExternalLink, Mail, MessageSquare, Target, Sparkles } from 'lucide-react';

const LOADING_MESSAGES = [
  'Researching agency website...',
  'Pulling hero copy and positioning...',
  'Checking LinkedIn presence...',
  'Scanning for buried treasure...',
  'Detecting jargon sins...',
  'Writing the one-shot rewrite...',
  'Drafting social post...',
  'Composing outreach email...',
];

function OneShotLoading() {
  const [messageIndex, setMessageIndex] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2 font-mono text-sm">
      {LOADING_MESSAGES.slice(0, messageIndex + 1).map((msg, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[#E51B23]">&gt;</span>
          <span
            className={
              i === messageIndex ? 'text-[#FFDE59] animate-pulse' : 'text-gray-500'
            }
          >
            {msg}
          </span>
          {i < messageIndex && <span className="text-green-500">&#10003;</span>}
        </div>
      ))}
    </div>
  );
}

interface OneShotReport {
  agencyName: string;
  agencyUrl: string;
  ceoName: string | null;
  ceoLinkedIn: string | null;
  score: {
    overall: number;
    archetype: string;
    archetypeReasoning: string;
    jargonSins: Array<{ phrase: string; sin: string }>;
    buriedTreasure: string;
    timsTake: string;
  };
  oneShot: {
    hero: {
      headline: string;
      subheadline: string;
      supportingParagraph: string;
    };
    whyUs: string;
    servicesIntro: string;
    changeNotes: string;
  };
  socialPost: string;
  outreachEmail: {
    subjectLine: string;
    body: string;
  };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-[#E51B23]/20 border border-[#E51B23]/40 text-[#E51B23] rounded hover:bg-[#E51B23]/30 transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'text-green-400 border-green-400/40'
      : score >= 40
        ? 'text-yellow-400 border-yellow-400/40'
        : 'text-[#E51B23] border-[#E51B23]/40';

  return (
    <div
      className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${color}`}
    >
      <span className="text-3xl font-bold font-mono">{score}</span>
    </div>
  );
}

export default function OneShotPage() {
  const [agencyUrl, setAgencyUrl] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<OneShotReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'score' | 'rewrite' | 'social' | 'email'
  >('score');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch('/api/one-shot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_url: agencyUrl.trim(),
          agency_name: agencyName.trim() || undefined,
          ceo_name: ceoName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setReport(data.report);
      setActiveTab('score');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-[#E51B23]/30 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-[#E51B23]">ONE-SHOT</span> MACHINE
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Grab an agency website. Score it. Rewrite it. Ship the outreach.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Input Form */}
        <ConsolePanel className="mb-8">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
                Agency Website URL *
              </label>
              <ConsoleInput
                type="text"
                value={agencyUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAgencyUrl(e.target.value)
                }
                placeholder="https://someagency.com"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
                  Agency Name (optional)
                </label>
                <ConsoleInput
                  type="text"
                  value={agencyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAgencyName(e.target.value)
                  }
                  placeholder="Acme Digital"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
                  CEO/Founder Name (optional)
                </label>
                <ConsoleInput
                  type="text"
                  value={ceoName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCeoName(e.target.value)
                  }
                  placeholder="Jane Smith"
                />
              </div>
            </div>
            <ConsoleButton type="submit" disabled={isLoading || !agencyUrl.trim()}>
              {isLoading ? 'Analyzing...' : 'Run One-Shot'}
            </ConsoleButton>
          </form>
        </ConsolePanel>

        {/* Loading */}
        {isLoading && (
          <ConsolePanel className="mb-8">
            <OneShotLoading />
          </ConsolePanel>
        )}

        {/* Error */}
        {error && (
          <ConsolePanel className="mb-8">
            <p className="text-[#E51B23] font-medium">Error: {error}</p>
          </ConsolePanel>
        )}

        {/* Results */}
        {report && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'score' as const, label: 'Score & Diagnosis', icon: Target },
                { key: 'rewrite' as const, label: 'One-Shot Rewrite', icon: Sparkles },
                { key: 'social' as const, label: 'Social Post', icon: MessageSquare },
                { key: 'email' as const, label: 'CEO Email', icon: Mail },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-[#E51B23] text-white bg-black'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* Score & Diagnosis */}
            {activeTab === 'score' && (
              <ConsolePanel>
                <div className="space-y-8">
                  {/* Agency Info + Score */}
                  <div className="flex items-start justify-between">
                    <div>
                      <ConsoleHeading>
                        {report.agencyName || 'Agency Analysis'}
                      </ConsoleHeading>
                      <a
                        href={report.agencyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-[#E51B23] flex items-center gap-1"
                      >
                        {report.agencyUrl} <ExternalLink size={12} />
                      </a>
                      {report.ceoName && (
                        <p className="text-sm text-gray-400 mt-1">
                          CEO: {report.ceoName}
                          {report.ceoLinkedIn && (
                            <>
                              {' '}
                              <a
                                href={report.ceoLinkedIn}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#E51B23] hover:underline"
                              >
                                LinkedIn
                              </a>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <ScoreBadge score={report.score.overall} />
                  </div>

                  {/* Archetype */}
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#FFDE59] mb-2">
                      Archetype
                    </h3>
                    <p className="text-lg font-bold text-white">
                      {report.score.archetype}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {report.score.archetypeReasoning}
                    </p>
                  </div>

                  {/* Tim's Take */}
                  <div className="border-l-4 border-[#E51B23] pl-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#E51B23] mb-2">
                      Tim&apos;s Take
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {report.score.timsTake}
                    </p>
                  </div>

                  {/* Jargon Sins */}
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#E51B23] mb-3">
                      Jargon Sins
                    </h3>
                    <div className="space-y-3">
                      {report.score.jargonSins.map((sin, i) => (
                        <div
                          key={i}
                          className="bg-[#E51B23]/10 border border-[#E51B23]/20 rounded p-3"
                        >
                          <p className="text-white font-mono text-sm">
                            &ldquo;{sin.phrase}&rdquo;
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            {sin.sin}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buried Treasure */}
                  <div className="bg-[#FFDE59]/10 border border-[#FFDE59]/30 rounded p-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#FFDE59] mb-2">
                      Buried Treasure
                    </h3>
                    <p className="text-gray-200 leading-relaxed">
                      {report.score.buriedTreasure}
                    </p>
                  </div>
                </div>
              </ConsolePanel>
            )}

            {/* One-Shot Rewrite */}
            {activeTab === 'rewrite' && (
              <ConsolePanel>
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-[#FFDE59]">
                        Hero Rewrite
                      </h3>
                      <CopyButton
                        text={`${report.oneShot.hero.headline}\n\n${report.oneShot.hero.subheadline}\n\n${report.oneShot.hero.supportingParagraph}`}
                        label="Copy Hero"
                      />
                    </div>
                    <div className="bg-white/5 rounded p-6 space-y-3">
                      <h2 className="text-2xl font-bold text-white">
                        {report.oneShot.hero.headline}
                      </h2>
                      <p className="text-lg text-gray-300">
                        {report.oneShot.hero.subheadline}
                      </p>
                      <p className="text-gray-400 leading-relaxed">
                        {report.oneShot.hero.supportingParagraph}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-[#FFDE59]">
                        Why Us Rewrite
                      </h3>
                      <CopyButton text={report.oneShot.whyUs} label="Copy" />
                    </div>
                    <div className="bg-white/5 rounded p-6">
                      <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                        {report.oneShot.whyUs}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-[#FFDE59]">
                        Services Intro Rewrite
                      </h3>
                      <CopyButton
                        text={report.oneShot.servicesIntro}
                        label="Copy"
                      />
                    </div>
                    <div className="bg-white/5 rounded p-6">
                      <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                        {report.oneShot.servicesIntro}
                      </p>
                    </div>
                  </div>

                  {/* Change Notes */}
                  <div className="border-l-4 border-[#E51B23] pl-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#E51B23] mb-2">
                      What Changed & Why
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {report.oneShot.changeNotes}
                    </p>
                  </div>
                </div>
              </ConsolePanel>
            )}

            {/* Social Post */}
            {activeTab === 'social' && (
              <ConsolePanel>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#FFDE59]">
                      Anonymized LinkedIn/X Post
                    </h3>
                    <CopyButton text={report.socialPost} label="Copy Post" />
                  </div>
                  <div className="bg-white/5 rounded p-6">
                    <p className="text-gray-200 leading-relaxed whitespace-pre-line font-mono text-sm">
                      {report.socialPost}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    Agency name and founder name have been replaced with
                    placeholders. Ready to post.
                  </p>
                </div>
              </ConsolePanel>
            )}

            {/* CEO Outreach Email */}
            {activeTab === 'email' && (
              <ConsolePanel>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[#FFDE59]">
                      CEO Outreach Email
                    </h3>
                    <div className="flex gap-2">
                      <CopyButton
                        text={report.outreachEmail.subjectLine}
                        label="Copy Subject"
                      />
                      <CopyButton
                        text={report.outreachEmail.body}
                        label="Copy Body"
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded p-6 space-y-4">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">
                        Subject:
                      </span>
                      <p className="text-white font-medium mt-1">
                        {report.outreachEmail.subjectLine}
                      </p>
                    </div>
                    <hr className="border-gray-800" />
                    <div>
                      <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                        {report.outreachEmail.body}
                      </p>
                    </div>
                  </div>
                  {report.ceoName && (
                    <p className="text-xs text-gray-600">
                      Addressed to: {report.ceoName}
                      {report.ceoLinkedIn && ` (${report.ceoLinkedIn})`}
                    </p>
                  )}
                </div>
              </ConsolePanel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
