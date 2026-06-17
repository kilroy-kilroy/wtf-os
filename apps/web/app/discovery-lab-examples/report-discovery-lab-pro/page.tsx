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

const SYNTHETIC_PRO_REPORT = `Subject: Your SalesOS DiscoveryLab Pro Call Guide for Northwind Labs

### 🎯 Authority Snapshot

- **Your Service:** Fractional GTM consulting -- helping technical SaaS founders build a repeatable sales motion so they stop being the only person who can close a deal
- **Target Company:** Northwind Labs (northwindlabs.io)
- **Contact:** Alex Rivera, Founder & CEO
- **Service Category:** GTM Strategy, Demand Generation, Sales Process Development
- **Authority Line:** "You've built Northwind into a product engineers genuinely love -- my lane is making sure the go-to-market motion matches the product, so growth doesn't stall the moment you step out of the sales calls and your team can close without you in the room."

---

### 🔍 Pain / Impact Probes

1. **[Primary]** "Most technical founders I work with hit a wall once the early-adopter crowd dries up -- they're still on every sales call, the product sells itself to engineers but stalls with the economic buyer, and pipeline feels like a slot machine. Where are you in that journey?"
   → Follow-up: "When you look at your last ten closed deals, how many did you personally drive versus the team or self-serve? And how do you feel about that ratio?"

2. **[Primary]** "When you look at your last ten new customers, how many came from inbound and product-led versus you personally chasing them down?"
   → Follow-up: "And how do you feel about that mix?"

3. **[Primary]** "What's the conversation you're having internally about growth right now -- is it 'we need more pipeline' or 'we need to convert more of what we already have' or both?"
   → Follow-up: "If you had to pick one number that tells you whether the business is healthy or not, what would it be?"

4. **[Secondary]** "When a deal ghosts you after a strong demo, what story do you tell yourself about why that happened?"
   → Follow-up: "What happens when something doesn't come up that you'd hoped for?"

5. **[Secondary]** "What would have to be true about Northwind six months from now for you to feel like growth is finally a system instead of something you're holding together by hand?"
   → Follow-up: "Gets him to articulate the emotional outcome, not just the ARR number, which is what actually drives the decision"

---

### 🎣 Market & Competitor Hooks

**The Founder-Led Sales Ceiling**
Every SaaS startup hits the point where the founder can't be in every deal and the team can't close without them -- Alex is likely there or about to be, which makes this the perfect time to build a motion that scales beyond him.

**The "Engineers Love It, Buyers Don't Get It" Gap**
Product-led companies often win the user and lose the budget holder. If Northwind's pitch only lands with practitioners, deals stall the moment they reach procurement or finance.

**The Invisible-to-Buyers Problem**
Technical founders build authority with engineers but stay invisible to the execs who actually sign. If Alex's team isn't reaching economic buyers, they're leaving pipeline on the table every single day.

**The Sales Process Gap**
Great engineering orgs are often terrible at sales operations. No CRM discipline, no follow-up cadence, no qualification framework -- just founder intuition and hope. That's not a strategy.

**The Likely Competitors**
Northwind is probably losing deals to bigger, "safer" incumbents every eng team already knows, and to scrappier open-source or build-it-yourself alternatives. The real competitor is inertia -- teams that like Northwind but don't feel enough urgency to switch.

---

### 🥊 Competitor Set

- **Incumbent Platforms (the big recognizable names)** -- They compete on safety and integrations. Northwind wins on developer experience, but loses when procurement wants the "nobody got fired for buying them" choice.
- **Open Source / Build-It-Yourself** -- They compete on zero license cost. Northwind needs to sell the total-cost-of-ownership story that engineers love to underestimate.
- **Point Solutions / Freemium Tools** -- They compete on "good enough and free." Northwind needs to sell the platform value a single-purpose tool can't match.
- **Status Quo / Internal Tooling** -- The prospect might just keep their homegrown setup. Alex needs to make the case that Northwind beats paying engineers to maintain duct tape internally.

---

### ❤️ Emotional / Identity Probe

"When you started Northwind, what was the version of this company you imagined building -- and how close are you to that right now?"

This question ties to founder identity and pride. It surfaces whether Alex feels he's building what he set out to build, or whether the business has drifted into something he didn't sign up for. The answer tells you everything about his motivation to change.

---

### ⚡ Quick Discovery Flow

**1. Opening**
Start with curiosity, not credentials.
"Alex, I'm excited to dig into what's working and what's not at Northwind. Before I ask you anything, what's the one thing you want to make sure we cover today?"

**2. Authority Frame**
Establish you understand his world.
"Most technical founders I work with are great at building the product but hit a wall turning it into a repeatable sales motion. Where does that land for you?"

**3. Pain Uncovering**
Go beneath the surface symptom.
"When you think about the gap between where you are and where you want to be, what's the thing that keeps you up at night?"

**4. Impact Exploration**
Connect pain to business outcomes.
"If this doesn't get solved in the next six months, what does that cost you -- not just in revenue, but in terms of the company you're trying to build?"

**5. Vision Bridge**
Help him imagine the other side.
"What would it feel like if your team could generate and close deals without you being the hero on every call?"

**6. Next Step Setup**
Create forward momentum without being pushy.
"Based on what you've shared, I have some thoughts on where to start. Would it make sense to put together a quick game plan and walk through it next week?"

---

### 🌳 Conversation Decision Tree

**If he says "We're not really looking for help right now":**
→ Respond with: "Totally get it. Can I ask -- when you say 'not right now,' is that because things are going well, or because you've got bigger fires to put out first?"
→ Then pivot to: "What would have to change for this to become a priority?"

**If he gets excited and starts sharing problems openly:**
→ Amplify with: "That's exactly what I hear from founders at your stage. Let me ask you this -- if we could solve [specific problem he mentioned], what would that unlock for the rest of the business?"
→ Move to: The Vision Bridge question, then the Next Step Setup

**If he asks "What do you actually do?" early in the call:**
→ Say: "Great question. The short version -- I help technical founders build the systems that make revenue predictable instead of random. But before I get into that, I want to make sure what I share is actually relevant to where Northwind is right now. Can I ask a couple more questions?"
→ Then redirect to Pain Uncovering

**If he brings up pricing:**
→ Say: "Happy to get into that. Before I do -- based on what you've told me, I want to make sure I'm recommending the right thing. Can I ask: what does success look like for you in the next 90 days? That'll help me figure out exactly what makes sense."
→ Then redirect to: Impact Exploration

**If he goes quiet or gives short answers:**
→ Try: "I notice you got quiet on that one. Sometimes that means I hit something real. What's going on in your head right now?"
→ If still deflecting: "Totally fine if this isn't the right time. But I'm curious -- what made you take this call in the first place?"

---

### 🔮 What They'll Google After This Call

1. **"[Your Name] GTM consultant"** -- He'll research you to see if you're legit. Make sure your LinkedIn, website, and testimonials tell a cohesive story about helping founders build a sales motion.

2. **"how to build a repeatable sales motion for SaaS"** -- This is the problem you surfaced. Have a blog post or resource ready to send in your follow-up that addresses this exact query.

3. **"founder-led sales to sales team transition"** -- If you referenced a framework during the call, he'll look for it. Make sure you have something he can find -- a PDF, a guide, a video.

4. **"Northwind Labs alternatives"** -- He might run his own competitive audit after your conversation makes him realize he's not differentiated enough for the economic buyer. This is a good sign -- it means you created awareness.

5. **"fractional GTM consultant cost"** -- He's pricing you in his head. Have your pricing page or a "what to expect" document ready for the follow-up.

---

### 👉 Call Objective

You win this call when Alex admits he's tired of being the only one who can close, and asks you what it would take to fix it.

---

**Key Research Insights:**
- Northwind Labs positions as a developer-loved product, but the website speaks to engineers rather than the economic buyer -- this is the positioning gap you can surface
- Alex is founder-led with no visible sales leadership -- he's likely the sole closer, which is the exact bottleneck your work addresses
- No visible thought leadership aimed at buyers (only practitioner-level content) -- this is low-hanging fruit you can reference as proof of the pipeline problem`;

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
            Alex Rivera — Northwind Labs - Founder &amp; CEO
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
