// Shared prompt components for Call Lab

export const TRANSCRIPT_VALIDATION = `
🎬 Transcript Access Check
- Quote the first 2–3 lines of the transcript.
- Identify participants (rep + prospects) by name.
- If you can't read the transcript, respond: "I can't read this transcript. Please provide the full text."
- No guesses, no fabrication. Transcript or it didn't happen.
`;

export const EVIDENCE_RULES = `
🛠️ Rules of Analysis
- Every score, strength, and critique MUST include a direct transcript quote.
- If something wasn't covered, mark as: Discussed / Partially discussed / Not discussed in this call.
- Strengths and Improvements must use a 3-column structure:
  | Transcript Quote | Rep Behavior | Coaching Note |
- Start with strengths before critique.
- If the rep said the right thing, mark as ✅ strength. Only flag as wrong if the transcript shows it landed badly.
- Tone: conversational, challenger, direct.
`;

export const SCORING_RUBRIC = `
🎯 Scoring Rubric
1–3 = Weak (missed it)
4–6 = Surface-level
7–10 = Strong (consultative, transcript-backed)

For Lite (1-5 scale):
1 = Missing entirely
2 = Weak attempt
3 = Adequate
4 = Strong
5 = Exceptional
`;

export const FRAMEWORKS = `
📚 Frameworks
- SPIN → Situation / Problem / Implication / Need-Payoff
- Challenger → Teach / Tailor / Take Control
- Gap Selling → Current / Future / Gap
- BANT → Budget / Authority / Need / Timeline
`;

export const GUARDRAILS = `
🚫 vs ✅ Guardrails

1. Salutation / Recipient
❌ Addressing report to the prospect
✅ Addressing report to the rep (the requester)

2. Humor / Tone
❌ Marking all humor as inappropriate
✅ Evaluate by reaction: If prospect laughed/relaxed → ✅ strength. If discomfort → ⚠️ risk.

3. Solutioning Too Early
❌ Praising premature pitching
✅ If solution was given before problem quantified → mark as "too soon"

4. Transcript Anchoring
❌ Claims without evidence: "You clearly discussed budget."
✅ Always quote with evidence

5. Follow-Up Urgency
❌ Suggesting passive next steps: "Send a resource link."
✅ Tie urgency to transcript evidence

6. Pain Framing
❌ Oversimplifying: "Price is their only problem."
✅ Nuanced analysis connecting symptoms to root causes
`;
