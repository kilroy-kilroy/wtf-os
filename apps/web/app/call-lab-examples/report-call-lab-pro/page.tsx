'use client';

import Link from 'next/link';
import { ConsolePanel, ConsoleHeading, ConsoleMarkdownRenderer } from '@/components/console';

/**
 * Example Call Lab Pro Report Page
 *
 * Public showcase of a Call Lab Pro analysis with synthetic data.
 * No auth required - all data is hardcoded.
 * Uses the same ConsoleMarkdownRenderer as the real Call Lab Pro reports.
 */

const SYNTHETIC_PRO_REPORT = `**Call:** Alex Morgan (Rep) → Sarah Chen, VP Operations @ TechCorp
**Duration:** 42 minutes
**Score:** 7.2/10
**Sales Dynamics Profile:** High-Trust Diagnostician, Weak Closer

Alex ran a textbook discovery call for 38 minutes and then fumbled the last four. The diagnostic work was genuinely impressive -- you got Sarah to articulate pain she hadn't verbalized before, and the trust curve was climbing the whole time. But the close was soft enough to sleep on. "I'll send you some info" is not a next step. It's a polite exit ramp. The good news: everything that matters here is fixable, and the foundation you built is strong enough to build a deal on. You're not missing talent. You're missing the last 5% of the play.

---

## TRUST ACCELERATION MAP

### Rapport Snap (0:00 - 2:00) -- [The Vulnerability Flip](/wtf-sales-guide#vulnerability-flip)

Alex referenced TechCorp's Series B news and connected it to a pattern he'd seen in similar companies -- scaling pain that shifts from annoying to existential.

Sarah felt: This person did their homework. Worth giving them five more minutes.

> "I saw TechCorp just closed Series B -- congrats. In my experience, that's usually when ops challenges shift from annoying to blocking growth."

### Identity Lock (14:00 - 22:00) -- [The Diagnostic Reveal](/wtf-sales-guide#diagnostic-reveal)

Alex asked three levels of "what happens when" questions, helping Sarah see her problem at a depth she hadn't reached on her own. She stopped being polite and started being honest.

Sarah felt: This person sees something I missed. I should keep talking.

> "I hadn't thought about it that way before."

### Value Shape (28:00) -- [The Vulnerability Flip](/wtf-sales-guide#vulnerability-flip)

Alex shared a relevant failure story when Sarah expressed concern about implementation risk. Instead of dismissing it, he matched her vulnerability with his own.

Sarah felt: They get it. They're not just selling -- they actually understand.

### Friction Spike (35:00) -- [The Premature Solution](/wtf-sales-guide#premature-solution)

Alex switched to a generic product pitch when Sarah asked "so what do you do?" Lost the diagnostic frame entirely. Went from trusted advisor to vendor in one sentence.

Sarah felt: Oh, here comes the sales pitch. Guard going up.

> "We're a platform that helps companies scale their operations through automation."

**Alternative move:** Connect back to her language: "Remember that scaling wall you mentioned? We help companies like TechCorp break through it -- specifically by automating the manual processes that are eating your team alive right now."

### Close Window (41:00) -- [The Soft Close Fade](/wtf-sales-guide#soft-close-fade)

Alex said "I'll send you some info" instead of proposing a specific next step. Sarah was ready to commit time. Alex gave her permission to disappear instead.

Sarah felt: They're not confident enough to ask. Maybe this isn't as good a fit as I thought.

> "Let me send you some information and you can let me know what you think."

**Alternative move:** "Based on your Q2 timeline, I'd suggest we reconnect Tuesday to map out what an implementation could look like. I have 2pm or 4pm -- which works better?"

---

## BUYER EMOTIONAL ARC

**Openness** -- Sarah came in warm. She took the call, she was engaged from the opener, and she responded to Alex's research with genuine interest. Trigger: the Series B reference. What she needed: proof this wasn't going to be a generic pitch. Hidden motivation: she's under pressure from the board to show operational progress and she's looking for someone who can help her look smart internally.

**Vulnerability** -- At 14 minutes, Sarah admitted the manual processes were worse than she'd let on. She said "I hadn't thought about it that way before" -- which is buyer code for "you just made me uncomfortable in a good way." Trigger: Alex's third-level discovery question. What she needed: safety to be honest about how bad things really were. Hidden fear: she's worried she waited too long to fix this and it's going to reflect poorly on her.

**Clarity** -- Around minute 22, Sarah started using Alex's language back to him. "Scaling wall" became her phrase. She was organizing her own problem through Alex's framework. Trigger: the "what happens when" sequence. What she needed: a mental model she could take to her CTO. What you could have amplified: ask her to articulate the cost of inaction in her own words. She was ready.

**Reservation** -- At minute 28, Sarah mentioned budget. This wasn't an objection -- it was a buying signal. She was thinking about what this would cost because she was already imagining buying it. Alex dismissed it too quickly with "we can work with that." Trigger: the transition from diagnosis to solution. What she needed: acknowledgment that budget is real, followed by a reframe around cost of inaction. What you missed: the chance to anchor value before price ever came up.

**Momentum** -- Sarah asked "so what do you do?" at minute 35. This is the golden question. She was inviting Alex to sell. Instead, Alex delivered a generic pitch that could have been for any company. Momentum died. Trigger: Sarah's genuine curiosity. What she needed: a solution framed in HER language about HER problems. What you should have done: "You just told me your team is drowning in manual work. That's literally the problem we solve."

**Commitment** -- Never fully arrived. Sarah was polite at the end but noncommittal. She said "sounds great, send me some info" which is the professional equivalent of "don't call me, I'll call you." Trigger: the soft close. What she needed: a confident, specific ask. What you left on the table: a second meeting with a clear purpose and a date on the calendar.

---

## CALL STAGE SCORECARD

**Opening / Rapport: 8/10**
Referenced TechCorp's Series B news and connected it to operational scaling challenges. Sarah leaned in immediately.
What good looks like: Industry-specific opener that earns the first 5 minutes.

**Agenda Setting: 6/10**
Loosely set a plan ("I'd love to understand what's going on and see if there's a fit") but never returned to it.
What good looks like: Clear agenda confirmed by the buyer, referenced at transitions.
Gap: No agenda checkpoint at the midpoint or before the close. The call drifted after discovery.

**Discovery: 9/10**
Three levels deep on the scaling problem. Got Sarah to say "I hadn't thought about it that way before." Gold.
What good looks like: Prospect articulates their own problem in new language.

**Value / Solution Framing: 5/10**
Jumped to generic product description when Sarah asked "so what do you do?" Could have been pitching to anyone.
What good looks like: Connect your solution directly to THEIR stated pain using THEIR language.
Gap: Switched from diagnostic mode to pitch mode. Lost the thread you spent 25 minutes building.

**Objection Handling: 5/10**
When Sarah raised budget, Alex said "we can definitely work with that" and moved on. No exploration, no reframe.
What good looks like: Acknowledge the concern, quantify the cost of inaction, reframe the investment.
Gap: Dismissed the budget conversation instead of using it to build urgency.

**The Ask / Close: 4/10**
Ended with "I'll send you some info and you can let me know." No date, no time, no calendar.
What good looks like: Specific date/time proposed with a reason tied to their urgency.
Gap: You did 40 minutes of trust-building and then gave her permission to ghost you.

**Next Steps: 3/10**
"I'll send you something" with no specifics. No mutual commitment. No accountability.
What good looks like: "Tuesday at 2pm, I'll bring a TechCorp-specific implementation plan. I'll send a calendar invite now."
Gap: Vague follow-up is where good calls go to die. This one almost did.

---

## PATTERN INTELLIGENCE

### STRENGTHS DETECTED

**[The Diagnostic Reveal](/wtf-sales-guide#diagnostic-reveal)** (Diagnosis) -- STRONG
Named a pattern Sarah hadn't seen: that her "good enough" processes were actually compounding technical debt. Got her to articulate the problem at a level she hadn't reached before.
Why it worked: Prospects who discover their own problems buy at 4x the rate. You didn't tell her she had a problem -- you helped her see it.

> "What happens when that breaks down at 300 people instead of 150?"

How to replicate: Ask "what happens when..." to help prospects see second-order consequences they haven't considered. Go three levels deep, minimum.

**[The Vulnerability Flip](/wtf-sales-guide#vulnerability-flip)** (Connection) -- STRONG
When Sarah mentioned a failed implementation, Alex shared a story about a similar mistake he'd seen rather than dismissing it or rushing past it.
Why it worked: Turning a potential objection into shared experience deepened trust at a critical moment. Sarah went from guarded to open in one exchange.

> "Yeah, I've seen that exact thing happen. The team at [company] had the same experience..."

How to replicate: When prospects share failures or concerns, match with a relevant story before pivoting to your solution. Vulnerability is a trust accelerant, not a weakness.

**[The Peer Validation Engine](/wtf-sales-guide#peer-validation-engine)** (Connection) -- MEDIUM
Sarah started using Alex's language ("scaling wall," "compounding debt") by minute 25. She was adopting his framework as her own.
Why it worked: When a buyer uses your language, they've internalized your diagnosis. That's the precondition for buying your solution.

> "Yeah, it really is a scaling wall. I've been calling it growing pains but that's exactly what it is."

How to replicate: Introduce one sharp metaphor early in discovery. If the buyer adopts it, you've won the framing battle. Build your solution presentation around that shared language.

**[The Framework Drop](/wtf-sales-guide#framework-drop)** (Control) -- DEVELOPING
Alex's "what happens when" sequence functioned as an implicit framework, but it was never named or made explicit.
Why it worked: Even without a formal name, the structured questioning gave Sarah a mental model for her problem.

How to replicate: Name the framework. "I call this the Scaling Cascade -- one manual process breaks, which overloads the next one, which..." Named frameworks stick. Unnamed ones fade.

### FRICTION DETECTED

**[The Soft Close Fade](/wtf-sales-guide#soft-close-fade)** (Activation) -- HIGH
Ended with "I'll send you some information" and "let me know what you think." No specific ask. No date. No calendar invite. After 40 minutes of trust-building, Alex handed Sarah a polite off-ramp.
Why it hurt: Deals without specific next steps have a 73% lower close rate. You did the hard work and then gave it away.

> "Great conversation. Let me send you some info and you can let me know what you think."

Fix: Always propose a specific date/time before the call ends. Use their stated urgency to justify it: "Given your Q2 deadline, let's schedule 30 minutes Tuesday to map this out."

→ **COUNTER:** [The Mirror Close](/wtf-sales-guide#mirror-close) -- Reflect Sarah's own words back: "You told me Q2 is the deadline and manual work is compounding every month. Let's not lose momentum." Then ask for the meeting.

**[The Premature Solution](/wtf-sales-guide#premature-solution)** (Control) -- HIGH
When Sarah asked "so what do you do?" Alex switched into pitch mode with a generic product description. Threw away 25 minutes of personalized discovery and replaced it with a sentence that could have come from the website.
Why it hurt: Sarah was inviting a consultative answer and got a brochure instead. Trust dropped visibly.

> "We're a platform that helps companies scale their operations through automation."

Fix: Answer the question through the lens of their specific pain. "You just told me your team is drowning in manual work and it gets worse every month. That's literally the problem we solve."

→ **COUNTER:** [The Self Diagnosis Pull](/wtf-sales-guide#self-diagnosis-pull) -- Instead of pitching, ask: "Based on what you've told me, what would the ideal solution look like for TechCorp?" Let her sell herself, then fill in the gaps.

**[The Scenic Route](/wtf-sales-guide#scenic-route)** (Connection) -- MEDIUM
Spent 6 minutes on company background before getting to the first real question. Sarah was polite but her energy dipped.
Why it hurt: Senior buyers give you 3-5 minutes to prove the call is worth their time. Alex used his on context Sarah already knew.

> "So TechCorp was founded in 2019 and you've grown to about 150 people..."

Fix: Open with a hypothesis, not a biography. "I saw TechCorp just closed Series B -- in my experience that's when ops challenges shift from annoying to blocking growth. Is that resonating?"

→ **COUNTER:** [The Framework Drop](/wtf-sales-guide#framework-drop) -- Give structure early that creates clarity and positions you as an authority, not a researcher.

---

## TACTICAL MOMENT REWRITE

### Moment 1: The Value Framing (35:00)

**What happened:**
> "We're a platform that helps companies scale their operations through automation."

**Why it missed:** Generic product description that sounds like every competitor. Didn't connect back to HER specific problem. You switched from doctor to brochure.

**Try this:** "Remember that scaling wall you mentioned? We help companies like TechCorp break through it -- specifically by automating the manual processes that are eating your team alive right now. Want me to show you how one similar company did it?"

**Spicier version:** "You just told me your team is drowning in manual work and it gets worse every month. That's literally the problem we solve. Want to see what it looks like when it's fixed?"

### Moment 2: The Close Attempt (41:15)

**What happened:**
> "Great conversation. Let me send you some information and you can let me know what you think."

**Why it missed:** Puts all the work on the prospect. "Let me know" is the weakest close possible. You did 40 minutes of trust-building and then handed her the exit.

**Try this:** "This was exactly the kind of conversation I was hoping for. Based on your Q2 timeline, I'd suggest we reconnect Tuesday to map out what an implementation could look like. I have 2pm or 4pm -- which works better for your schedule?"

**Spicier version:** "Sarah, you told me Q2 is the deadline and manual work is compounding every month. Let's not lose momentum. Tuesday at 2pm or 4pm -- I'll bring a specific plan for TechCorp."

### Moment 3: The Budget Conversation (28:15)

**What happened:**
> "Yeah, that's something we can definitely work with."

**Why it missed:** Dismissed her concern too quickly without acknowledging it or turning it into a conversation. Budget mentions are buying signals -- she's imagining the purchase. You treated it like an objection to dodge.

**Try this:** "Budget's always a real consideration. Help me understand -- if we could show you a path that paid for itself in 90 days, would that change the conversation?"

**Spicier version:** "Totally fair. But here's what I've seen: the companies that wait to fix this end up spending 3x more when it finally breaks. What if I showed you the math on that?"

### Moment 4: The Scope Boundary (22:00)

**What happened:**
> "Yeah, we can probably help with all of that."

**Why it missed:** Saying yes to everything sounds desperate, not confident. It makes the buyer wonder if you actually specialize in anything.

**Try this:** "We're really good at three things: automating manual workflows, killing the reporting bottleneck, and getting your team out of firefighting mode. The org design stuff -- that's a different conversation, and I'd be honest about where our lane ends."

---

## NEXT-CALL BLUEPRINT

1. **Send the follow-up email TODAY.** Subject line: "The scaling wall -- next steps for TechCorp." Reference her exact language. Propose Tuesday at 2pm with a specific agenda.

2. **Open the next call with this exact question:** "Last time we talked, you said the manual processes were compounding every month. What's happened in the last week? Has anything gotten worse?"

3. **Introduce pricing at minute 20, not minute 40.** Use this bridge: "I want to be upfront about investment so we can both figure out if this makes sense. Here's what similar engagements look like..."

4. **Three calibrated discovery questions for Sarah's psychology:**
   - "If you could snap your fingers and fix one operational bottleneck before Q2, what would it be?"
   - "When you imagine presenting the solution to David Park, what does he need to see to say yes?"
   - "What would it cost TechCorp if you do nothing and hit that scaling wall at 300 people?"

5. **The narrative bridge (story-to-solution):** "I worked with a VP Ops in a similar situation last year -- Series B, 180 people, ops team underwater. In 90 days they went from 40 hours a week of manual reporting to 4. Here's what we did and how it maps to your situation."

6. **The ask language:** "Based on everything we've discussed, I think there's a clear path here. I'd like to propose a 90-day pilot starting in April. Can I walk you through what that looks like and we can decide together if it's the right fit?"

7. **Boundary-setting line:** "I want to be honest -- we're great at workflow automation and reporting. The org design piece is outside our core. I'd rather be straight about that than overpromise."

8. **Stall recovery line:** "I get it -- there's a lot to consider. But you told me Q2 was the deadline and the manual work compounds every month. What needs to be true for you to make a decision this week?"

---

## PERFORMANCE SCORES

**Psychological Attunement: 8/10**
Read Sarah's emotional state accurately throughout and matched her energy at every shift. To improve: use those reads to time your ask -- you sensed she was ready to commit but didn't act on it.

**Positioning Accuracy: 6/10**
Strong during discovery, weak during the pitch. You positioned yourself as a diagnostician but then pitched like a vendor. To improve: never break character. If you're the advisor, stay the advisor. Pitch through that frame.

**Narrative Shaping: 7/10**
Created a compelling "scaling wall" narrative that Sarah adopted. Lost the thread when you switched to product mode. To improve: build the entire presentation around the narrative you co-created in discovery.

**Transition Control: 5/10**
The shift from discovery to solution was jarring. No bridge, no permission, no transition language. To improve: use a pivot phrase: "Based on what you've shared, here's what I'd recommend..."

**Timing Discipline: 5/10**
Spent too long on background at the start and too little on the close at the end. The call was back-loaded with all the hard work and front-loaded with small talk. To improve: get to the first real question within 3 minutes. Save 5 minutes at the end for the close.

**Ask Effectiveness: 3/10**
There was no real ask. "I'll send you info" is not an ask. To improve: write your closing sentence before the call. Have it on a sticky note. Read it verbatim if you have to.

**Buyer Momentum Creation: 7/10**
Built real momentum through discovery and maintained it through minute 35. Then killed it with a generic pitch. To improve: think of momentum as a curve. Your job is to ride it into the close, not plateau at discovery.

**Scope Boundaries: 5/10**
Said "we can probably help with all of that" which is both vague and overcommitting. To improve: be specific about what you do and honest about what you don't. Buyers trust sellers who have limits.

**Confidence Projection: 6/10**
Highly confident during discovery, visibly less confident during the close. The tonal shift was noticeable. To improve: confidence at the close matters more than confidence at the open. Practice your ask until it feels as natural as your discovery questions.

---

## THE ONE THING

**THE BEHAVIOR:** Close with a specific date and time, not "let me know."

**WHAT HAPPENED:** You ended with "I'll send you some info and you can let me know what you think." This is a polite exit, not a next step. It gives Sarah every reason to deprioritize you.

**WHAT GOOD LOOKS LIKE:** "Based on your Q2 deadline, let's schedule 30 minutes Tuesday to walk through the implementation plan. I have 2pm or 4pm -- which works better?"

**THE DRILL:** On your next call, write your closing sentence on a sticky note BEFORE the call starts. At the 5-minute-warning mark, read it verbatim. Track whether you got a specific date on the calendar. That's it.

**WHY THIS MATTERS MOST:** Everything else on this call was strong. The discovery was elite. The rapport was genuine. But none of it converts to pipeline without a next step. This is the 5% change that will have a 50% impact on your close rate.

---

## BOTTOM LINE

You're a strong diagnostician who loses deals at the finish line. The trust you build is real, the discovery is excellent, and the rapport is genuine. But none of it matters if the prospect walks away without a next step. Fix the close and you're a top performer. That's not a pep talk -- it's math.`;

export default function ExampleProReportPage() {
  return (
    <div className="min-h-screen bg-black font-poppins">
      {/* Header */}
      <header className="border-b border-[#333] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/call-lab-examples" className="flex items-center gap-3">
            <div className="font-anton text-xl tracking-wide">
              <span className="text-white">CALL</span>
              <span className="text-[#E51B23]">LAB</span>
              <span className="bg-[#FFDE59] text-black text-xs px-2 py-0.5 ml-2">PRO</span>
            </div>
          </Link>
          <Link
            href="/call-lab-pro?utm_source=example"
            className="bg-[#E51B23] text-white px-4 py-2 font-anton text-sm uppercase tracking-wider hover:bg-[#C41820] transition-colors"
          >
            Unlock Pro Analysis
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Report Header */}
        <div className="mb-8">
          <h1 className="font-anton text-3xl text-[#FFDE59] uppercase tracking-wide mb-2">
            Call Lab Pro - Full Intelligence Report
          </h1>
          <p className="text-[#666] text-sm">
            Alex Morgan → Sarah Chen, VP Operations @ TechCorp - Discovery Call - Dec 12, 2024
          </p>
        </div>

        {/* Report - Same renderer as actual Call Lab Pro reports */}
        <ConsolePanel>
          <ConsoleHeading level={1} variant="yellow" className="mb-6">
            CALL LAB PRO - FULL INTELLIGENCE REPORT
          </ConsoleHeading>
          <ConsoleMarkdownRenderer content={SYNTHETIC_PRO_REPORT} />
        </ConsolePanel>

        {/* Upgrade CTA */}
        <div className="bg-[#111] border-2 border-[#E51B23] rounded-lg p-8 my-8">
          <div className="text-center mb-6">
            <h2 className="font-anton text-2xl text-[#FFDE59] uppercase tracking-wide mb-2">
              This is what a Pro analysis looks like.
            </h2>
            <h3 className="font-anton text-xl text-white uppercase tracking-wide">
              Now get one for your calls.
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Trust Acceleration Map:</span> See exactly when buyers go from skeptical to sold</div>
              <div>→ <span className="text-white">Buyer Emotional Arc:</span> The subtext your prospect never said out loud</div>
              <div>→ <span className="text-white">Tactical Rewrites:</span> Word-for-word fixes for every weak moment</div>
            </div>
            <div className="space-y-2 text-[#B3B3B3]">
              <div>→ <span className="text-white">Pattern Intelligence:</span> The 18 trust-building moves you&apos;re using (or missing)</div>
              <div>→ <span className="text-white">Next-Call Blueprint:</span> Exact questions and scripts for your follow-up</div>
              <div>→ <span className="text-white">The One Thing:</span> The single change that moves the needle most</div>
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
            Get this analysis for your calls
          </h2>
          <p className="text-white/90 mb-6 max-w-lg mx-auto">
            Pattern recognition. Stage scoring. Tactical rewrites. The One Thing. Everything you need to close more deals.
          </p>
          <Link
            href="/call-lab-pro?utm_source=example"
            className="inline-block bg-black text-white px-8 py-4 font-anton text-lg tracking-wider hover:bg-[#FFDE59] hover:text-black transition-colors"
          >
            Unlock Pro Analysis →
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
