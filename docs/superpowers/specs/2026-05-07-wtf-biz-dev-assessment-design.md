# WTF Biz Dev Assessment — Design Spec

**Status:** Draft for review
**Date:** 2026-05-07
**Owner:** Tim Kilroy
**Slug:** `/wtf-biz-dev-assessment`

---

## 1. Problem & Premise

Most agency CEOs in the $1M–$5M, 10–25 person band reach a point where founder-led sales no longer scales. The instinct is to hire a "BD resource" who will create deals. The reality, per the research:

- **55% of agency first-sales hires exit in year one** (Haus Advisors)
- **Only 9% hit quota** (Haus Advisors)
- **76% of agency BD director tenures are < 2 years** (RSW/US 2024)
- **82% of agencies are over-reliant on referrals** (Haus Advisors)
- **Only 27% have a documented sales process** (Haus Advisors)

The single biggest false belief driving these failures: *"A BD resource will create my pipeline."* They don't. They follow up on leads. Without lead flow, a documented sales process, a clear ICP/offer, founder time investment, and proof assets, the hire fails — and the founder blames the hire.

This assessment teaches the truth and routes founders to the SalesOS tier that fits their actual readiness:

- **Studio** — they're not ready to hire; they need to extract their selling instincts and build the system first
- **Growth** — they are ready to hire; they need the role/comp/ramp/coaching infrastructure installed *before* day 1

Every verdict ends with Tim's services. The assessment is a diagnostic lead magnet that disqualifies bad reasons to hire and qualifies the right SalesOS engagement.

## 2. Goals

- Diagnose readiness across 5 dimensions in ~5–7 minutes of user time
- Deliver a confidential, personalized report with website + LinkedIn evidence quoted as receipts
- Land a clear two-state verdict (Ready / Almost) with a Studio or Growth CTA
- Capture qualified lead data (name, email, LinkedIn, website, what/who they sell, revenue, affordability)
- Mirror existing app conventions (`discovery-lab` pattern; `wtf-assessment-example` layout)

## 3. Non-Goals (v1)

- Multiple tiers (no Lite/Pro split — single sharp lead magnet)
- Generating role JDs, comp plans, or ramp plans (those are Growth deliverables, not assessment outputs)
- A/B testing infrastructure (ship one strong variant; iterate after data)
- Public/social shareable scorecards (reports are confidential; see §10)
- Multi-language support
- Self-serve PDF download (email is the delivery channel; PDF is a future option)

## 4. Target User

- Agency CEOs/founders, $1M–$5M revenue, 10–25 employees
- Considering hiring a first BD resource OR has hired one and it's not working
- Likely arrives via Tim's content channels, SalesOS landing page, or referral

## 5. Architecture & Routes

### Route Surface

| Route | Type | Purpose |
|---|---|---|
| `/wtf-biz-dev-assessment` | Public client component | Landing → intake → questions → on-screen preview verdict |
| `/wtf-biz-dev-assessment/report/[id]` | **Auth-gated** server component | Confidential personalized report. Requires Supabase session whose email matches the assessment owner. |
| `POST /api/analyze/biz-dev` | Server route, `maxDuration = 300` | Validates payload → persists deterministic result → kicks off BrightData research + Claude synthesis → fires email/Slack/Copper → returns preview verdict to client. |
| `GET /auth/biz-dev-callback` | Server route | Magic-link callback — exchanges link token for session, redirects to report. (Or reuse existing auth callback with a `next=` param.) |

### Folder Layout

```
apps/web/app/
  wtf-biz-dev-assessment/
    layout.tsx                       # Mirrors wtf-assessment-example/layout.tsx
    page.tsx                         # Self-contained client flow
    report/
      [id]/
        page.tsx                     # Server component, auth + ownership check
        components/                  # Verdict header, dimensions, gaps, trap, CTA
  api/
    analyze/
      biz-dev/
        route.ts                     # Orchestration

packages/prompts/
  biz-dev-assessment/
    markdown-prompts.ts              # System + user prompts
    index.ts

packages/utils/src/assessment/
  biz-dev-questions.ts               # Single source of truth: 10 questions + answer choices + scores + trap tags
  biz-dev-scoring.ts                 # Pure deterministic scoring functions
  biz-dev-trap-diagnosis.ts          # Aggregates trap signals → dominant trap

apps/web/lib/
  biz-dev-report-context.ts          # Builds AI prompt input from intake + answers + research artifacts
```

### Single Source of Truth Files (per CLAUDE.md project rules)

- **Questions/Answers**: `packages/utils/src/assessment/biz-dev-questions.ts`
- **Scoring**: `packages/utils/src/assessment/biz-dev-scoring.ts`
- **Prompts**: `packages/prompts/biz-dev-assessment/markdown-prompts.ts`
- **Report Renderer**: `apps/web/app/wtf-biz-dev-assessment/report/[id]/page.tsx` + components

## 6. User Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: Hook (landing screen)                                     │
│  Truth-bomb headline:                                             │
│    "Most agency CEOs think a BD hire creates deals.               │
│     They don't. They follow up leads. Are you ready to feed one?" │
│                              ↓                                    │
├──────────────────────────────────────────────────────────────────┤
│ Step 2: Intake (~3 min)                                           │
│  • Name, Email, Company name                                      │
│  • Website URL, LinkedIn URL (founder)                            │
│  • "What do you sell?" (free text, 1–3 sentences)                 │
│  • "Who do you sell to?" (free text, 1–3 sentences)               │
│  • Revenue band: <$1M / $1–3M / $3–5M / $5–10M / $10M+            │
│  • Affordability: "Could you fund $60K base salary for 4–6        │
│    months without expecting any return?"   Yes / No / Not sure    │
│  • Newsletter opt-in (checkbox, default off)                      │
│                              ↓                                    │
├──────────────────────────────────────────────────────────────────┤
│ Step 3: 10 Questions (~4 min)                                     │
│  • One question per screen                                        │
│  • Multiple-choice (4 behavior-based answer choices each)         │
│  • Progress bar (1/10 ... 10/10)                                  │
│  • Back button enabled                                            │
│                              ↓                                    │
├──────────────────────────────────────────────────────────────────┤
│ Step 4: Preview Verdict (instant, on-screen, NOT auth-gated)      │
│  • "You're Almost" or "You're Ready"                              │
│  • Composite score (X/100)                                        │
│  • Top 1–2 dimensional gaps as teasers                            │
│  • "Your full personalized report is being prepared. Check your   │
│    inbox in ~5 minutes for the secure link."                      │
│  • Optional: "Book a call with Tim now" CTA                       │
│                              ↓                                    │
├──────────────────────────────────────────────────────────────────┤
│ Step 5 (async): Confidential Report                               │
│  Email arrives with a magic-link URL.                             │
│  User clicks → Supabase session created for that email →          │
│  redirected to /wtf-biz-dev-assessment/report/[id].               │
│  Server component validates session + ownership.                  │
│  Returning users with active session: link goes straight to       │
│  report. Without session: re-request magic link.                  │
└──────────────────────────────────────────────────────────────────┘
```

## 7. The 10 Questions

Wording is subject to a copywriter pass before launch (per Section 2 sign-off). Structure, dimensions, scoring weights, and trap tags are locked. All answers are MC; each carries a 0–4 score and optional trap tag(s).

**Hard-gate rule**: Any answer scored `0` on Q1, Q2, Q7, or Q8 forces verdict to `'almost'` regardless of composite total.

### Lead Flow (hard-gate dimension)

**Q1.** *"Right now, where do most of your new business conversations come from?"*
- Inbound from content/SEO/marketing we've built (4)
- Referrals from clients and my network (2)
- I personally hunt — outbound, podcasts, events I show up at (1)
- Whatever shows up that week — it's not consistent (0) ← hard-gate

**Q2.** *"How many qualified opportunities (real budget, real fit, decision-maker) land in your pipeline in a typical month?"*
- 20+ (4) | 10–20 (3) | 4–10 (2) | 0–3, or I'd have to count last month to know (0) ← hard-gate

### Sales Process

**Q3.** *"If I shadowed your last 5 closed deals, would I see one sales process — or five?"*
- Five different ones. Every deal is custom. (0)
- Mostly the same shape, but it's all in my head. (1) [Personality]
- Same shape, sort of documented. (3)
- Documented, repeatable, my team uses it. (4)

**Q4.** *"Your discovery call is mostly..."*
- Me talking, walking through what we do. (1) [Personality]
- Asking great questions and listening. (4)
- A loose mix — depends on the prospect. (2)
- I haven't done one in months — clients come pre-warmed. (3)

### ICP & Offer Clarity

**Q5.** *"Pick the description closest to your current pitch:"*
- "[niche] specialist agency for [specific buyer] solving [specific problem]" (4)
- "We help growth-stage companies with marketing" (1)
- "Strategy, creative, paid, organic — full-service" (0)
- "It depends — we tailor everything to each client" (1) [Personality]

**Q6.** *"Your services / offers are..."*
- 2–3 productized packages with fixed scope and price (4)
- A core retainer + custom add-ons (3)
- Mostly custom — we scope every engagement from scratch (1) [Personality]
- Whatever the client asks for, we figure it out (0)

### Founder Readiness (hard-gate dimension)

**Q7.** *"Be honest. What do you actually believe a great BD hire will do for you?"*
- Find prospects, build pipeline, close deals — drive revenue without me. (0) ← hard-gate [Indispensability + More Founder]
- Follow up on leads I generate, manage conversations I can't get to, free up my time. (4)
- I don't fully know — I just know I can't keep doing this myself. (1) [More Founder]
- Replace me in sales entirely so I can run the agency. (1) [Indispensability]

**Q8.** *"Once they're hired, how much of your week will you spend coaching, strategizing with, and unblocking them — for the first 6 months?"*
- 5+ hours/week — I get this won't work without me. (4)
- 1–2 hours — they should mostly be self-sufficient. (1) [Indispensability]
- I'm hiring them so I can stop doing this. (0) ← hard-gate [More Founder]
- Honestly haven't thought about it. (0) ← hard-gate

### Proof & Enablement

**Q9.** *"If a new BD person needs to make the case to a prospect today, what's ready to put in their hands?"*
- Pitch deck, 5+ written case studies, 3+ named references, a stocked story bank. (4)
- Rough deck, 1–2 case studies, references I'd need to ask permission for. (2)
- A website with logos. Otherwise I tell stories from memory. (1) [Indispensability]
- Nothing organized. I improvise every call. (0) [Personality + Indispensability]

**Q10.** *"If a prospect asked your new BD hire 'what's it like to work with you?', what would they actually say?"*
- Quote a customer, share specific outcomes, point to a documented promise. (4)
- Tell a story they've heard me tell. (3)
- Ad-lib based on what they think is true. (1) [Personality]
- Probably hand it back to me to answer. (0) [Indispensability]

## 8. Scoring & Verdict Logic

Pure functions in `packages/utils/src/assessment/biz-dev-scoring.ts`. Identical results client and server.

```typescript
type Dimension = 'lead_flow' | 'sales_process' | 'icp_offer'
              | 'founder_readiness' | 'proof_enablement';
type Trap = 'personality' | 'indispensability' | 'more_founder';

interface ScoreResult {
  dimensions: Record<Dimension, number>;     // 0-100, normalized from 0-8 raw (2 questions × max 4)
  composite: number;                          // weighted average, 0-100
  verdict: 'ready' | 'almost';
  hard_gate_failures: Array<'lead_flow' | 'founder_readiness'>;
  dominant_trap: Trap | null;
  cta_tier: 'studio' | 'growth';
}
```

**Verdict rule:**
- `'ready'` iff `composite >= 70` AND `hard_gate_failures.length === 0`
- otherwise `'almost'`

**CTA tier rule:**
- `'growth'` iff `verdict === 'ready'`
- otherwise `'studio'`

**Hard gate rule:**
- A dimension fails its hard gate if any of its hard-gate-tagged questions scored `0` on the chosen answer.
- `lead_flow` hard gate: Q1 or Q2 answer scored 0
- `founder_readiness` hard gate: Q7 or Q8 answer scored 0

**Composite weighting (initial, refine post-launch):**
- Lead Flow: 25%
- Sales Process: 15%
- ICP & Offer: 20%
- Founder Readiness: 25%
- Proof & Enablement: 15%
- Lead Flow and Founder Readiness are weighted highest because they're hard-gate dimensions and the most predictive failure modes per the research.

**Trap aggregation:**
- Each tagged answer contributes 1 vote to its trap.
- `dominant_trap` = the trap with the most votes.
- Ties: prefer Indispensability > More Founder > Personality (most editorially distinctive first).
- If no trap accumulates ≥ 2 votes, `dominant_trap = null` and the report omits the Trap section.

## 9. AI / Research Pipeline

### Two-Stage Computation

```
                                  ┌─────────────────────────────────┐
                                  │ 1. DETERMINISTIC (fast, exact)   │
        Client submit ────────────┤ • Score 10 answers → 5 dims      │
                                  │ • Apply hard gates               │
                                  │ • Aggregate trap signals         │
                                  │ • Verdict + CTA tier             │
                                  │   ⤷ runs CLIENT-SIDE for preview │
                                  │   ⤷ runs SERVER-SIDE as truth    │
                                  └────────────────┬────────────────┘
                                                   │
                                                   ▼
                            ┌──────────────────────────────────────┐
                            │ 2. RESEARCH + AI (slow, rich)         │
                            │  Server-only; runs in API route      │
                            │  • LinkedIn profile (founder)         │
                            │  • LinkedIn posts (founder)           │
                            │  • LinkedIn company (agency)          │
                            │  • Website fetch (home/services/      │
                            │    about, ~3 pages, 8s timeout each)  │
                            │  • Single Claude call: synthesize     │
                            │    intake + answers + verdict +       │
                            │    research → markdown report         │
                            └──────────────────────────────────────┘
```

### Research Calls (reuse `runV2DiscoveryResearch` patterns)

Parallel via `Promise.allSettled` — partial results acceptable.

```typescript
const [linkedInProfile, linkedInPosts, linkedInCompany, websiteContent] =
  await Promise.allSettled([
    scrapeLinkedInProfile(linkedin_url),                  // existing util
    scrapeLinkedInPosts(linkedin_url),                    // existing util
    scrapeLinkedInCompany(derivedCompanyUrl),             // optional
    fetchWebsitePages(website_url, ['', '/services', '/about']),
  ]);
```

### AI Synthesis Prompt

**System prompt** establishes voice + role:
> "You are the analytical voice of SalesOS by Tim Kilroy. You diagnose agencies that think they're ready to hire a BD resource. You're direct, opinionated, occasionally profane. You name things plainly. You quote evidence. You don't soften gaps. You always end with a clear next step (Studio or Growth). Do not make claims you can't substantiate from the data provided. If research artifacts are missing or partial, say so — never invent quotes."

**User prompt** payload:

```
INTAKE:
- name, email, company, website_url, linkedin_url
- service_description: <verbatim>
- customer_description: <verbatim>
- revenue_band, affordability_answer

ANSWERS (verbatim text of choice + score):
- Q1 (Lead Flow): "<chosen answer text>" (score 0, hard-gate fail)
- ... [all 10]

DETERMINISTIC RESULTS:
- dimensions: { lead_flow: 25, sales_process: 60, ... }
- composite: 48
- verdict: 'almost'
- hard_gate_failures: ['lead_flow']
- dominant_trap: 'indispensability'  // or null
- cta_tier: 'studio'

RESEARCH:
- LinkedIn profile (founder): { headline, summary, posts_count, recent_post_topics }
  OR: { error: 'unavailable' }
- LinkedIn posts (founder): [array of recent 10 posts] OR []
- LinkedIn company: { employees, founded, specialties, follower_count } OR null
- Website pages: { home: { h1, subhead, body_excerpt }, services: {...}, about: {...} }
  OR partial subset

OUTPUT: structured markdown following the schema in §10.
```

### Performance Budget

- Deterministic scoring: < 50 ms (client and server)
- BrightData LinkedIn fetches (parallel): 30–90 s typical
- Website fetch + parse: 5–15 s
- Claude synthesis: 20–40 s
- **Total target: 60–120 s**, well under the 300 s `maxDuration`

### Failure Modes

| Failure | Behavior |
|---|---|
| BrightData auth expired | Existing `alertBrightDataAuthExpired` Slack alert. Report generates from website + answers only. |
| Website fetch timeout (8 s/page) | Skip that page. AI prompt handles missing pages gracefully. |
| LinkedIn returns 404/private/banned | Skip. Note in report: "Couldn't access your LinkedIn — analysis is from your answers and website only." |
| Claude API error | `retryWithBackoff` (existing util). After max retries, fallback to templated report; Slack alert. |
| Total AI failure | Verdict still shown to user (deterministic). Email contains "report being prepared, expect within 30 min" + Slack alert. Background job retry. |

## 10. Persistence & Confidentiality

### Database Schema

```sql
create table biz_dev_assessments (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  user_id            uuid references auth.users(id) on delete set null,

  -- Identity (captured at intake; user_id resolved on magic-link click)
  name               text not null,
  email              text not null,
  company_name       text,
  website_url        text,
  linkedin_url       text,

  -- Discovery
  service_description    text,
  customer_description   text,
  revenue_band           text,
  affordability_answer   text,
  newsletter_opt_in      boolean default false,

  -- Deterministic results (written immediately on submit)
  answers                jsonb not null,
  dimensions             jsonb not null,
  composite_score        int not null,
  verdict                text not null check (verdict in ('ready','almost')),
  hard_gate_failures     jsonb,
  dominant_trap          text check (dominant_trap in ('personality','indispensability','more_founder')),
  cta_tier               text not null check (cta_tier in ('studio','growth')),

  -- Research artifacts (filled async)
  research_artifacts     jsonb,
  research_status        text default 'pending'
    check (research_status in ('pending','completed','partial','failed')),

  -- AI-generated report (filled async)
  report_markdown        text,
  report_status          text default 'pending'
    check (report_status in ('pending','completed','failed'))
);

create index biz_dev_assessments_email_idx on biz_dev_assessments (email);
create index biz_dev_assessments_user_id_idx on biz_dev_assessments (user_id);

-- RLS: user can only select their own rows
alter table biz_dev_assessments enable row level security;

create policy "users can read own assessments"
  on biz_dev_assessments for select
  using (auth.uid() = user_id);

create policy "service role full access"
  on biz_dev_assessments for all
  using (auth.role() = 'service_role');
```

### Auth & Confidentiality (passwordless magic link)

1. **Submit (no auth)**: anonymous user submits intake + answers.
2. **Server resolves email → user**:
   - If `auth.users` already has this email → use that `user_id`.
   - Otherwise, create a new Supabase Auth user (email, no password).
   - Persist row with `user_id` populated.
3. **Generate magic link, then send via Loops** (single email — see §15 risk #9):
   - Use `supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: ... } })` — this returns a URL **without** triggering Supabase's built-in email. Critical: do **not** use `signInWithOtp` here, which would send a duplicate email.
   - The returned URL points to Supabase's verify endpoint; on click it exchanges the OTP for a session and redirects to the report URL.
   - Loops sends the only email the user receives. Email body embeds the generated magic-link URL.
   - Magic links are one-time use; expiry follows Supabase project config (default 1 hour — consider raising to 24 h for this use case via Supabase dashboard).
4. **Report page (`/wtf-biz-dev-assessment/report/[id]`)**:
   - Server component reads the session via `createServerClient`
   - Loads the assessment row by id
   - **Verifies `assessment.user_id === session.user.id`** — if not, redirect to a "request a new magic link" page
   - Renders the report from `report_markdown`
5. **Returning users**: existing session = direct access. Expired session = re-request magic link.
6. **RLS** enforces ownership at the DB layer as a defense-in-depth check.

This means a leaked report URL is useless to anyone except the magic-link-authenticated owner. Bots scraping the URL get a redirect. Logged-in-as-someone-else gets a redirect.

### Report Markdown Structure

The Claude synthesis returns markdown shaped like this:

```markdown
# The Verdict: <Ready | Almost>
<one-sentence summary in SalesOS voice>

> Composite: <X>/100  |  Hard-gate fails: <list>  |  Trap: <name or "—">

## The Truth You Need to Hear
<2–3 paragraphs that quote their answer to Q7 verbatim and connect it
to the 55%-of-first-hires-fail benchmark. Truth-bomb section.>

## Where You Stand — Dimension by Dimension
### Lead Flow — <X>/100
<Their Q1+Q2 answers quoted. AI observation tying website/LinkedIn evidence.>
### Sales Process — <X>/100
<...>
### ICP & Offer Clarity — <X>/100
<Quotes their homepage h1/subhead. Calls out vagueness.>
### Founder Readiness — <X>/100
<...>
### Proof & Enablement — <X>/100
<Notes whether case studies/testimonials are visible on site.>

## The Trap You're In: <Personality | Indispensability | More Founder>
<2 paragraphs naming the pattern, with their own answers as evidence.
Section omitted entirely if dominant_trap === null.>

## What You Need to Build (Before the Hire Sticks)
<Personalized checklist. Items match their lowest dimensions.
For Almost: long, specific list (5–10 items).
For Ready: tight list (2–4 items, framed as "the install" before day 1).>

## What's Next
<CTA copy: Studio booking link if cta_tier === 'studio',
Growth booking link if cta_tier === 'growth'. Different copy per tier.>
```

## 11. Integrations (mirror `discovery-lab` patterns)

| System | Purpose | New code |
|---|---|---|
| **Loops** | "Report ready" email with magic-link URL | New `onBizDevReportGenerated` in `apps/web/lib/loops.ts`. Template fields: `name`, `verdict`, `top_3_gaps`, `dominant_trap`, `magic_link_url`, `cta_tier` (drives CTA copy). |
| **Beehiiv** | Optional newsletter subscribe | New `addBizDevAssessmentSubscriber` in `apps/web/lib/beehiiv.ts` (gated by `newsletter_opt_in === true`). |
| **Copper** | Create CRM lead with tier-appropriate ACV | New constants `BIZ_DEV_STUDIO_ACV` / `BIZ_DEV_GROWTH_ACV` and stage mapping in `apps/web/lib/copper.ts`. |
| **Slack** | Alert Tim on every report generated + on BrightData auth failures | New `alertBizDevReportGenerated` in `apps/web/lib/slack.ts`. Reuse existing `alertBrightDataAuthExpired`. |

All side-effect calls run via `waitUntil` (existing `@vercel/functions` pattern in `discovery-lab` route) — they shouldn't block the response.

## 12. Voice & Editorial

- **SalesOS voice throughout**: direct, opinionated, occasionally profane.
- Question stems push back on common myths.
- Answer choices use real-world founder language (no clinical Likert scales).
- Report copy quotes evidence from the user's own answers and website.
- Trap framing is **secondary** in the report — verdict + dimensions lead, Trap is an editorial close.
- The truth-bomb (BD doesn't create deals, they follow up) is encoded in:
  - Q7 scoring (the "drive revenue without me" answer is a hard-gate 0)
  - The "Truth You Need to Hear" report section that quotes their Q7 answer back
  - The benchmark stats (55% Y1 exit, 9% hit quota) cited in the verdict

## 13. Edge Cases

1. **Email already submitted previously** → allow new submission as a new row. Both rows tied to same `user_id`. Tim sees "Sarah submitted twice in 30 days; score went from 35 → 62" as Slack signal.
2. **Invalid LinkedIn URL** → accept, attempt fetch, gracefully degrade.
3. **One-page website** → fetch root only.
4. **User abandons mid-flow** → no DB write until final submit. Future: intermediate persistence for funnel analytics.
5. **AI synthesis fails entirely** → deterministic verdict still shown. Email sends fallback: "report being prepared, expect within 30 min." Slack alert. Background job retries.
6. **User clicks email link before report is ready** → render "your report is being prepared" page with auto-refresh every 5 s.
7. **BrightData auth expired** → existing alert fires. Report uses website + answers only. Note in report: "couldn't analyze your LinkedIn this time."
8. **User uses a competing magic-link from a forwarded email** → magic link is one-time use; second click fails with "this link has been used; request a new one."

## 14. Testing Strategy

- **Unit tests** on `biz-dev-scoring.ts`: every dimension, every hard gate, trap aggregation, edge cases (all-max, all-min, single-gate-fail, multi-gate-fail, ties).
- **Unit tests** on `biz-dev-trap-diagnosis.ts`: votes per trap, tie-breaking rules, null case.
- **Integration test** on `POST /api/analyze/biz-dev` with mocked BrightData + mocked Claude. Asserts: deterministic verdict matches client-computed; report markdown shape is valid; persistence and side-effects fire.
- **Auth integration test**: magic-link flow end-to-end with Supabase test client. Asserts: link redirects to report; non-owner is rejected; expired link is rejected.
- **Snapshot test** on the report renderer with fixed markdown input.
- **Manual QA**: email render, Copper lead creation, Slack alert formatting, mobile responsive.

## 15. Open Questions / Risks

1. **Wording pass on Q1–Q10**: structurally locked, but a copywriter pass should refine each stem and answer choice for maximum SalesOS punch. Should be done before launch.
2. **Composite weights** are an initial guess (25/15/20/25/15). After ~50 submissions we should review whether the verdict thresholds (≥ 70 for Ready) produce honest verdicts.
3. **Magic-link UX for returning users**: does the existing app already use Supabase Auth magic links elsewhere? If so, reuse the same callback pattern. If not, new callback may need polish (loading state, error states).
4. **Beehiiv newsletter list**: which list does the opt-in subscribe go to? Existing list or new?
5. **Copper stage mapping**: confirm the right stage and value bands for Studio vs Growth leads.
6. **Q1 "inbound" answer (score 4)** assumes documented inbound. We should consider adding an answer-clarification tooltip ("inbound = leads that come to you without you having to find them — not referrals from your network").
7. **Affordability question UX**: as a yes/no/not-sure, it's a soft signal. Not currently a hard gate. Should it be? (TBD after launch data.)
8. **Existing `/wtf-assessment-example`** is 928 lines, single self-contained component. We should mirror its split (or further-split into smaller components if 928 is unmanageable). Decide during implementation, not at design time.
9. **Magic-link OTP expiry**: Supabase default is 1 hour. For a "report ready" email a user might open later that day, raise to 24 h via the Supabase Auth dashboard. Document this as a deployment prerequisite.
10. **Single-email constraint**: the spec assumes Loops is the only email channel. If `supabase.auth.admin.generateLink` is unreachable from the runtime (e.g., service role key not available in this route), fallback would be `signInWithOtp` — but that triggers Supabase's email. Verify service role key is wired in `apps/web/lib` before implementation.

## 16. Implementation Plan Handoff

Once this spec is approved, the next step is to invoke `superpowers:writing-plans` to produce a step-by-step implementation plan. The plan should sequence:

1. **Foundations**: question/scoring/trap utilities (testable in isolation, no IO)
2. **Database**: migration + RLS policies + types
3. **Client flow**: landing → intake → questions → preview verdict
4. **API route**: validation → persistence → research orchestration → AI synthesis → side-effects
5. **Auth + Magic link**: Supabase user creation, magic-link send, callback handler
6. **Report renderer**: server component + section components, ownership check
7. **Integrations**: Loops, Beehiiv, Copper, Slack
8. **Polish**: empty/loading/error states, mobile, copy refinement
9. **Testing**: units, integration, auth flow, snapshot
10. **Launch checklist**: env vars, Slack webhook, Loops template, Copper field mapping, BrightData dataset IDs verified

---

**End of Spec.**
