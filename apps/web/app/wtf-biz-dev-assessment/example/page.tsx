import type { Metadata } from 'next';
import Link from 'next/link';
import { StageProgress } from '../report/[id]/StageProgress';
import { ExampleReport } from './ExampleReport';

export const metadata: Metadata = {
  title: 'Example BD Readiness Report | WTF Agency Assessment',
  description:
    'Sample output from the WTF Biz Dev Assessment — Half-Built Engine stage. Fictional agency, real format.',
};

const SAMPLE_MARKDOWN = `# You're at the Half-Built Engine stage.

You've graduated from doing it all yourself — but the system isn't yours yet. It's still in your head, your inbox, and the gut calls you make on Sunday nights.

## The Truth You Need to Hear

You said you want a BD hire to *"finally drive revenue without me having to be in every conversation."* That sentence is the most common reason agency BD hires fail. Not a lack of talent. Not a lack of comp. The belief that the right person will *generate* the system you haven't built yet.

55% of agency first sales hires are gone in 12 months (Haus Advisors). 9% hit quota. 76% of BD director tenures last under two years (RSW/US 2024). Those numbers aren't a hiring problem — they're an installation problem. The agencies that beat the average install the offer, the ICP, the pitch, the qualification criteria, and the deal-review cadence *before* day one. Not after the new hire is three months in trying to reverse-engineer your taste from the deals they lost.

You're closer than most. You have referral velocity. You have a recognizable shape to your sales motion. What you don't have — yet — is anything a BD person could pick up and run with on day one.

## Where You Stand — Dimension by Dimension

### Lead Flow — 55/100

You said most conversations come from *"referrals from clients and my network"* and you're seeing *"4–10 qualified opps a month."* That's a real engine — but it's *your* engine. It runs on your relationships, your weekend coffees, the credibility you've built personally over a decade.

Your website pulls weight on positioning but not on capture. There's no gated content, no newsletter funnel above the fold, no clear path from "interested visitor" to "qualified lead." Your LinkedIn the last 60 days is three personal essays and a reshare — thoughtful, but not a content engine. A BD hire walking into this would have nowhere to point inbound traffic that isn't already pointed at you personally.

### Sales Process — 45/100

You said the last five deals were *"mostly the same shape, but it's all in my head."* That's the **Personality Trap** writing the answer. The shape exists. You'd recognize it if I drew it. But "in my head" means a new hire has to interview you to learn it — and you'll resent the time, and they'll guess wrong, and the deal will slip.

You also said discovery is *"a conversation, not a checklist."* Worth saying directly: discovery being a conversation is fine. Discovery being *only* a conversation, with nothing written down, means every deal is a one-off. There's no way to coach a BD hire toward your win rate because the win rate exists nowhere outside your instincts.

### ICP & Offer Clarity — 60/100

The homepage above-the-fold reads: *"Brand strategy and design for B2B companies that take themselves seriously."* That's a solid sentence. It signals positioning. It signals taste. It does not signal who specifically you sell to, what trigger event makes them buy, or what they walk away with on day 90.

Your "what we sell" answer was *"brand strategy, identity, and launch systems for Series A–C B2B SaaS."* That's tighter and better than your homepage. The version in your head is sharper than the version on your site — and that gap is the gap a BD hire trips on. They'll pitch the website, lose the deal, and you'll wonder why they couldn't close like you do.

### Founder Readiness — 40/100

You said your goal for the BD hire is *"finally drive revenue without me having to be in every conversation."* I'm going to push back hard.

A BD hire doesn't drive revenue. *A system* drives revenue. The hire operates the system. If the system isn't built, you're hiring someone to build it on the fly — at $60K base plus commission — while also asking them to hit a quota that assumes the system already works. That's the trap. That's why 55% leave in year one.

You also said you're spending *"15+ hours a week"* on sales. You can't extract a system in 15 hours/week of doing it. You extract it by stopping for a sprint, watching yourself sell, writing it down, and handing it over. That's the work. It is not delegable to a new hire.

### Proof & Enablement — 50/100

Three case studies on the site, all from 2023 or earlier. No quantified outcomes — the strongest one says *"helped reposition them for their Series B."* That's a story, not a proof point. A BD hire walks into a sales conversation with no quantified before/after, no verbatim founder testimonial they can pull on a call, no slide they can drop into a pitch deck.

You have the work. You don't have the artifacts.

## The Trap You're In: Personality

Three of your answers map to the same pattern: it's all in your head, discovery is "a conversation," the offer is sharper in your phrasing than on your site. That's the **Personality Trap**. The thing you sell is partially *you* — your taste, your read on the room, the way you ask the second-best question.

That's not a problem. It's an asset. The problem is that an asset only you can use is not a business — it's a job that pays you well. A BD hire built on top of the Personality Trap learns to do an impression of you, gets it wrong on a deal that mattered, and gets blamed for not being you. Then they leave. Then you hire again. That's the loop you're about to enter if you skip the extraction work.

## Your 3-Sprint Plan to Get Ready

### Sprint 1 — Extract (Month 1)
- Run a 4-deal retrospective. Two half-days, reverse-engineer your real ICP, your actual qualification criteria, and the offer you sell (not the one on your site).
- Tighten the homepage above-the-fold to match what you said in your own answer: "brand strategy and launch systems for Series A–C B2B SaaS." That sentence is better than what's there now.
- Document the five-stage shape of your deals — even if it's three pages, even if it's wrong on the first pass. Written beats perfect.
- Write the trigger-event list: the three things happening at a prospect's company that mean "now."

### Sprint 2 — Document (Month 2)
- Build a discovery framework you'd actually use — six to eight questions, sequenced, with what each is supposed to surface. Not a script. A spine.
- Quantify two case studies. Go back to the founders and get the number. *"Repositioned for their Series B"* becomes *"led to their $24M raise in 11 weeks."*
- Write the 3-page "How We Sell" doc — your sales narrative, your objection patterns, the language you use under pressure. The doc the BD hire reads on day one.
- Define what a Stage 1 → Stage 5 deal looks like in your CRM, so the BD hire isn't guessing what "qualified" means.

### Sprint 3 — Install (Month 3)
- Stand up the pipeline infrastructure: CRM hygiene, deal stages mapped to the documented process, weekly deal-review cadence you'd run with a BD hire.
- Build the role scorecard for the hire — not the JD. The first-90, first-180, first-365 expectations, and what "good" looks like at each.
- Prep your offer architecture for handoff. Pricing logic written down, scope guardrails, the three things you say yes to and the three you say no to.
- *Then* — and only then — open the role. You'll hire faster, screen sharper, and the person who walks in on day one will have somewhere to stand.

## What's Next

You're not ready to hire a BD resource. That's not a no — that's a *not yet*, and that's the right answer.

SalesOS Studio is a 3-month engagement to extract the system you're running on instinct and turn it into infrastructure your team can use. Not a strategy doc. Not a deck. The actual operating components: ICP, offer, qualification, sales narrative, deal stages, role scorecard. The things a BD hire needs to walk into.

Most agencies skip this step. They hire first, hope for the best, and join the 55%. You don't have to.

## A Note from Tim

I've watched this movie a few hundred times.

Founder gets to $2–4M. Tired of being in every deal. Hires a BD person with a great LinkedIn and a confident answer to "tell me about your last big win." Six months in, the BD person is asking the founder to join more calls. Twelve months in, the founder is closing those deals personally. Fourteen months in, the BD person is gone, and the founder is back to doing it all — except now there's a $90K hole in the P&L and a story about how "we tried that and it didn't work."

It almost always works. *Almost.* The agencies it works for are the ones who did the boring extraction work first. They wrote it down. They argued about whether the qualification criteria was right. They tightened the homepage. They built the scorecard before the JD. By the time the new hire showed up, there was a thing for them to operate.

That's what Studio is. It's not glamorous. It's twelve weeks of writing things down and arguing about them until they're sharp. If you do that work, the hire becomes much harder to mess up. If you don't, the hire is the problem you'll be paying for next year.
`;

export default function BizDevReportExamplePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
          <p className="font-semibold text-accent">Example report</p>
          <p className="text-muted-foreground mt-1">
            This is a sample output from the WTF Biz Dev Assessment using a fictional
            agency. Want one for your own?{' '}
            <Link href="/wtf-biz-dev-assessment" className="underline hover:text-foreground">
              Take the assessment &rarr;
            </Link>
          </p>
        </div>

        <StageProgress stage="half_built_engine" />
        <ExampleReport markdown={SAMPLE_MARKDOWN} />
      </div>
    </main>
  );
}
