/**
 * WTF Biz Dev Assessment Question Bank (single source of truth).
 *
 * Spec reference: docs/superpowers/specs/2026-05-07-wtf-biz-dev-assessment-design.md §7
 *
 * IMPORTANT: Question wording is structurally locked but subject to a copywriter
 * pass before launch. Scoring weights and trap tags are locked.
 *
 * Voice rules: no em or en dashes in user-facing strings (the AI report quotes
 * these verbatim). Use periods, commas, colons, or "to" for ranges.
 */

export type Dimension =
  | 'lead_flow'
  | 'sales_process'
  | 'icp_offer'
  | 'founder_readiness'
  | 'proof_enablement';

export type Trap = 'personality' | 'indispensability' | 'more_founder';

export type QuestionId =
  | 'q1' | 'q2' | 'q3' | 'q4' | 'q5'
  | 'q6' | 'q7' | 'q8' | 'q9' | 'q10';

export interface AnswerChoice {
  id: string;          // 'a' | 'b' | 'c' | 'd'
  text: string;
  score: 0 | 1 | 2 | 3 | 4;
  hardGate?: true;     // present iff this answer triggers the dimension's hard gate
  traps?: Trap[];      // tags that contribute to trap voting
}

export interface Question {
  id: QuestionId;
  dimension: Dimension;
  /** True iff this question's answers can trigger a hard-gate failure on its dimension */
  isHardGateQuestion: boolean;
  prompt: string;
  choices: AnswerChoice[];
}

export const BIZ_DEV_QUESTIONS: Question[] = [
  // --- Lead Flow ---
  {
    id: 'q1',
    dimension: 'lead_flow',
    isHardGateQuestion: true,
    prompt: "Right now, where do most of your new business conversations come from?",
    choices: [
      { id: 'a', text: "Inbound from content/SEO/marketing we've built", score: 4 },
      { id: 'b', text: "Referrals from clients and my network", score: 2 },
      { id: 'c', text: "I personally hunt through outbound, podcasts, and events I show up at", score: 1 },
      { id: 'd', text: "Whatever shows up that week. It's not consistent.", score: 0, hardGate: true },
    ],
  },
  {
    id: 'q2',
    dimension: 'lead_flow',
    isHardGateQuestion: true,
    prompt: "How many qualified opportunities (real budget, real fit, decision-maker) land in your pipeline in a typical month?",
    choices: [
      { id: 'a', text: "20+", score: 4 },
      { id: 'b', text: "10 to 20", score: 3 },
      { id: 'c', text: "4 to 10", score: 2 },
      { id: 'd', text: "0 to 3, or I'd have to count last month to know.", score: 0, hardGate: true },
    ],
  },

  // --- Sales Process ---
  {
    id: 'q3',
    dimension: 'sales_process',
    isHardGateQuestion: false,
    prompt: "If I shadowed your last 5 closed deals, would I see one sales process, or five?",
    choices: [
      { id: 'a', text: "Five different ones. Every deal is custom.", score: 0 },
      { id: 'b', text: "Mostly the same shape, but it's all in my head.", score: 1, traps: ['personality'] },
      { id: 'c', text: "Same shape, sort of documented.", score: 3 },
      { id: 'd', text: "It's documented, repeatable, and my team uses it.", score: 4 },
    ],
  },
  {
    id: 'q4',
    dimension: 'sales_process',
    isHardGateQuestion: false,
    prompt: "Your discovery call is mostly...",
    choices: [
      { id: 'a', text: "Me talking, walking through what we do.", score: 1, traps: ['personality'] },
      { id: 'b', text: "Asking great questions and listening.", score: 4 },
      { id: 'c', text: "A loose mix that depends on the prospect.", score: 2 },
      { id: 'd', text: "I haven't done one in months. Clients come pre-warmed.", score: 3 },
    ],
  },

  // --- ICP & Offer Clarity ---
  {
    id: 'q5',
    dimension: 'icp_offer',
    isHardGateQuestion: false,
    prompt: "Pick the description closest to your current pitch:",
    choices: [
      { id: 'a', text: "[niche] specialist agency for [specific buyer] solving [specific problem]", score: 4 },
      { id: 'b', text: "We help growth-stage companies with marketing.", score: 1 },
      { id: 'c', text: "Full-service. Strategy, creative, paid, and organic.", score: 0 },
      { id: 'd', text: "It depends. We tailor everything to each client.", score: 1, traps: ['personality'] },
    ],
  },
  {
    id: 'q6',
    dimension: 'icp_offer',
    isHardGateQuestion: false,
    prompt: "Your services / offers are...",
    choices: [
      { id: 'a', text: "2 to 3 productized packages with fixed scope and price.", score: 4 },
      { id: 'b', text: "A core retainer plus custom add-ons.", score: 3 },
      { id: 'c', text: "Mostly custom. We scope every engagement from scratch.", score: 1, traps: ['personality'] },
      { id: 'd', text: "Whatever the client asks for. We figure it out.", score: 0 },
    ],
  },

  // --- Founder Readiness ---
  {
    id: 'q7',
    dimension: 'founder_readiness',
    isHardGateQuestion: true,
    prompt: "Be honest. What do you actually believe a great BD hire will do for you?",
    choices: [
      { id: 'a', text: "Find prospects, build pipeline, and close deals so they drive revenue without me.", score: 0, hardGate: true, traps: ['indispensability', 'more_founder'] },
      { id: 'b', text: "Follow up on leads I generate, manage conversations I can't get to, and free up my time.", score: 4 },
      { id: 'c', text: "I don't fully know. I just know I can't keep doing this myself.", score: 1, traps: ['more_founder'] },
      { id: 'd', text: "Replace me in sales entirely so I can run the agency.", score: 1, traps: ['indispensability'] },
    ],
  },
  {
    id: 'q8',
    dimension: 'founder_readiness',
    isHardGateQuestion: true,
    prompt: "Once they're hired, how much of your week will you spend coaching, strategizing with, and unblocking them for the first 6 months?",
    choices: [
      { id: 'a', text: "5+ hours per week. I get this won't work without me.", score: 4 },
      { id: 'b', text: "1 to 2 hours. They should mostly be self-sufficient.", score: 1, traps: ['indispensability'] },
      { id: 'c', text: "I'm hiring them so I can stop doing this.", score: 0, hardGate: true, traps: ['more_founder'] },
      { id: 'd', text: "Honestly, I haven't thought about it.", score: 0, hardGate: true },
    ],
  },

  // --- Proof & Enablement ---
  {
    id: 'q9',
    dimension: 'proof_enablement',
    isHardGateQuestion: false,
    prompt: "If a new BD person needs to make the case to a prospect today, what's ready to put in their hands?",
    choices: [
      { id: 'a', text: "Pitch deck, 5+ written case studies, 3+ named references, a stocked story bank.", score: 4 },
      { id: 'b', text: "Rough deck, 1 to 2 case studies, references I'd need to ask permission for.", score: 2 },
      { id: 'c', text: "A website with logos. Otherwise I tell stories from memory.", score: 1, traps: ['indispensability'] },
      { id: 'd', text: "Nothing organized. I improvise every call.", score: 0, traps: ['personality', 'indispensability'] },
    ],
  },
  {
    id: 'q10',
    dimension: 'proof_enablement',
    isHardGateQuestion: false,
    prompt: "If a prospect asked your new BD hire \"what's it like to work with you?\", what would they actually say?",
    choices: [
      { id: 'a', text: "Quote a customer, share specific outcomes, point to a documented promise.", score: 4 },
      { id: 'b', text: "Tell a story they've heard me tell.", score: 3 },
      { id: 'c', text: "Ad-lib based on what they think is true.", score: 1, traps: ['personality'] },
      { id: 'd', text: "Probably hand it back to me to answer.", score: 0, traps: ['indispensability'] },
    ],
  },
];

/** Answers submitted by the user. Maps each question id to the chosen choice id. */
export type AssessmentAnswers = Record<QuestionId, 'a' | 'b' | 'c' | 'd'>;

/** Convenience: get the question definition by id. */
export function getQuestion(id: QuestionId): Question {
  const q = BIZ_DEV_QUESTIONS.find(q => q.id === id);
  if (!q) throw new Error(`Unknown question id: ${id}`);
  return q;
}

/** Convenience: get the chosen answer for a question. */
export function getAnswerChoice(question: Question, choiceId: 'a' | 'b' | 'c' | 'd'): AnswerChoice {
  const c = question.choices.find(c => c.id === choiceId);
  if (!c) throw new Error(`Unknown choice ${choiceId} for question ${question.id}`);
  return c;
}
