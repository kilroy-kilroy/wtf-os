import type {
  AssessmentAnswers,
  ScoreResult,
  Question,
} from '@repo/utils';
import { BIZ_DEV_QUESTIONS, getAnswerChoice } from '@repo/utils';

export interface BizDevPromptInput {
  // Intake
  name: string;
  email: string;
  company_name: string;
  website_url: string;
  linkedin_url: string;
  service_description: string;
  customer_description: string;
  revenue_band: string;
  affordability_answer: string;

  // Deterministic results
  score: ScoreResult;

  // Answers (for verbatim quoting back)
  answers: AssessmentAnswers;

  // Research artifacts (any may be null/partial)
  research: {
    linkedin_profile: unknown;
    linkedin_posts: unknown;
    website_content: string | null;
    partials: string[];
  };
}

export const BIZ_DEV_SYSTEM_PROMPT = `You are the analytical voice of SalesOS by Tim Kilroy. You diagnose agencies that think they're ready to hire a BD resource. You are direct, opinionated, and occasionally profane. You name things plainly. You quote evidence verbatim. You do not soften gaps. You always end with a clear next step (Studio or Growth tier).

Brand context:
- Tim's product is SalesOS. Three tiers: Studio (extract & document), Growth (hire-ready infrastructure), Team (durable sales organization).
- Tim's headline: "Fire Yourself From Sales."
- Tim's three named traps: Personality Trap, Indispensability Trap, More Founder Trap.
- Tim's philosophy: "Return on Understanding."
- The benchmarks you should cite: 55% of agency first-sales hires exit in year 1 (Haus Advisors); 9% hit quota; 76% of BD director tenures < 2 years (RSW/US 2024).

Voice rules:
- Direct. Occasional profanity is OK (mirrors Tim's writing).
- Quote the user's own answers verbatim where the spec calls for it.
- Quote the user's website / LinkedIn copy verbatim where relevant. NEVER invent quotes.
- If research artifacts are partial or missing, acknowledge it ("couldn't read your LinkedIn this time") rather than fabricating.
- Do not soften the verdict. If their gaps are bad, say so. The reader will respect honesty more than diplomacy.
- End every report with a tier-specific CTA copy block.

Output: structured markdown, exact section headings as instructed in the user prompt.`;

export function buildBizDevUserPrompt(input: BizDevPromptInput): string {
  // Build verbatim answer summary
  const answerSummary = BIZ_DEV_QUESTIONS.map((q: Question) => {
    const c = getAnswerChoice(q, input.answers[q.id]);
    const dim = q.dimension;
    const gateNote = c.hardGate ? ' ← HARD-GATE FAIL' : '';
    return `- ${q.id} (${dim}): "${c.text}" — score ${c.score}${gateNote}`;
  }).join('\n');

  return `Generate the personalized BD-readiness report for this agency.

## INTAKE
- Name: ${input.name}
- Agency: ${input.company_name}
- Website: ${input.website_url}
- LinkedIn: ${input.linkedin_url}
- "What we sell": ${input.service_description}
- "Who we sell to": ${input.customer_description}
- Revenue band: ${input.revenue_band}
- Can fund $60K base × 4–6 mo without ROI?: ${input.affordability_answer}

## ANSWERS (verbatim)
${answerSummary}

## DETERMINISTIC RESULTS (use these as canonical — do NOT change verdict or scores)
- Composite: ${input.score.composite}/100
- Stage: ${input.score.stage}
- Verdict: ${input.score.verdict}
- Hard-gate failures: ${input.score.hard_gate_failures.join(', ') || 'none'}
- Dominant Trap: ${input.score.dominant_trap ?? 'none'}
- CTA tier: ${input.score.cta_tier}
- Dimensions:
  - Lead Flow: ${input.score.dimensions.lead_flow}/100
  - Sales Process: ${input.score.dimensions.sales_process}/100
  - ICP & Offer Clarity: ${input.score.dimensions.icp_offer}/100
  - Founder Readiness: ${input.score.dimensions.founder_readiness}/100
  - Proof & Enablement: ${input.score.dimensions.proof_enablement}/100

## RESEARCH ARTIFACTS
${input.research.partials.length > 0 ? `Partial sources: ${input.research.partials.join(', ')} — note this in the report where relevant, do not invent.` : 'All research sources retrieved successfully.'}

LinkedIn Profile: ${JSON.stringify(input.research.linkedin_profile, null, 2).slice(0, 4000)}

LinkedIn Posts (recent): ${JSON.stringify(input.research.linkedin_posts, null, 2).slice(0, 4000)}

Website content (excerpt): ${input.research.website_content?.slice(0, 6000) ?? '[unavailable]'}

## OUTPUT — produce markdown EXACTLY in this structure

# You're at the [Stage Display Name] stage.
[One-sentence summary of what that means, in SalesOS voice. Stage display names: "All Founder, No System" / "Half-Built Engine" / "Engine Online, Hire-Ready"]

## The Truth You Need to Hear
[2–3 paragraphs. QUOTE their answer to Q7 verbatim. Connect it to the 55% Y1 exit / 9% hit-quota benchmark. This is the truth-bomb section. If they answered Q7 "drive revenue without me" — call it out as the most common wrong belief.]

## Where You Stand — Dimension by Dimension

### Lead Flow — ${input.score.dimensions.lead_flow}/100
[Quote their Q1 + Q2 answers verbatim. AI observation tying website/LinkedIn evidence — do they have a content engine on LinkedIn? Does their website show inbound infrastructure? Don't invent.]

### Sales Process — ${input.score.dimensions.sales_process}/100
[Quote Q3 + Q4. Note process maturity.]

### ICP & Offer Clarity — ${input.score.dimensions.icp_offer}/100
[QUOTE their homepage h1/subhead/positioning verbatim from the website content if available. Call out vagueness vs. specificity. Cross-reference with their stated "what we sell" answer.]

### Founder Readiness — ${input.score.dimensions.founder_readiness}/100
[Quote Q7 + Q8. This is the most important section editorially.]

### Proof & Enablement — ${input.score.dimensions.proof_enablement}/100
[Quote Q9 + Q10. Note whether case studies/testimonials are visible on their site.]

${input.score.dominant_trap ? `## The Trap You're In: ${input.score.dominant_trap === 'personality' ? 'Personality' : input.score.dominant_trap === 'indispensability' ? 'Indispensability' : 'More Founder'}
[2 paragraphs naming the pattern, with their own answers as evidence.]` : ''}

## Your 3-Sprint Plan to Get Ready
[Three sprints, one month each. ${input.score.cta_tier === 'studio' ? 'Studio path: Sprint 1 — Extract (ICP + offer + discovery flow); Sprint 2 — Document (sales process + narrative & framing); Sprint 3 — Install (pipeline infra + readiness for the hire).' : 'Growth path: Sprint 1 — Hire (role scorecard + JD + screening + comp); Sprint 2 — Onboard (ramp plan + coaching + deal review); Sprint 3 — Optimize (performance review + pipeline tuning).'}

Each sprint MUST contain 3–4 specific deliverables tied to THIS user's actual gaps and research artifacts. Do not produce generic templates. If a dimension scored low, the sprint that addresses it must reference the specific gap.]

## What's Next
[CTA copy. ${input.score.cta_tier === 'studio' ? 'Direct, honest. "You\'re not ready to hire — and that\'s fixable. SalesOS Studio is a 3-month engagement to extract the system you\'re running on instinct and turn it into infrastructure your team can use. Book a call to see if it fits." Use a "Book a Call with Tim" CTA.' : 'Direct, opinionated. "You\'re ready. The system is in place. The 55% who fail year one fail because they hire without installing the role/comp/ramp infrastructure first. SalesOS Growth fixes that — built before day 1, not after the new hire is already in trouble. Book a call to see if it fits." Use a "Book a Call with Tim" CTA.'}]

## A Note from Tim
[3 short paragraphs in first-person, signed "— Tim Kilroy, SalesOS". Tone: real, slightly weary, no-bullshit. ${input.score.cta_tier === 'studio' ? 'Address why most agencies skip the Studio step and go straight to hiring — and why those agencies become the 55%.' : 'Address why most "ready" founders still get burned — they install the hire without installing the system around the hire.'}]
`;
}
