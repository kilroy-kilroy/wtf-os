'use client';

import Link from 'next/link';
import { ConsolePanel, ConsoleHeading, ConsoleMarkdownRenderer } from '@/components/console';

/**
 * Example Discovery Lab Report Page
 *
 * Public showcase of a Discovery Lab (free) report with synthetic data.
 * Uses the same ConsoleMarkdownRenderer as the real Discovery Lab reports.
 * No auth required - all data is hardcoded.
 */

const SYNTHETIC_REPORT = `Subject: Your SalesOS DiscoveryLab Call Guide for TechCorp

### 🎯 Authority Snapshot

- **Your Service:** Operational consulting for scaling SaaS companies -- helping founders build the systems that keep growth from breaking everything
- **Target Company:** TechCorp (techcorp.io)
- **Contact:** Sarah Chen, VP of Operations
- **Authority Line:** "You've built TechCorp into a workflow automation leader with 200% YoY growth -- my lane is making sure your operational infrastructure doesn't collapse under that momentum, and your team doesn't burn out before the Series B capital actually hits."

---

### 🔍 Pain / Impact Probes

1. **[Primary]** "Most agency founders I work with hit a wall around $2-3M where what got them here stops working -- they're still the closer on every deal, the team can't sell without them in the room, and the pipeline feels like a slot machine. Where are you in that journey?"
   → Follow-up: "When you look at your last ten new clients, how many came from outbound versus your network doing the heavy lifting? And how do you feel about that ratio?"

2. **[Primary]** "What's the conversation you're having internally about growth right now -- is it 'we need more at-bats' or 'we need to close more of what we're getting' or both?"
   → Follow-up: "If you had to pick one number that tells you whether the business is healthy or not, what would it be? And is that number going the right direction?"

3. **[Primary]** "What would have to be true about your business six months from now for you to feel like you're finally in control of revenue instead of revenue being in control of you?"
   → Follow-up: "And when you picture that version of the business, what's the biggest thing standing between here and there?"

---

### 🎣 Market & Competitor Hooks

**The Founder Ceiling**
Every agency hits the point where the founder's Rolodex runs dry and the team can't close without them -- Sarah's likely there or about to be, which makes this the perfect time to build a system that scales beyond her.

**The Positioning Void**
Most boutique agencies look identical online -- beautiful work, vague promises, no clear POV. If Sarah sounds like everyone else, no amount of outbound will fix the pipeline problem.

**The LinkedIn Dead Town**
Agencies sell trust and expertise, but most agency teams are invisible on social. If Sarah's people aren't building authority online, they're leaving pipeline on the table every single day.

---

### ⚡ Quick Discovery Flow

**1. Opening**
Start with curiosity, not credentials.
"Sarah, I'm excited to dig into what's working and what's not at Cairn. Before I ask you anything, what's the one thing you want to make sure we cover today?"

**2. Authority Frame**
Establish you understand her world.
"Most agency founders I work with are great at the work but hit a wall when it comes to predictable pipeline. Where does that land for you?"

**3. Pain Uncovering**
Go beneath the surface symptom.
"When you think about the gap between where you are and where you want to be, what's the thing that keeps you up at night?"

**4. Impact Exploration**
Connect pain to business outcomes.
"If this doesn't get solved in the next six months, what does that cost you -- not just in revenue, but in terms of the business you're trying to build?"

**5. Vision Bridge**
Help her imagine the other side.
"What would it feel like if your team could generate and close deals without you being the hero every time?"

**6. Next Step Setup**
Create forward momentum without being pushy.
"Based on what you've shared, I have some thoughts on where to start. Would it make sense to put together a quick game plan and walk through it next week?"

---

### 👉 Call Objective

You win this call when Sarah admits she's tired of being the bottleneck and asks you what it would take to fix it.

---

**Want the full playbook?** Discovery Lab Pro includes complete company research, competitor intelligence, LinkedIn analysis, and a detailed conversation decision tree.

[ Upgrade to Discovery Lab Pro ]`;

export default function ExampleDiscoveryReportPage() {
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
            Discovery Lab - Call Guide
          </h1>
          <p className="text-[#666] text-sm">
            Sarah Chen — TechCorp - VP of Operations
          </p>
        </div>

        {/* Report - Same renderer as actual Discovery Lab reports */}
        <ConsolePanel>
          <ConsoleHeading level={1} variant="yellow" className="mb-6">
            YOUR DISCOVERY LAB CALL GUIDE
          </ConsoleHeading>
          <ConsoleMarkdownRenderer content={SYNTHETIC_REPORT} />
        </ConsolePanel>

        {/* Upgrade CTA */}
        <div className="bg-[#111] border-2 border-[#E51B23] rounded-lg p-8 my-8">
          <div className="text-center mb-6">
            <h2 className="font-anton text-2xl text-[#FFDE59] uppercase tracking-wide mb-2">
              Get this intelligence for every prospect.
            </h2>
            <h3 className="font-anton text-xl text-white uppercase tracking-wide">
              Pro = Strategic Preparation + Market Intelligence.
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Full Company Research:</span> Website analysis, positioning, verbatim phrases</div>
              <div>→ <span className="text-white">LinkedIn Intelligence:</span> Contact insights, role context, hot buttons</div>
              <div>→ <span className="text-white">Competitor Analysis:</span> Why each competitor matters to this conversation</div>
            </div>
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Industry Signals:</span> What&apos;s happened in their world the last 90 days</div>
              <div>→ <span className="text-white">Emotional/Identity Probe:</span> The question that makes them feel seen</div>
              <div>→ <span className="text-white">Complete Decision Tree:</span> If/then paths for every direction</div>
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
            <span className="text-[#666] text-sm">Example data - Not a real report</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
