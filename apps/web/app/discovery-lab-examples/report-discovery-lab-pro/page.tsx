'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Example Discovery Lab Pro Report Page
 *
 * Public showcase of a Discovery Lab Pro report with synthetic data.
 * No auth required - all data is hardcoded.
 */

const SYNTHETIC_REPORT = {
  prospect: {
    name: 'Sarah Chen',
    title: 'VP of Operations',
    company: 'TechCorp',
    linkedin: 'linkedin.com/in/sarahchen',
    email: 'sarah.chen@techcorp.io',
    background: 'Previously Director of Ops at ScaleUp Inc. MBA from Stanford. Known for data-driven decision making and building efficient processes.',
    priorities: ['Operational efficiency', 'Team scaling', 'Process automation'],
    communicationStyle: 'Direct and data-focused. Appreciates brevity and concrete ROI metrics.',
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
    techStack: ['Salesforce', 'Slack', 'Notion', 'Asana', 'Custom internal tools'],
    growthRate: '200% YoY',
    recentMilestones: [
      'Series B closed Nov 2024',
      'Forbes Cloud 100 Rising Stars',
      'Expanded to European market',
      'Hired new CTO from Stripe',
    ],
  },
  stakeholders: [
    {
      name: 'Sarah Chen',
      title: 'VP of Operations',
      role: 'Champion / Evaluator',
      influence: 'High',
      priorities: ['Reduce manual work', 'Scale processes', 'Prove ROI to CEO'],
      concerns: ['Implementation time', 'Team adoption', 'Integration complexity'],
      communicationTip: 'Lead with data. She needs to build a business case for her CEO.',
    },
    {
      name: 'Marcus Johnson',
      title: 'CEO',
      role: 'Economic Buyer',
      influence: 'Final Decision',
      priorities: ['Revenue growth', 'Operational leverage', 'Investor optics'],
      concerns: ['Distraction from core product', 'Budget allocation'],
      communicationTip: 'Focus on strategic impact, not features. He thinks in quarters.',
    },
    {
      name: 'David Park',
      title: 'CTO',
      role: 'Technical Evaluator',
      influence: 'Veto Power',
      priorities: ['System reliability', 'Clean integrations', 'Security compliance'],
      concerns: ['Technical debt', 'API limitations', 'Data privacy'],
      communicationTip: 'Don\'t oversell. He\'ll dig into the technical details.',
    },
    {
      name: 'Lisa Wang',
      title: 'Head of Finance',
      role: 'Budget Approver',
      influence: 'Medium',
      priorities: ['Cost control', 'Predictable spend', 'Clear ROI'],
      concerns: ['Hidden costs', 'Long contracts'],
      communicationTip: 'Show total cost of ownership and payback period.',
    },
  ],
  competitiveIntel: {
    currentSolution: {
      name: 'Asana + Custom Internal Tools',
      strengths: ['Team is familiar with it', 'Low direct cost', 'Customized to their workflow'],
      weaknesses: ['Doesn\'t scale', 'High maintenance cost', 'No automation'],
      switchingCost: 'Medium - some process redesign needed',
    },
    competitors: [
      {
        name: 'Monday.com',
        status: 'Evaluated 6 months ago',
        whyNotChosen: 'Too rigid for their workflow. Felt like a "spreadsheet with colors."',
        yourAdvantage: 'Emphasize flexibility and customization capabilities.',
      },
      {
        name: 'Notion',
        status: 'Currently using for docs',
        relationship: 'They like it for documentation but find it lacking for workflows.',
        yourAdvantage: 'Position as complement, not replacement. Integration story.',
      },
    ],
  },
  objections: [
    {
      objection: '"We\'re too busy to implement something new right now."',
      likelihood: 'High',
      root: 'Fear of disruption during growth phase.',
      response: '"That\'s exactly why companies in your position reach out to us. The longer you wait, the more manual work compounds. What if I showed you how [Similar Company] implemented in 2 weeks with zero disruption to their team?"',
    },
    {
      objection: '"We already have Asana — why would we add another tool?"',
      likelihood: 'High',
      root: 'Sunk cost fallacy + change resistance.',
      response: '"Totally fair. Most of our customers started with Asana too. The question isn\'t whether Asana is bad — it\'s whether it can handle what you need at 300 people. Can I share what the breaking points usually are?"',
    },
    {
      objection: '"I need to run this by my CEO first."',
      likelihood: 'Medium',
      root: 'Lack of confidence in building internal business case.',
      response: '"Absolutely. Would it help if I put together a one-pager with the ROI calculation you could share with him? I\'ve done this for other ops leaders — happy to make your life easier."',
    },
    {
      objection: '"The timing isn\'t right — maybe after our Europe launch."',
      likelihood: 'Medium',
      root: 'Prioritization conflict.',
      response: '"Makes sense. Actually, the Europe launch is exactly why I\'d suggest getting ahead of this. Multi-timezone operations is where manual processes really break. What if we scoped a pilot that launched after Europe but started planning now?"',
    },
  ],
  talkTracks: [
    {
      scenario: 'Opening the call',
      context: 'Sarah is likely busy and skeptical of another sales call.',
      script: '"Sarah, I know your time is tight so I\'ll be direct. I saw TechCorp just closed Series B — congrats. In my experience, that\'s usually when ops challenges shift from \'annoying\' to \'blocking growth.\' I\'m curious whether that\'s resonating with what you\'re seeing?"',
      why: 'Acknowledges her time, shows you did homework, opens with a hypothesis she can confirm or correct.',
    },
    {
      scenario: 'After she describes the problem',
      context: 'She\'s shared that processes are "starting to break."',
      script: '"When you say \'starting to break\' — help me understand what that looks like day to day. Is it more about things falling through cracks, or people spending too much time on manual work?"',
      why: 'Gets specific symptoms, shows genuine curiosity, avoids assuming you know her problem.',
    },
    {
      scenario: 'When she asks about pricing',
      context: 'Too early to discuss — she\'s testing if you\'ll flip into sales mode.',
      script: '"Happy to talk numbers, but I want to make sure I\'m not wasting your time. Based on what you\'ve shared, I\'m not even sure we\'re the right fit yet. Can I ask a couple more questions to figure that out?"',
      why: 'Deflects gracefully, positions you as advisor not salesperson, earns permission to dig deeper.',
    },
    {
      scenario: 'Closing the call',
      context: 'You\'ve built rapport and uncovered real pain.',
      script: '"Based on what you shared about the Q2 deadline and the Europe launch, I think there\'s a conversation worth having about how we could help. I have time Tuesday at 2pm or Thursday at 10am — which works better for a 30-minute deep dive?"',
      why: 'References her stated priorities, proposes specific times, makes saying yes easy.',
    },
  ],
  triggerEvents: [
    {
      event: 'Series B Funding',
      date: 'Nov 2024',
      implication: 'Pressure to scale efficiently. Investor expectations for operational leverage.',
      actionability: 'High — they have budget and urgency.',
    },
    {
      event: 'European Expansion',
      date: 'Q1 2025',
      implication: 'Multi-timezone operations will break current manual processes.',
      actionability: 'High — creates natural deadline.',
    },
    {
      event: 'New CTO Hire',
      date: 'Sep 2024',
      implication: 'Fresh eyes on tech stack. Likely to consolidate and modernize.',
      actionability: 'Medium — could be ally or gatekeeper.',
    },
    {
      event: 'Headcount doubling',
      date: 'Next 12 months',
      implication: 'Every manual process becomes 2x more painful.',
      actionability: 'High — use as urgency lever.',
    },
  ],
  dealStrategy: {
    idealOutcome: 'Pilot program scoped for Q1, expanding to full deployment by Q2.',
    landingZone: 'Operations team (10-15 users) with clear success metrics.',
    expansionPath: 'Ops → Product → Engineering → Company-wide',
    timeline: [
      { phase: 'Discovery Call', target: 'This week', goal: 'Confirm pain, identify stakeholders' },
      { phase: 'Demo + Technical Review', target: 'Week 2', goal: 'Get CTO buy-in' },
      { phase: 'Business Case Presentation', target: 'Week 3', goal: 'CEO alignment' },
      { phase: 'Pilot Proposal', target: 'Week 4', goal: 'Signed agreement' },
    ],
    risks: [
      { risk: 'CTO blocks due to integration concerns', mitigation: 'Bring solutions engineer to demo' },
      { risk: 'CEO deprioritizes for Europe launch', mitigation: 'Frame as enabler of Europe success' },
      { risk: 'Champion (Sarah) leaves', mitigation: 'Build multi-threaded relationships' },
    ],
  },
  questionsToAsk: [
    {
      question: 'Walk me through what happens when a new employee joins — how does onboarding work today?',
      purpose: 'Uncovers operational complexity and manual processes.',
    },
    {
      question: 'If you could wave a magic wand and fix one operational headache, what would it be?',
      purpose: 'Gets to their core pain in their own words.',
    },
    {
      question: 'Who else would need to be involved in evaluating something like this?',
      purpose: 'Maps buying committee without being salesy.',
    },
    {
      question: 'What does success look like for your team in the next 12 months?',
      purpose: 'Aligns your solution to their goals.',
    },
    {
      question: 'Have you tried to solve this before? What happened?',
      purpose: 'Surfaces past failures and buying objections.',
    },
  ],
};

export default function ExampleDiscoveryProReportPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'stakeholders',
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
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-anton text-2xl text-white uppercase tracking-wide mb-1">
                {report.prospect.name} — {report.company.name}
              </h1>
              <p className="text-[#FFDE59]">{report.prospect.title}</p>
              <p className="text-[#666] text-sm mt-2">{report.prospect.background}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#666] mb-1">COMMUNICATION STYLE</div>
              <p className="text-[#B3B3B3] text-sm max-w-xs">{report.prospect.communicationStyle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {report.prospect.priorities.map((priority, i) => (
              <span key={i} className="bg-[#FFDE59]/20 text-[#FFDE59] text-xs px-3 py-1 rounded-full">
                {priority}
              </span>
            ))}
          </div>
        </div>

        {/* Company Intel */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Company Intelligence
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
                  <span className="text-[#666]">Growth Rate</span>
                  <span className="text-green-500">{report.company.growthRate}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {report.company.techStack.map((tech, i) => (
                    <span key={i} className="bg-[#333] text-[#B3B3B3] text-xs px-2 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Recent Milestones</h3>
                <ul className="space-y-1">
                  {report.company.recentMilestones.map((milestone, i) => (
                    <li key={i} className="text-[#B3B3B3] text-sm flex items-center gap-2">
                      <span className="text-green-500">✓</span> {milestone}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Stakeholder Map */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('stakeholders')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Stakeholder Map
            </h2>
            <span className="text-[#666]">{expandedSections.includes('stakeholders') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('stakeholders') && (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {report.stakeholders.map((person, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-semibold">{person.name}</h3>
                      <p className="text-[#B3B3B3] text-sm">{person.title}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded ${
                        person.influence === 'Final Decision' ? 'bg-[#E51B23] text-white' :
                        person.influence === 'High' ? 'bg-[#FFDE59] text-black' :
                        'bg-[#333] text-white'
                      }`}>
                        {person.influence}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#666] text-xs mb-3">{person.role}</p>

                  <div className="mb-2">
                    <p className="text-[#666] text-xs mb-1">PRIORITIES:</p>
                    <ul className="text-[#B3B3B3] text-xs list-disc list-inside">
                      {person.priorities.map((p, j) => <li key={j}>{p}</li>)}
                    </ul>
                  </div>

                  <div className="mb-2">
                    <p className="text-[#666] text-xs mb-1">CONCERNS:</p>
                    <ul className="text-[#E51B23] text-xs list-disc list-inside">
                      {person.concerns.map((c, j) => <li key={j}>{c}</li>)}
                    </ul>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#333]">
                    <p className="text-[#666] text-xs mb-1">HOW TO APPROACH:</p>
                    <p className="text-[#FFDE59] text-sm">{person.communicationTip}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Competitive Intel */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('competitive')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Competitive Intelligence
            </h2>
            <span className="text-[#666]">{expandedSections.includes('competitive') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('competitive') && (
            <div className="mt-4 space-y-4">
              <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-4 rounded-r">
                <h3 className="text-white font-semibold mb-2">Current Solution: {report.competitiveIntel.currentSolution.name}</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-green-500 text-xs mb-1">STRENGTHS:</p>
                    <ul className="text-[#B3B3B3] list-disc list-inside">
                      {report.competitiveIntel.currentSolution.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[#E51B23] text-xs mb-1">WEAKNESSES:</p>
                    <ul className="text-[#B3B3B3] list-disc list-inside">
                      {report.competitiveIntel.currentSolution.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[#666] text-xs mb-1">SWITCHING COST:</p>
                    <p className="text-white">{report.competitiveIntel.currentSolution.switchingCost}</p>
                  </div>
                </div>
              </div>

              {report.competitiveIntel.competitors.map((comp, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-semibold">{comp.name}</h3>
                    <span className="text-[#666] text-xs">{comp.status}</span>
                  </div>
                  <p className="text-[#E51B23] text-sm mb-2">
                    <strong>Why not chosen:</strong> {comp.whyNotChosen || comp.relationship}
                  </p>
                  <p className="text-green-500 text-sm">
                    <strong>Your advantage:</strong> {comp.yourAdvantage}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Objection Handling */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('objections')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Predicted Objections & Responses
            </h2>
            <span className="text-[#666]">{expandedSections.includes('objections') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('objections') && (
            <div className="space-y-4 mt-4">
              {report.objections.map((obj, i) => (
                <div key={i} className={`bg-[#1A1A1A] border-l-4 p-4 rounded-r ${
                  obj.likelihood === 'High' ? 'border-[#E51B23]' : 'border-[#FFDE59]'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-medium italic">{obj.objection}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      obj.likelihood === 'High' ? 'bg-[#E51B23] text-white' : 'bg-[#FFDE59] text-black'
                    }`}>
                      {obj.likelihood} likelihood
                    </span>
                  </div>
                  <p className="text-[#666] text-sm mb-3">Root cause: {obj.root}</p>
                  <div className="bg-black/50 p-3 rounded">
                    <p className="text-[#666] text-xs mb-1">YOUR RESPONSE:</p>
                    <p className="text-green-400 text-sm">{obj.response}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Talk Tracks */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('tracks')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Custom Talk Tracks
            </h2>
            <span className="text-[#666]">{expandedSections.includes('tracks') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('tracks') && (
            <div className="space-y-4 mt-4">
              {report.talkTracks.map((track, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <h3 className="text-white font-semibold mb-1">{track.scenario}</h3>
                  <p className="text-[#666] text-sm mb-3">{track.context}</p>
                  <div className="bg-black/50 p-3 rounded mb-3">
                    <p className="text-[#FFDE59] italic">&quot;{track.script}&quot;</p>
                  </div>
                  <p className="text-[#B3B3B3] text-sm">
                    <span className="text-green-500">Why this works:</span> {track.why}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deal Strategy */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <button
            onClick={() => toggleSection('strategy')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider">
              Deal Strategy
            </h2>
            <span className="text-[#666]">{expandedSections.includes('strategy') ? '−' : '+'}</span>
          </button>

          {expandedSections.includes('strategy') && (
            <div className="mt-4 space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <p className="text-[#666] text-xs mb-1">IDEAL OUTCOME</p>
                  <p className="text-white">{report.dealStrategy.idealOutcome}</p>
                </div>
                <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <p className="text-[#666] text-xs mb-1">LANDING ZONE</p>
                  <p className="text-white">{report.dealStrategy.landingZone}</p>
                </div>
                <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                  <p className="text-[#666] text-xs mb-1">EXPANSION PATH</p>
                  <p className="text-white">{report.dealStrategy.expansionPath}</p>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Timeline</h3>
                <div className="space-y-2">
                  {report.dealStrategy.timeline.map((phase, i) => (
                    <div key={i} className="flex items-center gap-4 bg-[#1A1A1A] p-3 rounded">
                      <span className="text-[#FFDE59] font-anton w-8">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-white">{phase.phase}</p>
                        <p className="text-[#666] text-xs">{phase.goal}</p>
                      </div>
                      <span className="text-[#B3B3B3] text-sm">{phase.target}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Deal Risks</h3>
                <div className="space-y-2">
                  {report.dealStrategy.risks.map((risk, i) => (
                    <div key={i} className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-3 rounded-r">
                      <p className="text-[#E51B23] text-sm mb-1">Risk: {risk.risk}</p>
                      <p className="text-green-400 text-sm">Mitigation: {risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Questions to Ask */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6">
          <h2 className="font-anton text-lg text-[#FFDE59] uppercase tracking-wider mb-4">
            Strategic Questions
          </h2>
          <div className="space-y-3">
            {report.questionsToAsk.map((q, i) => (
              <div key={i} className="bg-[#1A1A1A] p-4 rounded">
                <p className="text-white mb-1">&quot;{q.question}&quot;</p>
                <p className="text-[#666] text-sm">Purpose: {q.purpose}</p>
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
            Stakeholder maps. Competitive intel. Custom talk tracks. Win more deals before the call even starts.
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
