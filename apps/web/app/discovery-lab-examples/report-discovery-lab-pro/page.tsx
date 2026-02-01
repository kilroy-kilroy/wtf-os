'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Example Discovery Lab Pro Report Page
 *
 * Public showcase of a Discovery Lab Pro report with synthetic data.
 * Updated to match the new format with Top 5 Findings, Prospect Psychology,
 * Objection Handles, What We Don't Know, and other Pro sections.
 * No auth required - all data is hardcoded.
 */

const SYNTHETIC_REPORT = {
  // Meta
  targetCompany: 'TechCorp',
  targetWebsite: 'techcorp.io',
  targetContact: 'Sarah Chen',
  targetTitle: 'VP of Operations',

  // Top 5 Findings
  findings: [
    {
      title: 'Series B Creates Urgency Window',
      what: 'TechCorp closed $45M Series B in Nov 2024. Investors expect operational leverage and efficient scaling -- not more headcount solving process problems.',
      why: 'Post-funding companies have 6-12 months to show operational efficiency gains before the board starts asking questions. This is your urgency lever.',
      action: 'Frame your solution as the operational infrastructure their investors expect. Reference the gap between headcount growth and process maturity.',
      confidence: 'HIGH -- Series B confirmed via Forbes Cloud 100 and company announcements.',
    },
    {
      title: 'European Expansion Will Break Current Processes',
      what: 'TechCorp is expanding to Europe in Q1. Their current stack (Asana + custom tools) was built for one timezone and one market.',
      why: 'Multi-timezone operations expose every manual process. What works at 150 people in SF will collapse at 250 across three time zones.',
      action: 'Use Europe launch as the forcing function. "If your processes are struggling now, what happens when half your team is 9 hours ahead?"',
      confidence: 'HIGH -- European expansion mentioned in multiple company updates and job postings.',
    },
    {
      title: 'New CTO Is Consolidating Tech Stack',
      what: 'David Park joined from Stripe in Sep 2024. CTOs from high-growth companies typically audit and consolidate within 6 months of arrival.',
      why: 'He could be your champion (modernization) or your blocker (consolidation means fewer tools, not more). You need to know which one fast.',
      action: 'Position as consolidation play, not addition. "We replace 3 tools, not add a 4th." Get intel from Sarah on his priorities before the demo.',
      confidence: 'MEDIUM -- CTO hire confirmed, consolidation stance is inferred from Stripe background.',
    },
    {
      title: 'Champion Needs Help Building the Business Case',
      what: 'Sarah is VP of Ops, not C-suite. She likely sees the problem clearly but needs ammo to sell internally -- especially to a data-driven CEO.',
      why: 'If you don\'t arm her with ROI data and a clear narrative, the deal stalls at "I need to run this by my CEO."',
      action: 'Offer to build the business case WITH her. "I can put together a one-pager with the ROI calculation you can share with Marcus. I\'ve done this for other ops leaders."',
      confidence: 'HIGH -- VP-level champion needing executive buy-in is a common and reliable pattern.',
    },
    {
      title: 'Current Solution Is Duct Tape, Not Infrastructure',
      what: 'They\'re running on Asana + custom internal tools. This works until it doesn\'t -- and at their growth rate, "doesn\'t" is coming fast.',
      why: 'Custom internal tools have hidden maintenance costs. Every new hire means more duct tape. Sarah probably already knows this but hasn\'t quantified it.',
      action: 'Help her calculate the real cost: engineering hours maintaining custom tools + onboarding time + error rate. Make the invisible visible.',
      confidence: 'MEDIUM -- Tech stack confirmed, pain level inferred from growth rate and company stage.',
    },
  ],

  // Executive Summary
  executiveSummary:
    'TechCorp is a Series B SaaS company growing at 200% YoY with a 150-person team about to double. They\'re running on Asana and custom internal tools that were built for a company half their size. European expansion in Q1 will break what\'s already straining. The new CTO from Stripe is likely consolidating the tech stack. Sarah Chen (your champion) is a data-driven operator who needs ROI ammo to sell internally. This is a high-urgency opportunity with a clear pain, a definable timeline, and a champion who wants to move -- if you help her build the case.',

  // Authority Snapshot
  serviceReframed: 'Operational infrastructure that replaces duct-tape workflows with scalable automation -- so TechCorp can double headcount without doubling process chaos.',
  recentSignals: 'Series B closed ($45M), European expansion Q1, new CTO from Stripe, 12 ops-related job postings in last 60 days.',
  authorityLine: 'You\'ve built TechCorp into a workflow automation leader -- my lane is making sure your internal operations scale as fast as your product, so your "scaling wall" doesn\'t become the thing that slows down everything else.',

  // Prospect Psychology
  psychology: {
    success: 'Processes that scale without adding headcount. Clear metrics. Board-ready operational dashboard.',
    fears: 'Implementation disrupts the team during growth. Adoption fails. She championed a tool that nobody uses.',
    need: '"This won\'t add work. It replaces work. And here\'s the data to prove it."',
    yes: 'Concrete ROI with timeline. Peer company proof. Low-risk entry point (pilot, not company-wide).',
  },

  // Pain / Impact Probes
  primaryProbes: [
    {
      tag: 'PRIMARY',
      question: 'Walk me through what happens when a new employee joins TechCorp today -- how does onboarding actually work?',
      followup: 'What breaks when you\'re doing that 10 times a month instead of 3?',
    },
    {
      tag: 'PRIMARY',
      question: 'You mentioned "scaling wall" -- what does that look like in your day-to-day? Where do you feel it most?',
      followup: 'If that continues for another 6 months while you\'re also launching Europe, what happens?',
    },
    {
      tag: 'PRIMARY',
      question: 'How much engineering time is going into maintaining your custom internal tools right now?',
      followup: 'What else could those engineers be building if they weren\'t patching workflows?',
    },
    {
      tag: 'PRIMARY',
      question: 'If you could wave a magic wand and fix one operational headache, what would it be?',
      followup: 'What\'s the downstream impact of leaving that unfixed through Q2?',
    },
    {
      tag: 'PRIMARY',
      question: 'How does your team handle cross-timezone work today? What happens when something urgent comes up at 3am SF time?',
      followup: 'What does that look like with a European team that\'s 9 hours ahead?',
    },
  ],
  secondaryProbes: [
    {
      tag: 'SECONDARY',
      question: 'Who else would need to be involved in evaluating something like this?',
      followup: 'What does David (CTO) care about most when it comes to new tools?',
    },
    {
      tag: 'SECONDARY',
      question: 'Have you tried to solve this before? What happened?',
      followup: 'What would need to be different this time for it to work?',
    },
    {
      tag: 'SECONDARY',
      question: 'What does success look like for your team in the next 12 months -- what does Marcus expect from Ops post-Series B?',
      followup: 'How are you measuring that today?',
    },
  ],

  // Market & Competitor Hooks
  hooks: [
    {
      name: 'The Post-Series B Ops Crunch',
      description: 'Companies that raise B rounds typically hit an operational inflection point within 6-12 months. Growth outpaces process, and the things that worked at 50 people actively break at 200.',
    },
    {
      name: 'The Custom Tool Trap',
      description: 'Internal tools are free until they\'re not. The hidden cost is engineering hours, technical debt, and the fact that nobody documents them -- which means they become single points of failure.',
    },
    {
      name: 'Multi-Market Operations',
      description: 'Companies expanding internationally typically see a 40% increase in operational complexity per new market. The ones that thrive automate before they expand, not after.',
    },
    {
      name: 'The CTO Consolidation Wave',
      description: 'New CTOs from high-growth companies (Stripe, Datadog, Figma) are consolidating tech stacks within their first year. Position as the consolidation play.',
    },
  ],

  // Competitor Positioning
  competitors: [
    {
      name: 'Asana',
      strength: 'Team familiarity. Low switching cost for basic project tracking. Sarah\'s team knows it.',
      weakness: 'Not built for workflow automation. No cross-team orchestration. Custom fields are a band-aid.',
      positioning: 'Don\'t compete with Asana on task management. Position as the automation layer that makes Asana unnecessary for ops workflows.',
      question: 'What are you using Asana for that it wasn\'t really designed to do?',
    },
    {
      name: 'Monday.com',
      strength: 'Visual interface. Good marketing. Mid-market name recognition.',
      weakness: 'They evaluated it 6 months ago and called it "a spreadsheet with colors." Too rigid for their workflow.',
      positioning: 'They already rejected Monday. Use this: "You tried the visual tools. The issue isn\'t the interface -- it\'s the automation underneath."',
      question: 'When you looked at Monday, what specifically felt too rigid?',
    },
    {
      name: 'Custom Internal Tools',
      strength: 'Built exactly for their current workflow. No vendor dependency. "It works."',
      weakness: 'High maintenance cost. No one documents it. Breaks when the engineer who built it leaves. Doesn\'t scale to Europe.',
      positioning: 'Don\'t trash their tools. Acknowledge the ingenuity. Then: "The question is whether those tools scale to 300 people across 3 time zones."',
      question: 'How much of your engineering bandwidth is going to maintaining internal tools vs. building product?',
    },
  ],

  // Emotional / Identity Probe
  emotionalProbe: 'You built TechCorp\'s operations from the ground up. When you think about what this team looks like at 300 people -- is the version you\'re imagining one you\'re excited about, or one that keeps you up at night?',

  // Quick Discovery Flow
  flowSteps: [
    {
      title: 'Opening Authority Position',
      script: 'Sarah, I know your time is tight so I\'ll be direct. I saw TechCorp just closed Series B -- congrats. In my experience, that\'s usually when ops challenges shift from "annoying" to "blocking growth." I\'m curious whether that\'s resonating with what you\'re seeing?',
    },
    {
      title: 'Current State Probe',
      script: 'Walk me through a typical week for your ops team. Where are the biggest time sinks right now?',
    },
    {
      title: 'Pain Amplification',
      script: 'When you say "starting to break" -- help me understand what that looks like day to day. Is it more about things falling through cracks, or people spending too much time on manual work?',
    },
    {
      title: 'Future State Vision',
      script: 'If we fast-forward 12 months and the ops team is humming -- what does that look like? What\'s different?',
    },
    {
      title: 'Impact Quantification',
      script: 'If you had to put a number on what this is costing you per month -- in time, money, or missed opportunities -- what would that be?',
    },
    {
      title: 'Next Steps',
      script: 'Based on what you shared about the Q2 deadline and the Europe launch, I think there\'s a conversation worth having. I have time Tuesday at 2pm or Thursday at 10am -- which works better for a 30-minute deep dive?',
    },
  ],

  // Conversation Decision Tree
  decisionBranches: [
    {
      condition: 'If they\'re skeptical about adding another tool...',
      guidance: 'Don\'t fight it. Acknowledge the tool fatigue, then reposition.',
      script: 'I hear that a lot. The last thing you need is another tool your team has to learn. The question is whether your current stack can handle 300 people across 3 time zones. If it can, we should stop talking. If it can\'t, let\'s figure out what actually needs to change.',
    },
    {
      condition: 'If they say timing isn\'t right...',
      guidance: 'Use the Europe launch as the forcing function.',
      script: 'Totally get it. But here\'s what I\'ve seen: companies that try to fix ops after they expand internationally spend 3x more. What if we scoped a pilot that launches alongside Europe, not after?',
    },
    {
      condition: 'If they want to include the CTO...',
      guidance: 'This is a buying signal. Help them set it up.',
      script: 'That\'s exactly the right move. I can prepare a technical brief for David that focuses on integrations, security, and how we replace complexity instead of adding it. Want me to draft that so you can send it ahead of the meeting?',
    },
    {
      condition: 'If they ask about pricing too early...',
      guidance: 'Deflect gracefully. Position as advisor, not salesperson.',
      script: 'Happy to talk numbers, but I want to make sure I\'m not wasting your time. Based on what you\'ve shared, I\'m not even sure we\'re the right fit yet. Can I ask a couple more questions to figure that out?',
    },
  ],

  // What They'll Google
  googleItems: [
    { label: "WHAT THEY'LL SEARCH", value: '"workflow automation for scaling companies" "Asana alternative for operations" "operational efficiency tools Series B"' },
    { label: 'WHAT YOU WANT THEM TO FIND', value: 'Your case studies with similar companies. Comparison pages positioning you vs. Asana/Monday for ops workflows. ROI calculator.' },
    { label: 'SEEDS TO PLANT', value: 'Mention a specific case study during the call: "The team at [company] was in your exact situation -- Series B, 150 people, Europe expansion. I can send you what they did."' },
  ],

  // Opening 60 Seconds
  openingParts: [
    { label: 'AUTHORITY FRAME (15 sec)', script: 'Sarah, I work with Series B ops leaders who are hitting the scaling wall -- where the processes that got you to 150 people start breaking as you head toward 300.' },
    { label: 'REASON FOR CALL (15 sec)', script: 'I saw TechCorp just closed your B round and you\'re expanding to Europe. That\'s usually the moment when ops goes from "we should fix this" to "we need to fix this now."' },
    { label: 'PERMISSION QUESTION (10 sec)', script: 'Is that resonating with what you\'re seeing, or am I off base?' },
    { label: 'TRANSITION (10 sec)', script: 'Great. Help me understand where it\'s hitting hardest -- walk me through what a typical week looks like for your team right now.' },
  ],

  // Objection Handles
  objections: [
    {
      objection: '"We\'re too busy to implement something new right now."',
      handle: 'That\'s exactly why companies in your position reach out to us. The longer you wait, the more manual work compounds. What if I showed you how a similar company implemented in 2 weeks with zero disruption to their team?',
    },
    {
      objection: '"We already have Asana -- why would we add another tool?"',
      handle: 'Most of our customers started with Asana too. The question isn\'t whether Asana is bad -- it\'s whether it can handle what you need at 300 people across 3 time zones. Can I share what the breaking points usually are?',
    },
    {
      objection: '"I need to run this by my CEO first."',
      handle: 'Absolutely. Would it help if I put together a one-pager with the ROI calculation you could share with him? I\'ve done this for other ops leaders -- happy to make your life easier.',
    },
    {
      objection: '"Maybe after our Europe launch."',
      handle: 'Makes sense. Actually, the Europe launch is exactly why I\'d suggest getting ahead of this. Multi-timezone operations is where manual processes really break. What if we scoped a pilot that started planning now but launched alongside Europe?',
    },
  ],

  // Call Objective & Success Metrics
  primaryObjective: 'Confirm operational pain, map the buying committee, and secure a second meeting with CTO involvement.',
  successCriteria: 'Sarah articulates the problem in her own words, names at least 2 stakeholders, and agrees to a follow-up with a specific date.',
  minimumViableOutcome: 'Sarah agrees to review a one-pager and schedule a follow-up within the week.',
  redFlags: 'She says "we\'re not looking at anything right now" or "our current tools are fine." If conviction is low, the deal is dead.',

  // What We Don't Know
  gaps: [
    'Exact budget authority and approval process',
    'CTO\'s stance on new vendor additions vs. build-in-house',
    'Whether there\'s an active evaluation of other solutions',
    'Internal politics between Ops and Engineering teams',
  ],
  assumptions: [
    'Sarah has enough influence to drive an evaluation',
    'Series B creates budget availability for operational tools',
    'European expansion timeline is firm (Q1)',
    'Custom internal tools are a recognized pain point, not a source of pride',
  ],
  redFlagsToWatch: [
    'If Sarah can\'t articulate specific operational pain -- the problem may not be urgent enough',
    'If CTO is actively building internal tools -- you\'re competing with engineering, not a vendor',
    'If the Europe launch gets delayed -- your urgency lever disappears',
  ],

  // Post-Call Actions
  actions: [
    { timing: 'Immediately after call', action: 'Send follow-up email with specific next-step date, reference her exact language from the call.' },
    { timing: 'Within 24 hours', action: 'Send the case study from a similar company (Series B, scaling ops, Europe expansion).' },
    { timing: 'Within 48 hours', action: 'Draft the one-pager ROI document for her to share with CEO. Make it easy for her to champion internally.' },
    { timing: 'Before next meeting', action: 'Research David Park (CTO) -- LinkedIn, any talks or blog posts. Prepare a technical brief addressing integration and security.' },
    { timing: 'Week of next meeting', action: 'Send calendar invite with agenda. Include pre-read materials. Show you\'re organized and respectful of their time.' },
  ],
};

export default function ExampleDiscoveryProReportPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'findings',
    'probes',
    'objections',
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
          <Link href="/discovery-lab-examples" className="flex items-center gap-3">
            <div>
              <div className="font-anton text-xl tracking-wide">
                <span className="text-white">DISCOVERY</span>
                <span className="text-[#E51B23]">LAB</span>
                <span className="bg-[#FFDE59] text-black text-xs px-2 py-0.5 ml-2">PRO</span>
              </div>
            </div>
          </Link>
          <Link
            href="/discovery-lab-pro?utm_source=example"
            className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
          >
            Unlock Pro Intel
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Prospect Header */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h1 className="font-anton text-2xl text-white uppercase tracking-wide mb-1">
            {report.targetContact} -- {report.targetCompany}
          </h1>
          <p className="text-[#FFDE59]">{report.targetTitle}</p>
          <p className="text-[#666] text-sm mt-1">{report.targetWebsite}</p>
        </div>

        {/* Top 5 Findings */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('findings')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-xl text-[#E51B23] uppercase tracking-wider">
              Top 5 Findings <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
            </h2>
            <span className="text-[#666]">{expandedSections.includes('findings') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('findings') && (
            <div className="space-y-4 mt-4">
              {report.findings.map((finding, i) => (
                <div key={i} className="bg-gradient-to-r from-[#1A1A1A] to-[#2a1a1a] border-2 border-[#E51B23] p-4 rounded">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="font-anton text-2xl text-[#E51B23]">{i + 1}</span>
                    <h3 className="font-bold text-[#FFDE59] text-lg">{finding.title}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-[#B3B3B3]"><strong className="text-white">What it is:</strong> {finding.what}</p>
                    <p className="text-[#B3B3B3]"><strong className="text-white">Why it matters:</strong> {finding.why}</p>
                    <p className="text-[#B3B3B3]"><strong className="text-white">What to do:</strong> {finding.action}</p>
                    <p className="text-[#666] text-xs italic">Confidence: {finding.confidence}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Executive Summary */}
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2a1a1a] border-2 border-[#E51B23] rounded-lg p-6">
          <h2 className="font-anton text-xl text-[#E51B23] uppercase tracking-wider mb-4">
            Executive Summary <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
          </h2>
          <p className="text-white leading-relaxed">{report.executiveSummary}</p>
        </div>

        {/* Authority Snapshot */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#E51B23] uppercase tracking-wider mb-4">
            Authority Snapshot
          </h2>
          <div className="space-y-2 text-sm mb-4">
            <div><strong className="text-[#FFDE59]">Your Service:</strong> <span className="text-[#B3B3B3]">{report.serviceReframed}</span></div>
            <div><strong className="text-[#FFDE59]">Target Company:</strong> <span className="text-[#B3B3B3]">{report.targetCompany} ({report.targetWebsite})</span></div>
            <div><strong className="text-[#FFDE59]">Contact:</strong> <span className="text-[#B3B3B3]">{report.targetContact} - {report.targetTitle}</span></div>
            <div><strong className="text-[#FFDE59]">Recent Signals:</strong> <span className="text-[#B3B3B3]">{report.recentSignals}</span></div>
          </div>
          <div className="bg-[#FFDE59] p-4 rounded">
            <p className="text-black font-semibold text-sm">{report.authorityLine}</p>
          </div>
        </div>

        {/* Prospect Psychology */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#E51B23] uppercase tracking-wider mb-4">
            Prospect Psychology <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-[#333] p-4 rounded">
              <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-2">SUCCESS METRICS</p>
              <p className="text-[#B3B3B3] text-sm">{report.psychology.success}</p>
            </div>
            <div className="bg-[#333] p-4 rounded">
              <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-2">FEARS</p>
              <p className="text-[#B3B3B3] text-sm">{report.psychology.fears}</p>
            </div>
            <div className="bg-[#333] p-4 rounded">
              <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-2">WHAT THEY NEED TO HEAR</p>
              <p className="text-[#B3B3B3] text-sm">{report.psychology.need}</p>
            </div>
            <div className="bg-[#333] p-4 rounded">
              <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-2">WHAT MAKES THEM SAY YES</p>
              <p className="text-[#B3B3B3] text-sm">{report.psychology.yes}</p>
            </div>
          </div>
        </div>

        {/* Pain / Impact Probes */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('probes')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Pain / Impact Probes <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">8 TOTAL</span>
            </h2>
            <span className="text-[#666]">{expandedSections.includes('probes') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('probes') && (
            <div className="mt-4">
              <p className="text-[#FFDE59] font-bold text-sm mb-3">PRIMARY PROBES</p>
              <div className="space-y-3 mb-6">
                {report.primaryProbes.map((probe, i) => (
                  <div key={i} className="border-l-3 border-[#E51B23] pl-3" style={{ borderLeftWidth: '3px' }}>
                    <p className="text-[#E51B23] text-[10px] font-bold tracking-wider mb-1">{probe.tag}</p>
                    <p className="text-white text-sm font-semibold mb-1">{probe.question}</p>
                    <p className="text-[#B3B3B3] text-xs italic pl-3">&rarr; {probe.followup}</p>
                  </div>
                ))}
              </div>

              <p className="text-[#FFDE59] font-bold text-sm mb-3">SECONDARY PROBES</p>
              <div className="space-y-3">
                {report.secondaryProbes.map((probe, i) => (
                  <div key={i} className="border-l-3 border-[#E51B23] pl-3" style={{ borderLeftWidth: '3px' }}>
                    <p className="text-[#E51B23] text-[10px] font-bold tracking-wider mb-1">{probe.tag}</p>
                    <p className="text-white text-sm font-semibold mb-1">{probe.question}</p>
                    <p className="text-[#B3B3B3] text-xs italic pl-3">&rarr; {probe.followup}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Market & Competitor Hooks */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('hooks')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Market & Competitor Hooks
            </h2>
            <span className="text-[#666]">{expandedSections.includes('hooks') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('hooks') && (
            <div className="space-y-4 mt-4">
              {report.hooks.map((hook, i) => (
                <div key={i}>
                  <p className="text-[#FFDE59] font-bold text-sm mb-1">{hook.name}</p>
                  <p className="text-[#B3B3B3] text-sm">{hook.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Competitor Positioning */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('competitors')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Competitor Positioning <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
            </h2>
            <span className="text-[#666]">{expandedSections.includes('competitors') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('competitors') && (
            <div className="space-y-4 mt-4">
              {report.competitors.map((comp, i) => (
                <div key={i} className="bg-[#333] border-l-3 border-[#E51B23] p-4 rounded-r" style={{ borderLeftWidth: '3px' }}>
                  <h3 className="text-[#FFDE59] font-bold text-base mb-3">{comp.name}</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-[#B3B3B3]"><strong className="text-white">Good at:</strong> {comp.strength}</p>
                    <p className="text-[#B3B3B3]"><strong className="text-white">Falls short:</strong> {comp.weakness}</p>
                    <p className="text-[#B3B3B3]"><strong className="text-white">Position against:</strong> {comp.positioning}</p>
                  </div>
                  <div className="bg-[#1A1A1A] p-3 rounded mt-3">
                    <p className="text-white text-sm italic">&ldquo;{comp.question}&rdquo;</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emotional / Identity Probe */}
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2a1a1a] border-2 border-[#E51B23] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#E51B23] uppercase tracking-wider mb-4">
            Emotional / Identity Probe
          </h2>
          <p className="text-white italic text-lg leading-relaxed">&ldquo;{report.emotionalProbe}&rdquo;</p>
        </div>

        {/* Quick Discovery Flow */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('flow')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Quick Discovery Flow
            </h2>
            <span className="text-[#666]">{expandedSections.includes('flow') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('flow') && (
            <div className="space-y-4 mt-4">
              {report.flowSteps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="font-anton text-2xl text-[#E51B23] min-w-[24px]">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-[#FFDE59] font-bold text-sm mb-1">{step.title}</p>
                    <div className="bg-[#333] p-3 rounded border-l-3 border-[#E51B23]" style={{ borderLeftWidth: '3px' }}>
                      <p className="text-[#B3B3B3] text-sm italic">&ldquo;{step.script}&rdquo;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Decision Tree */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('decisions')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Conversation Decision Tree <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
            </h2>
            <span className="text-[#666]">{expandedSections.includes('decisions') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('decisions') && (
            <div className="space-y-4 mt-4">
              {report.decisionBranches.map((branch, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <p className="text-[#FFDE59] font-bold text-sm mb-2">{branch.condition}</p>
                  <p className="text-[#B3B3B3] text-xs mb-3">{branch.guidance}</p>
                  <div className="bg-[#333] p-3 rounded">
                    <p className="text-white text-sm italic">&ldquo;{branch.script}&rdquo;</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What They'll Google */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            What They&apos;ll Google <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
          </h2>
          <div className="space-y-4">
            {report.googleItems.map((item, i) => (
              <div key={i}>
                <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-1">{item.label}</p>
                <p className="text-[#B3B3B3] text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Opening 60 Seconds */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Opening 60 Seconds <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
          </h2>
          <div className="space-y-4">
            {report.openingParts.map((part, i) => (
              <div key={i}>
                <p className="text-[#FFDE59] text-xs font-bold tracking-wider mb-2">{part.label}</p>
                <div className="bg-[#333] p-3 rounded">
                  <p className="text-white text-sm italic">&ldquo;{part.script}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objection Handles */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('objections')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Objection Handles <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
            </h2>
            <span className="text-[#666]">{expandedSections.includes('objections') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('objections') && (
            <div className="space-y-4 mt-4">
              {report.objections.map((obj, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <p className="text-[#E51B23] font-bold text-sm mb-3">{obj.objection}</p>
                  <div className="bg-[#333] p-3 rounded border-l-3 border-[#FFDE59]" style={{ borderLeftWidth: '3px' }}>
                    <p className="text-white text-sm italic">&ldquo;{obj.handle}&rdquo;</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call Objective & Success Metrics */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Call Objective & Success Metrics
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-2">PRIMARY GOAL</p>
              <p className="text-[#B3B3B3] text-sm">{report.primaryObjective}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <p className="text-[#4CAF50] text-xs font-bold tracking-wider mb-2">SUCCESS LOOKS LIKE</p>
              <p className="text-[#B3B3B3] text-sm">{report.successCriteria}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-2">MINIMUM VIABLE OUTCOME</p>
              <p className="text-[#B3B3B3] text-sm">{report.minimumViableOutcome}</p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <p className="text-[#E51B23] text-xs font-bold tracking-wider mb-2">RED FLAGS</p>
              <p className="text-[#B3B3B3] text-sm">{report.redFlags}</p>
            </div>
          </div>
        </div>

        {/* What We Don't Know */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            What We Don&apos;t Know <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
          </h2>
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <p className="text-[#FFDE59] text-xs font-bold tracking-wider mb-3">INFORMATION GAPS</p>
              <ul className="space-y-1">
                {report.gaps.map((gap, i) => (
                  <li key={i} className="text-[#B3B3B3] text-sm flex items-start gap-2">
                    <span className="text-[#E51B23]">•</span> {gap}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <p className="text-[#FFDE59] text-xs font-bold tracking-wider mb-3">ASSUMPTIONS TO VALIDATE</p>
              <ul className="space-y-1">
                {report.assumptions.map((assumption, i) => (
                  <li key={i} className="text-[#B3B3B3] text-sm flex items-start gap-2">
                    <span className="text-[#FFDE59]">•</span> {assumption}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
              <p className="text-[#FFDE59] text-xs font-bold tracking-wider mb-3">RED FLAGS TO WATCH</p>
              <ul className="space-y-1">
                {report.redFlagsToWatch.map((flag, i) => (
                  <li key={i} className="text-[#B3B3B3] text-sm flex items-start gap-2">
                    <span className="text-[#E51B23]">⚠</span> {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Post-Call Actions */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Post-Call Actions <span className="bg-[#E51B23] text-white text-[10px] px-2 py-0.5 ml-2 rounded">PRO</span>
          </h2>
          <div className="space-y-3">
            {report.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-anton text-2xl text-[#E51B23] min-w-[24px]">{i + 1}</span>
                <div>
                  <p className="text-[#FFDE59] text-xs font-bold tracking-wider mb-1">{action.timing}</p>
                  <p className="text-[#B3B3B3] text-sm">{action.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-[#E51B23] rounded-lg p-8 text-center">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wide mb-3">
            Get this intelligence for every prospect
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Top 5 findings. Prospect psychology. Objection handles. Decision trees. Win more deals before the call even starts.
          </p>
          <Link
            href="/discovery-lab-pro?utm_source=example"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Unlock Pro Intelligence →
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#333] pt-8 mt-8">
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
