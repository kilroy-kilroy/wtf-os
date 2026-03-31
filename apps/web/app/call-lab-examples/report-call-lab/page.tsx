'use client';

import Link from 'next/link';
import { ConsolePanel, ConsoleHeading, ConsoleMarkdownRenderer } from '@/components/console';

/**
 * Example Call Lab Report Page
 *
 * Public showcase of a Call Lab (free) analysis with synthetic data.
 * No auth required - all data is hardcoded.
 * Uses the same ConsoleMarkdownRenderer as the real Call Lab reports.
 */

const SYNTHETIC_REPORT = `**Call:** Sarah Chen / TechCorp
**Duration:** 34 minutes
**Score:** 7/10 | Effectiveness: Medium-High
**Dynamics Profile:** High-Trust Coaching, Weak Commercial Close

**Snap Take:** This was a coaching session disguised as a discovery call. Tim diagnosed Sarah's core problem in the first 10 minutes and spent the rest of the call teaching her how to reframe her value. The trust was instant. The insight was surgical. But the commercial momentum never materialized. Tim gave away the entire strategic roadmap without anchoring it to a paid engagement. Sarah left inspired but not committed. This was generous consulting, not sales.

---

## WHAT WORKED

**[The Vulnerability Flip](/wtf-sales-guide#vulnerability-flip)** (Connection) Sarah opened with raw honesty about her agency struggles, and Tim matched it immediately with his own self-deprecating humor about starting agencies. This created instant safety.

"I started a paid media agency... because I thought, God, I hate myself, or I don't hate myself enough."

**[The Diagnostic Reveal](/wtf-sales-guide#diagnostic-reveal)** (Diagnosis) Tim articulated Sarah's unspoken fear before she fully named it. He saw through the data obsession to the imposter syndrome underneath.

"Every fiber of your being... you're thinking, I can't sell this if I cannot provide the most incredible data resolution in the world... you feel like a fraud."

**[The Framework Drop](/wtf-sales-guide#framework-drop)** (Control) Tim gave Sarah a simple organizing principle: your job ends at the click. This reframed her entire value proposition and gave her a clear boundary.

"Your responsibility, your ability to influence purchase ends as soon as somebody clicks on an ad."

---

## WHAT TO WATCH

**[The Generous Professor](/wtf-sales-guide#generous-professor)** (Diagnosis) Tim taught the entire strategic framework without creating any commercial tension. He gave away positioning, pricing defense, client selection criteria, and differentiation strategy for free.

"More than being a data and technology partner, you're a marketing partner... lean into the fact that you're gonna tell a story that is so fucking fabulous..."

Fix: Save the full strategic roadmap for paying clients. Give one insight, then bridge to the paid engagement.

→ **COUNTER:** [The Self Diagnosis Pull](/wtf-sales-guide#self-diagnosis-pull) - Ask Sarah what she thinks her real value is, then build on her answer instead of delivering the full solution.

**[The Soft Close Fade](/wtf-sales-guide#soft-close-fade)** (Activation) The call ended with Sarah asking about packages and Tim promising to "send something later today." No calendar invite. No clear next step. No mutual commitment.

"I'll send you something later today, okay?"

Fix: Before hanging up, say: "Let's get 60 minutes on the calendar this week to map out what working together looks like. Does Thursday or Friday work better?"

→ **COUNTER:** [The Mirror Close](/wtf-sales-guide#mirror-close) - Reflect back Sarah's stated timeline (one year to scale) and her need for help, then propose a specific engagement structure.

---

## WHY THIS CALL WORKED

Sarah came in desperate for validation and Tim gave it to her immediately. She needed someone to tell her she wasn't crazy for struggling with attribution, that her instincts about creative differentiation were right, and that she didn't need to be a data wizard to be valuable. Tim delivered all of that with warmth and authority.

But Sarah also came in ready to buy. She asked directly about packages and pricing. She said "I'd love to know what it entails of working with you." She was qualifying herself as a buyer, not just seeking free advice. Tim missed that signal because he was in coaching mode, not sales mode. The call worked emotionally but failed commercially.

---

## ONE MOVE TO LEVEL UP

Stop giving away the strategic roadmap before the commercial conversation.

When Sarah asks "what am I actually offering?" don't answer it fully. Give her one reframe, then pivot:

Try this: "That's exactly the question we need to unpack together. Here's what I know in 30 seconds: you're not selling data, you're selling story. But the real work is figuring out how to package that in a way that makes you money and attracts the right clients. That's what I help people build. Want to spend an hour mapping that out this week?"

This creates hunger instead of satisfaction. She leaves wanting more, not feeling complete.

---

## CALL SIGNALS DETECTED

- Buyer revealed deep vulnerability early (fraud feelings, money loss)
- Buyer asked directly about working together
- Buyer stayed engaged for 34 minutes despite Tim being sick
- Buyer laughed with you multiple times
- Buyer took notes (implied by "I want this feedback")
- Pricing not raised as objection by buyer
- Buyer asked for packages and pricing explicitly
- No next meeting scheduled before ending call

---

## UNLOCK THE FULL ANALYSIS

Call Lab shows what worked, what didn't, and one move to level up.

Call Lab Pro shows the full sales architecture:

- Trust Curve Analysis: where emotional safety peaked and when commercial tension should have entered
- Ambiguity Detection: the 4 moments Sarah signaled buying intent that went unaddressed
- Pattern Sequencing: how The Generous Professor killed The Mirror Close before it could happen
- Predictable Close Path: the exact moment to transition from coaching to commerce

This call had all the ingredients for a close. Pro shows you how to cook them.

---

## BOTTOM LINE

You crushed the diagnosis and built massive trust. Your blind spot is transitioning from coach to closer. Fix that and you'll convert these high-trust calls into high-value clients. This was a strong call. Let's make the next one undeniable.`;

export default function ExampleLiteReportPage() {
  return (
    <div className="min-h-screen bg-black font-poppins">
      {/* Header */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/call-lab-examples" className="flex items-center gap-3">
            <div className="font-anton text-xl tracking-wide">
              <span className="text-white">CALL</span>
              <span className="text-[#E51B23]">LAB</span>
            </div>
          </Link>
          <Link
            href="/call-lab?utm_source=example"
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
            Call Lab - Diagnostic Snapshot
          </h1>
          <p className="text-[#666] text-sm">
            Sarah Chen — TechCorp - Discovery Call - Dec 12, 2024
          </p>
        </div>

        {/* Report - Same renderer as actual Call Lab reports */}
        <ConsolePanel>
          <ConsoleHeading level={1} variant="yellow" className="mb-6">
            CALL LAB - DIAGNOSTIC SNAPSHOT
          </ConsoleHeading>
          <ConsoleMarkdownRenderer content={SYNTHETIC_REPORT} />
        </ConsolePanel>

        {/* Upgrade CTA */}
        <div className="bg-[#111] border-2 border-[#E51B23] rounded-lg p-8 my-8">
          <div className="text-center mb-6">
            <h2 className="font-anton text-2xl text-[#FFDE59] uppercase tracking-wide mb-2">
              Call Lab showed you what happened.
            </h2>
            <h3 className="font-anton text-xl text-white uppercase tracking-wide">
              Call Lab Pro shows you the system.
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Pattern Library:</span> The 18 trust-building moves you&apos;re using (or missing)</div>
              <div>→ <span className="text-white">Trust Acceleration Map:</span> See exactly when buyers go from skeptical to sold</div>
              <div>→ <span className="text-white">Tactical Rewrites:</span> Word-for-word fixes for every weak moment</div>
            </div>
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Timestamp Analysis:</span> Every buying signal decoded with your exact response</div>
              <div>→ <span className="text-white">Framework Breakdowns:</span> Challenger, Gap Selling, WTF Method scores</div>
              <div>→ <span className="text-white">Dashboard Tracking:</span> See your patterns improve over time</div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/call-lab-pro?utm_source=example"
              className="inline-block bg-[#E51B23] text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#C41820] transition-colors"
            >
              Unlock Pro Analysis →
            </Link>
          </div>
        </div>

        {/* Main CTA */}
        <div className="bg-[#E51B23] rounded-lg p-8 text-center mb-8">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wide mb-3">
            Ready to analyze your own calls?
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Call Lab is completely free. Paste your transcript and get your analysis in under 60 seconds.
          </p>
          <Link
            href="/call-lab?utm_source=example"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Try It Free →
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#333] pt-8">
          <div className="flex items-center justify-between">
            <Link
              href="/call-lab-examples"
              className="text-[#B3B3B3] text-sm hover:text-white transition-colors"
            >
              ← Back to Call Lab Examples
            </Link>
            <span className="text-[#666] text-sm">Example data - Not a real report</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
