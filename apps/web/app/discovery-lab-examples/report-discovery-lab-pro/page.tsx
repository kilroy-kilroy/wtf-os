'use client';

import Link from 'next/link';
import { ConsolePanel, ConsoleHeading, ConsoleMarkdownRenderer } from '@/components/console';

/**
 * Example Discovery Lab Pro Report Page
 *
 * Public showcase of a Discovery Lab Pro report with synthetic data.
 * Uses the same ConsoleMarkdownRenderer as the real Discovery Lab Pro reports.
 * No auth required - all data is hardcoded.
 */

const SYNTHETIC_PRO_REPORT = `Subject: Your SalesOS DiscoveryLab Pro Call Guide for Cairn Media

### 🎯 Authority Snapshot

- **Your Service:** Agency growth consulting -- helping boutique agency founders build predictable revenue engines so they stop being the bottleneck in every deal
- **Target Company:** Cairn Media (cairnmedia.com)
- **Contact:** Lauren Fleischmann, Founder
- **Service Category:** Agency Growth Coaching, Demand Generation, Sales Process Development
- **Authority Line:** "You've built Cairn Media into a creative storytelling shop that clients love -- my lane is making sure your growth engine matches your craft, so the pipeline doesn't dry up every time you finish a project and your team can sell without you carrying every conversation."

---

### 🔍 Pain / Impact Probes

1. **[Primary]** "Most agency founders I work with hit a wall around $2-3M where what got them here stops working -- they're still the closer on every deal, the team can't sell without them in the room, and the pipeline feels like a slot machine. Where are you in that journey?"
   → Follow-up: "When you look at your last ten new clients, how many came from outbound versus your network doing the heavy lifting? And how do you feel about that ratio?"

2. **[Primary]** "When you look at your last ten new clients, how many came from outbound versus your network doing the heavy lifting?"
   → Follow-up: "And how do you feel about that rate?"

3. **[Primary]** "What's the conversation you're having internally about growth right now -- is it 'we need more at-bats' or 'we need to close more of what we're getting' or both?"
   → Follow-up: "If you had to pick one number that tells you whether the business is healthy or not, what would it be?"

4. **[Secondary]** "When a prospect ghosts you after a great discovery call, what story do you tell yourself about why that happened?"
   → Follow-up: "What happens when something doesn't come up that you'd hoped for?"

5. **[Secondary]** "What would have to be true about your business six months from now for you to feel like you're finally in control of revenue instead of revenue being in control of you?"
   → Follow-up: "Gets her to articulate the emotional outcome, not just the number, which is what actually drives buying decisions"

---

### 🎣 Market & Competitor Hooks

**The Founder Ceiling**
Every agency hits the point where the founder's Rolodex runs dry and the team can't close without them -- Lauren's likely there or about to be, which makes this the perfect time to build a system that scales beyond her.

**The Positioning Void**
Most boutique agencies look identical online -- beautiful work, vague promises, no clear POV. If Cairn sounds like everyone else, no amount of outbound will fix the pipeline problem.

**The LinkedIn Dead Town**
Agencies sell trust and expertise, but most agency teams are invisible on social. If Lauren's people aren't building authority online, they're leaving pipeline on the table every single day.

**The Sales Process Gap**
Agencies are great at delivery and terrible at sales operations. No CRM discipline, no follow-up cadence, no qualification framework -- just vibes and hope. That's not a strategy.

**The Likely Competitors**
Cairn is probably losing deals to larger shops with recognizable names (agencies like Huge, R/GA, or Instrument if they're in digital/brand) or scrappier competitors who are better at content and outbound (think Refine Labs-style demand gen shops or founder-led agencies with strong personal brands). The real competitor is inertia -- prospects who like Cairn but don't feel urgency to move.

---

### 🥊 Competitor Set

- **Large Brand Shops (Huge, R/GA)** -- They compete on name recognition and breadth. Cairn wins on intimacy and founder involvement, but loses when procurement wants "safe" choices.
- **Demand Gen Specialists (Refine Labs model)** -- They compete on measurable outcomes and thought leadership. If Lauren can't show ROI clearly, these shops eat her lunch.
- **Freelancer Networks (Upwork, Toptal)** -- They compete on price and flexibility. Cairn needs to sell the strategic layer that freelancers can't provide.
- **In-house Teams** -- The prospect might just hire internally. Lauren needs to make the case that agency expertise > a junior hire at the same cost.

---

### ❤️ Emotional / Identity Probe

"When you started Cairn, what was the version of this company you imagined building -- and how close are you to that right now?"

This question ties to founder identity and pride. It surfaces whether Lauren feels she's building what she set out to build, or whether the business has drifted. The answer tells you everything about her motivation to change.

---

### ⚡ Quick Discovery Flow

**1. Opening**
Start with curiosity, not credentials.
"Lauren, I'm excited to dig into what's working and what's not at Cairn. Before I ask you anything, what's the one thing you want to make sure we cover today?"

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

### 🌳 Conversation Decision Tree

**If she says "We're not really looking for help right now":**
→ Respond with: "Totally get it. Can I ask -- when you say 'not right now,' is that because things are going well, or because you've got bigger fires to put out first?"
→ Then pivot to: "What would have to change for this to become a priority?"

**If she gets excited and starts sharing problems openly:**
→ Amplify with: "That's exactly what I hear from founders at your stage. Let me ask you this -- if we could solve [specific problem she mentioned], what would that unlock for the rest of the business?"
→ Move to: The Vision Bridge question, then the Next Step Setup

**If she asks "What do you actually do?" early in the call:**
→ Say: "Great question. The short version -- I help agency founders build the systems that make revenue predictable instead of random. But before I get into that, I want to make sure what I share is actually relevant to where Cairn is right now. Can I ask a couple more questions?"
→ Then redirect to Pain Uncovering

**If she brings up pricing:**
→ Say: "Happy to get into that. Before I do -- based on what you've told me, I want to make sure I'm recommending the right thing. Can I ask: what does success look like for you in the next 90 days? That'll help me figure out exactly what makes sense."
→ Then redirect to: Impact Exploration

**If she goes quiet or gives short answers:**
→ Try: "I notice you got quiet on that one. Sometimes that means I hit something real. What's going on in your head right now?"
→ If still deflecting: "Totally fine if this isn't the right time. But I'm curious -- what made you take this call in the first place?"

---

### 🔮 What They'll Google After This Call

1. **"Tim Kilroy agency consultant"** -- She'll research you to see if you're legit. Make sure your LinkedIn, website, and testimonials tell a cohesive story about agency growth.

2. **"how to build predictable pipeline for agency"** -- This is the problem you surfaced. Have a blog post or resource ready to send in your follow-up that addresses this exact query.

3. **"agency sales process framework"** -- If you referenced a framework during the call, she'll look for it. Make sure you have something she can find -- a PDF, a guide, a video.

4. **"Cairn Media competitors"** -- She might do her own competitive audit after your conversation makes her realize she's not differentiated enough. This is a good sign -- it means you created awareness.

5. **"agency growth coaching cost"** -- She's pricing you in her head. Have your pricing page or a "what to expect" document ready for the follow-up.

---

### 👉 Call Objective

You win this call when Lauren admits she's tired of being the bottleneck and asks you what it would take to fix it.

---

**Key Research Insights:**
- Cairn Media positions as a "creative storytelling" shop but the website lacks clear differentiation from dozens of similar agencies -- this is the positioning void you can surface
- Lauren is founder-led with no visible sales team or process -- she's likely the sole closer, which is the exact bottleneck your coaching addresses
- No visible thought leadership or content strategy from the Cairn team on LinkedIn -- this is low-hanging fruit you can reference as proof of the pipeline problem`;

export default function ExampleDiscoveryProReportPage() {
  return (
    <div className="min-h-screen bg-black font-poppins">
      {/* Header */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/discovery-lab-examples" className="flex items-center gap-3">
            <div className="font-anton text-xl tracking-wide">
              <span className="text-white">DISCOVERY</span>
              <span className="text-[#E51B23]">LAB</span>
              <span className="text-[#FFDE59] text-sm ml-2">PRO</span>
            </div>
          </Link>
          <Link
            href="/discovery-lab-pro?utm_source=example"
            className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
          >
            Get Pro
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Report Header */}
        <div className="mb-8">
          <h1 className="font-anton text-3xl text-[#FFDE59] uppercase tracking-wide mb-2">
            Discovery Lab Pro - Full Intelligence
          </h1>
          <p className="text-[#666] text-sm">
            Lauren Fleischmann — Cairn Media - Founder
          </p>
        </div>

        {/* Report - Same renderer as actual Discovery Lab Pro reports */}
        <ConsolePanel>
          <ConsoleHeading level={1} variant="yellow" className="mb-6">
            DISCOVERY LAB <span className="text-[#E51B23]">PRO</span> - CALL GUIDE
          </ConsoleHeading>
          <ConsoleMarkdownRenderer content={SYNTHETIC_PRO_REPORT} />
        </ConsolePanel>

        {/* CTA */}
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
              <div>→ <span className="text-white">Conversation Decision Tree:</span> If/then paths for every direction</div>
              <div>→ <span className="text-white">What They&apos;ll Google:</span> Predict their post-call research</div>
              <div>→ <span className="text-white">Emotional/Identity Probe:</span> The question that makes them feel seen</div>
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
