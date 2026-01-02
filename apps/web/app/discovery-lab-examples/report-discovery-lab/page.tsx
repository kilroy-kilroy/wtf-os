'use client';

import Link from 'next/link';

/**
 * Example Discovery Lab Report Page
 *
 * Public showcase of a Discovery Lab (free) report with synthetic data.
 * No auth required - all data is hardcoded.
 */

const SYNTHETIC_REPORT = {
  prospect: {
    name: 'Sarah Chen',
    title: 'VP of Operations',
    company: 'TechCorp',
    linkedin: 'linkedin.com/in/sarahchen',
    email: 'sarah.chen@techcorp.io',
  },
  company: {
    name: 'TechCorp',
    website: 'techcorp.io',
    industry: 'Enterprise SaaS',
    size: '150-200 employees',
    funding: 'Series B ($45M)',
    founded: '2019',
    headquarters: 'San Francisco, CA',
    description: 'TechCorp provides enterprise workflow automation solutions for mid-market companies. Known for rapid growth and strong customer retention.',
  },
  recentNews: [
    {
      headline: 'TechCorp Raises $45M Series B to Accelerate Enterprise Growth',
      date: 'Nov 2024',
      summary: 'Funding led by Accel Partners to expand sales team and enter European market.',
    },
    {
      headline: 'TechCorp Named to Forbes Cloud 100 Rising Stars',
      date: 'Oct 2024',
      summary: 'Recognition for 200% YoY revenue growth and 95% customer retention rate.',
    },
    {
      headline: 'New CTO Hire from Stripe',
      date: 'Sep 2024',
      summary: 'Former Stripe engineering director joins to scale technical infrastructure.',
    },
  ],
  talkingPoints: [
    {
      topic: 'Series B Growth Challenges',
      why: 'Post-funding companies typically struggle with scaling operations. This is your opening.',
      hook: '"Congrats on the Series B — that usually means the scaling challenges are about to get real. How are you thinking about that?"',
    },
    {
      topic: 'European Expansion',
      why: 'New market entry creates operational complexity — exactly what you solve.',
      hook: '"I saw you\'re heading into Europe. What\'s your biggest concern about scaling ops across time zones?"',
    },
    {
      topic: 'Rapid Team Growth',
      why: 'Growing from 100 to 200 people breaks every process. They\'re feeling this pain.',
      hook: '"Going from 150 to 300 people in a year — what processes are already starting to crack?"',
    },
  ],
  questionsToAsk: [
    'What does your tech stack look like for managing operations today?',
    'When you think about doubling the team, what keeps you up at night?',
    'How much time does your team spend on manual processes vs. strategic work?',
    'What would "success" look like for operations 12 months from now?',
    'Who else is involved in decisions around operational tooling?',
  ],
};

export default function ExampleDiscoveryReportPage() {
  const report = SYNTHETIC_REPORT;

  return (
    <div className="min-h-screen bg-black font-poppins">
      {/* Header */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/discovery-lab-examples" className="flex items-center gap-3">
            <div className="font-anton text-xl tracking-wide">
              <span className="text-white">DISCOVERY</span>
              <span className="text-[#E51B23]">LAB</span>
            </div>
          </Link>
          <Link
            href="/discovery-lab?utm_source=example"
            className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
          >
            Try It Free
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Report Header */}
        <div className="mb-8">
          <h1 className="font-anton text-3xl text-[#FFDE59] uppercase tracking-wide mb-2">
            Discovery Lab - Prospect Intel
          </h1>
          <p className="text-[#666] text-sm">
            Generated Dec 12, 2024 • Pre-call research for {report.prospect.name}
          </p>
        </div>

        {/* Prospect Card */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-anton text-2xl text-white uppercase tracking-wide">
                {report.prospect.name}
              </h2>
              <p className="text-[#FFDE59]">{report.prospect.title}</p>
              <p className="text-[#B3B3B3]">{report.company.name}</p>
            </div>
            <div className="text-right text-sm text-[#666]">
              <p>{report.prospect.email}</p>
              <p>{report.prospect.linkedin}</p>
            </div>
          </div>
        </div>

        {/* Company Overview */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6 mb-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Company Overview
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-[#B3B3B3] mb-4">{report.company.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#666]">Industry</span>
                  <span className="text-white">{report.company.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Size</span>
                  <span className="text-white">{report.company.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Funding</span>
                  <span className="text-white">{report.company.funding}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Founded</span>
                  <span className="text-white">{report.company.founded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">HQ</span>
                  <span className="text-white">{report.company.headquarters}</span>
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] rounded p-4">
              <h3 className="text-white font-semibold mb-3">Recent News</h3>
              <div className="space-y-3">
                {report.recentNews.map((news, i) => (
                  <div key={i} className="border-b border-[#333] pb-3 last:border-0 last:pb-0">
                    <p className="text-white text-sm font-medium">{news.headline}</p>
                    <p className="text-[#666] text-xs">{news.date}</p>
                    <p className="text-[#B3B3B3] text-xs mt-1">{news.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Talking Points */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6 mb-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Conversation Starters
          </h2>
          <div className="space-y-4">
            {report.talkingPoints.map((point, i) => (
              <div key={i} className="bg-[#1A1A1A] border-l-4 border-[#FFDE59] p-4 rounded-r">
                <h3 className="text-white font-semibold mb-1">{point.topic}</h3>
                <p className="text-[#B3B3B3] text-sm mb-3">{point.why}</p>
                <div className="bg-black/50 p-3 rounded">
                  <p className="text-[#666] text-xs mb-1">OPENING HOOK:</p>
                  <p className="text-[#FFDE59] text-sm italic">{point.hook}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions to Ask */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6 mb-8">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Questions to Ask
          </h2>
          <ol className="space-y-2">
            {report.questionsToAsk.map((question, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-[#FFDE59] font-anton">{i + 1}.</span>
                <span className="text-[#B3B3B3]">{question}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-[#111] border-2 border-[#E51B23] rounded-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="font-anton text-2xl text-[#FFDE59] uppercase tracking-wide mb-2">
              Discovery Lab showed you the basics.
            </h2>
            <h3 className="font-anton text-xl text-white uppercase tracking-wide">
              Discovery Lab Pro shows you how to win.
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Stakeholder Map:</span> Every decision-maker and their priorities</div>
              <div>→ <span className="text-white">Competitive Intel:</span> What they&apos;re using now and why they might switch</div>
              <div>→ <span className="text-white">Objection Predictions:</span> What they&apos;ll push back on and how to handle it</div>
            </div>
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Custom Talk Tracks:</span> Word-for-word scripts for this specific prospect</div>
              <div>→ <span className="text-white">Trigger Events:</span> The moments that make them ready to buy</div>
              <div>→ <span className="text-white">Deal Strategy:</span> The path from first call to closed-won</div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/discovery-lab-pro?utm_source=example"
              className="inline-block bg-[#E51B23] text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#C41820] transition-colors"
            >
              Unlock Pro Intelligence →
            </Link>
          </div>
        </div>

        {/* Main CTA */}
        <div className="bg-[#E51B23] rounded-lg p-8 text-center mb-8">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wide mb-3">
            Ready to research your prospects?
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Discovery Lab is completely free. Enter a prospect and get your intel in under 60 seconds.
          </p>
          <Link
            href="/discovery-lab?utm_source=example"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Try It Free →
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#333] pt-8">
          <div className="flex items-center justify-between">
            <Link
              href="/discovery-lab-examples"
              className="text-[#B3B3B3] text-sm hover:text-white transition-colors"
            >
              ← Back to Discovery Lab Examples
            </Link>
            <span className="text-[#666] text-sm">Example data • Not a real report</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
