'use client';

import Link from 'next/link';

/**
 * Example Call Lab Report Page
 *
 * Public showcase of a Call Lab (free) analysis with synthetic data.
 * No auth required - all data is hardcoded.
 */

// Synthetic markdown report matching the lite format
const SYNTHETIC_LITE_MARKDOWN = `## 📊 SNAP SCORE: 72/100

**Effectiveness Rating: SOLID** — You're building trust and creating momentum. A few adjustments will push you into the top tier.

---

## ✅ WHAT WORKED

### 1. Strong Opening Hook
> "I noticed TechCorp just raised Series B — congrats. That usually means the scaling problems we talked about are about to get a lot more real."

**Why it worked:** You immediately demonstrated you did homework and connected it to their world. Sarah leaned in from the start.

### 2. Self-Diagnosis Pull
> "So when you say things are 'starting to break' — what specifically is breaking first?"

**Why it worked:** Instead of assuming her problem, you made her articulate it. This creates ownership and makes your solution more compelling.

### 3. Mirror Language
Throughout the call, you used Sarah's exact phrases back to her: "scaling wall," "good enough for now," "Q2 deadline." This builds unconscious rapport.

---

## ⚠️ WHAT TO WATCH

### 1. Soft Close Fade
> "Great conversation. Let me send you some info and you can let me know what you think."

**The problem:** "Let me know" is the weakest close possible. You did all the hard work of building trust and then left without a commitment.

**The fix:** Always propose a specific next step with date/time: *"Let's schedule 30 minutes Tuesday at 2pm to walk through how this could work for TechCorp."*

### 2. Premature Product Mention
At 35:00, when Sarah asked "so what do you do?" you went straight into product features.

**The problem:** She wasn't asking for a pitch — she was testing if you'd stay in consultation mode or flip to sales mode.

**The fix:** Redirect with *"Before I answer that — I want to make sure what I share is actually relevant to what you're dealing with. Can I ask one more question?"*

---

## 🎯 YOUR ONE MOVE

**Fix the close.** You're doing 90% of the work right and losing deals at the finish line. Before ANY call ends, lock in a specific next step with a calendar invite.

Practice this phrase until it feels natural:
> "Based on what you shared about [their stated priority], I'd suggest we reconnect [specific day] to [specific agenda]. I have [time A] or [time B] — which works better?"

---

## 📋 IMMEDIATE ACTIONS

1. **Send follow-up email TODAY** with a specific meeting request
2. **Include the case study** you mentioned — deliver on your promise
3. **Reference "the scaling wall"** — show you were listening
4. **Add a calendar link** — make saying yes frictionless

---

## 📈 SCORES BREAKDOWN

| Category | Score | Note |
|----------|-------|------|
| Discovery | 81 | Strong diagnostic questions |
| Rapport | 76 | Good mirror language |
| Control | 68 | Lost some momentum mid-call |
| Qualification | 74 | Covered key criteria |
| Close | 52 | Soft fade — needs work |
| **Overall** | **72** | **Solid with clear upside** |

---

*This is your Call Lab Lite analysis. For pattern recognition, framework scoring, tactical rewrites, and trust mapping, upgrade to Call Lab Pro.*`;

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
            Sarah Chen — TechCorp • Discovery Call • Dec 12, 2024
          </p>
        </div>

        {/* Markdown Report */}
        <div className="bg-[#111] border border-[#333] rounded-lg p-6 mb-8">
          <div className="prose prose-invert prose-sm max-w-none">
            {/* Snap Score */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#333]">
              <div className="text-5xl font-anton text-[#FFDE59]">72</div>
              <div>
                <div className="text-[#666] text-xs tracking-wider">SNAP SCORE</div>
                <div className="text-white font-semibold">SOLID</div>
                <div className="text-[#B3B3B3] text-sm">Building trust and creating momentum</div>
              </div>
            </div>

            {/* What Worked */}
            <section className="mb-8">
              <h2 className="font-anton text-xl text-green-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>✅</span> WHAT WORKED
              </h2>

              <div className="space-y-6">
                <div className="bg-[#1A1A1A] border-l-4 border-green-500 p-4 rounded-r">
                  <h3 className="text-white font-semibold mb-2">1. Strong Opening Hook</h3>
                  <blockquote className="text-[#B3B3B3] italic border-l-2 border-[#333] pl-3 mb-2">
                    &quot;I noticed TechCorp just raised Series B — congrats. That usually means the scaling problems we talked about are about to get a lot more real.&quot;
                  </blockquote>
                  <p className="text-green-400 text-sm">
                    <strong>Why it worked:</strong> You immediately demonstrated you did homework and connected it to their world. Sarah leaned in from the start.
                  </p>
                </div>

                <div className="bg-[#1A1A1A] border-l-4 border-green-500 p-4 rounded-r">
                  <h3 className="text-white font-semibold mb-2">2. Self-Diagnosis Pull</h3>
                  <blockquote className="text-[#B3B3B3] italic border-l-2 border-[#333] pl-3 mb-2">
                    &quot;So when you say things are &apos;starting to break&apos; — what specifically is breaking first?&quot;
                  </blockquote>
                  <p className="text-green-400 text-sm">
                    <strong>Why it worked:</strong> Instead of assuming her problem, you made her articulate it. This creates ownership and makes your solution more compelling.
                  </p>
                </div>

                <div className="bg-[#1A1A1A] border-l-4 border-green-500 p-4 rounded-r">
                  <h3 className="text-white font-semibold mb-2">3. Mirror Language</h3>
                  <p className="text-[#B3B3B3] mb-2">
                    Throughout the call, you used Sarah&apos;s exact phrases back to her: &quot;scaling wall,&quot; &quot;good enough for now,&quot; &quot;Q2 deadline.&quot;
                  </p>
                  <p className="text-green-400 text-sm">
                    <strong>Why it worked:</strong> This builds unconscious rapport and makes her feel understood.
                  </p>
                </div>
              </div>
            </section>

            {/* What to Watch */}
            <section className="mb-8">
              <h2 className="font-anton text-xl text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>⚠️</span> WHAT TO WATCH
              </h2>

              <div className="space-y-6">
                <div className="bg-[#1A1A1A] border-l-4 border-[#E51B23] p-4 rounded-r">
                  <h3 className="text-white font-semibold mb-2">1. Soft Close Fade</h3>
                  <blockquote className="text-[#B3B3B3] italic border-l-2 border-[#333] pl-3 mb-2">
                    &quot;Great conversation. Let me send you some info and you can let me know what you think.&quot;
                  </blockquote>
                  <p className="text-[#E51B23] text-sm mb-2">
                    <strong>The problem:</strong> &quot;Let me know&quot; is the weakest close possible. You did all the hard work of building trust and then left without a commitment.
                  </p>
                  <p className="text-[#FFDE59] text-sm">
                    <strong>The fix:</strong> Always propose a specific next step with date/time: <em>&quot;Let&apos;s schedule 30 minutes Tuesday at 2pm to walk through how this could work for TechCorp.&quot;</em>
                  </p>
                </div>

                <div className="bg-[#1A1A1A] border-l-4 border-orange-500 p-4 rounded-r">
                  <h3 className="text-white font-semibold mb-2">2. Premature Product Mention</h3>
                  <p className="text-[#B3B3B3] mb-2">
                    At 35:00, when Sarah asked &quot;so what do you do?&quot; you went straight into product features.
                  </p>
                  <p className="text-[#E51B23] text-sm mb-2">
                    <strong>The problem:</strong> She wasn&apos;t asking for a pitch — she was testing if you&apos;d stay in consultation mode or flip to sales mode.
                  </p>
                  <p className="text-[#FFDE59] text-sm">
                    <strong>The fix:</strong> Redirect with <em>&quot;Before I answer that — I want to make sure what I share is actually relevant to what you&apos;re dealing with. Can I ask one more question?&quot;</em>
                  </p>
                </div>
              </div>
            </section>

            {/* Your One Move */}
            <section className="mb-8">
              <div className="bg-[#FFDE59]/10 border-l-4 border-[#FFDE59] p-6 rounded-r">
                <h2 className="font-anton text-xl text-[#FFDE59] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>🎯</span> YOUR ONE MOVE
                </h2>
                <p className="text-white text-lg mb-4">
                  <strong>Fix the close.</strong> You&apos;re doing 90% of the work right and losing deals at the finish line. Before ANY call ends, lock in a specific next step with a calendar invite.
                </p>
                <p className="text-[#B3B3B3] mb-3">Practice this phrase until it feels natural:</p>
                <blockquote className="text-[#FFDE59] italic text-lg">
                  &quot;Based on what you shared about [their stated priority], I&apos;d suggest we reconnect [specific day] to [specific agenda]. I have [time A] or [time B] — which works better?&quot;
                </blockquote>
              </div>
            </section>

            {/* Immediate Actions */}
            <section className="mb-8">
              <h2 className="font-anton text-xl text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>📋</span> IMMEDIATE ACTIONS
              </h2>
              <div className="bg-[#1A1A1A] border border-[#333] p-4 rounded">
                <ol className="space-y-2 text-[#B3B3B3]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#FFDE59] font-bold">1.</span>
                    <span><strong className="text-white">Send follow-up email TODAY</strong> with a specific meeting request</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FFDE59] font-bold">2.</span>
                    <span><strong className="text-white">Include the case study</strong> you mentioned — deliver on your promise</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FFDE59] font-bold">3.</span>
                    <span><strong className="text-white">Reference &quot;the scaling wall&quot;</strong> — show you were listening</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#FFDE59] font-bold">4.</span>
                    <span><strong className="text-white">Add a calendar link</strong> — make saying yes frictionless</span>
                  </li>
                </ol>
              </div>
            </section>

            {/* Scores */}
            <section className="mb-8">
              <h2 className="font-anton text-xl text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>📈</span> SCORES BREAKDOWN
              </h2>
              <div className="bg-[#1A1A1A] border border-[#333] rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#333]">
                      <th className="text-left text-[#666] font-normal p-3">Category</th>
                      <th className="text-center text-[#666] font-normal p-3">Score</th>
                      <th className="text-left text-[#666] font-normal p-3">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#333]">
                      <td className="p-3 text-white">Discovery</td>
                      <td className="p-3 text-center text-green-500 font-bold">81</td>
                      <td className="p-3 text-[#B3B3B3]">Strong diagnostic questions</td>
                    </tr>
                    <tr className="border-b border-[#333]">
                      <td className="p-3 text-white">Rapport</td>
                      <td className="p-3 text-center text-green-500 font-bold">76</td>
                      <td className="p-3 text-[#B3B3B3]">Good mirror language</td>
                    </tr>
                    <tr className="border-b border-[#333]">
                      <td className="p-3 text-white">Control</td>
                      <td className="p-3 text-center text-[#FFDE59] font-bold">68</td>
                      <td className="p-3 text-[#B3B3B3]">Lost some momentum mid-call</td>
                    </tr>
                    <tr className="border-b border-[#333]">
                      <td className="p-3 text-white">Qualification</td>
                      <td className="p-3 text-center text-green-500 font-bold">74</td>
                      <td className="p-3 text-[#B3B3B3]">Covered key criteria</td>
                    </tr>
                    <tr className="border-b border-[#333]">
                      <td className="p-3 text-white">Close</td>
                      <td className="p-3 text-center text-[#E51B23] font-bold">52</td>
                      <td className="p-3 text-[#B3B3B3]">Soft fade — needs work</td>
                    </tr>
                    <tr className="bg-[#0a0a0a]">
                      <td className="p-3 text-white font-bold">Overall</td>
                      <td className="p-3 text-center text-[#FFDE59] font-bold text-lg">72</td>
                      <td className="p-3 text-white font-semibold">Solid with clear upside</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-[#111] border-2 border-[#E51B23] rounded-lg p-8 mb-8">
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
            <span className="text-[#666] text-sm">Example data • Not a real report</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
