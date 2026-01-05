# WTF Method Scoring Framework
## Call Lab Analysis Addition

### Overview
Add three core WTF Method scores to every Call Lab analysis alongside existing metrics (Talk Ratio, Active Listening, etc.). These scores measure the foundational trust-building behaviors that separate deals that close from deals that die.

---

## The Three WTF Scores

### 1. Radical Relevance Score (1-10)

**What it measures:** How well the seller connects to the prospect's actual world

**High Score Indicators (8-10):**
- Uses prospect's exact words/phrases in responses
- References specific details from prospect's situation
- Connects solutions to their stated problems
- Demonstrates deep understanding of their industry/context
- Avoids generic positioning statements

**Medium Score Indicators (4-7):**
- Some personalization but still somewhat generic
- Asks good questions but doesn't fully leverage answers
- Mixes relevant insights with standard pitches
- Shows understanding but doesn't prove it consistently

**Low Score Indicators (1-3):**
- Generic pitch regardless of prospect's situation
- Doesn't reference prospect's specific context
- Uses canned positioning statements
- Talks about "clients like you" instead of "you specifically"
- Could give same pitch to anyone

**Example Quote to Analyze:**
"Based on what you said about struggling with client retention in Q4, and the fact that you are already using HubSpot but not seeing the reporting you need..."

---

### 2. Diagnostic Generosity Score (1-10)

**What it measures:** How freely the seller shares valuable insights and frameworks

**High Score Indicators (8-10):**
- Shares specific frameworks/models unprompted
- Teaches prospect something new during call
- Gives away valuable thinking without strings attached
- Frames questions that make prospect think differently
- Offers insights before asking for anything

**Medium Score Indicators (4-7):**
- Shares some insights but holds back "good stuff"
- Educational but clearly leading to pitch
- Helpful but transactional feeling
- Good questions but not framework-level thinking

**Low Score Indicators (1-3):**
- Only asks questions, never teaches
- Withholds insights as leverage
- "We can show you that if you become a client"
- Surface-level problem exploration
- No frameworks, models, or new thinking shared

**Example Quote to Analyze:**
"Let me show you our Client Lifecycle Framework - here are the three stages where agencies typically lose clients, and the leading indicators for each one. This is what we use with our clients, but it is valuable regardless..."

---

### 3. Permission-Based Progression Score (1-10)

**What it measures:** How well the seller makes the buyer feel in control

**High Score Indicators (8-10):**
- Explicitly asks permission before advancing
- Checks comfort level throughout
- Makes next steps buyer's choice, not assumption
- Uses language like "Would it make sense to..." or "Are you comfortable with..."
- Never assumes or pushes forward without consent

**Medium Score Indicators (4-7):**
- Some permission-asking but inconsistent
- Soft closes mixed with assumptions
- Generally respectful but occasionally pushy
- Good intentions but imperfect execution

**Low Score Indicators (1-3):**
- Assumes next steps without asking
- "I will send you a proposal" vs "Would you like me to send..."
- Pushes through objections instead of acknowledging
- Makes buyer feel pressured or trapped
- Classic "always be closing" energy

**Example Quote to Analyze:**
"Before I go into how we would approach this, are you comfortable with me walking through what an engagement might look like? Or would you rather we focus on something else first?"

---

## Scoring Prompt Addition

**Add to existing Call Lab analysis prompt:**

```
In addition to the standard Call Lab scores, analyze this call using the WTF Sales Method framework:

1. RADICAL RELEVANCE SCORE (1-10):
How well does the seller connect to this prospect's actual situation? Look for:
- Use of prospect's specific words/context
- References to their stated problems
- Industry/company-specific understanding
- Personalized vs generic positioning

Score: X/10
Evidence: [Quote 1-2 specific moments]
How to improve: [Specific action]

2. DIAGNOSTIC GENEROSITY SCORE (1-10):
How freely does the seller share valuable insights and frameworks? Look for:
- Teaching moments unprompted
- Frameworks/models shared freely
- Insights given before asking for anything
- Questions that reframe prospect's thinking

Score: X/10
Evidence: [Quote 1-2 specific moments]
How to improve: [Specific action]

3. PERMISSION-BASED PROGRESSION SCORE (1-10):
How well does the seller make the buyer feel in control? Look for:
- Explicit permission requests before advancing
- "Would it make sense..." vs "I will..."
- Checking comfort level throughout
- Buyer's choice vs seller's assumption

Score: X/10
Evidence: [Quote 1-2 specific moments]
How to improve: [Specific action]

WTF METHOD OVERALL ASSESSMENT:
[2-3 sentences on how well this seller is building trust using the WTF framework, and the single biggest opportunity to improve]
```

---

## Display in Reports

**Prominence:** WTF Method scores should be displayed prominently, separate from technical scores

**Layout Suggestion:**

```
┌─────────────────────────────────────────┐
│ WTF SALES METHOD ASSESSMENT             │
├─────────────────────────────────────────┤
│ Radical Relevance: 7/10                 │
│ You are connecting to prospect's world, │
│ but could use their exact words more    │
│                                         │
│ Diagnostic Generosity: 5/10             │
│ You are asking good questions but not   │
│ sharing frameworks that teach           │
│                                         │
│ Permission-Based Progression: 8/10      │
│ Strong permission-asking throughout     │
└─────────────────────────────────────────┘

[Then standard Call Lab scores below]
```

---

## Integration Points

1. **Quick Analyze App:** Show WTF scores prominently in free report
2. **Pro Dashboard:** Track WTF score trends over time
3. **Email Sequence:** Reference WTF scores in follow-up emails
4. **WTF Guide Page:** "See your WTF Method scores instantly with Call Lab"
5. **Sales Copy:** "The only call analyzer that measures the WTF Sales Method"

---

## Why This Matters

- **Differentiation:** No other call analysis tool measures trust-building
- **Education:** Reinforces WTF Method from the guide
- **Positioning:** Bridges free content to paid product
- **Proof:** Shows Tim's methodology works in practice
- **Upgrade Path:** "Track your WTF scores over time with Pro"

---

## Cost Implications

**None.** Same API call, just different scoring rubric. Might add 50-100 tokens to prompt but negligible cost increase.

---

## Next Steps for Dev

1. Update analysis prompt with WTF scoring section
2. Add WTF score extraction to response parser
3. Update report display template to show WTF scores prominently
4. Save WTF scores in database (analysis JSON)
5. Add WTF score tracking to Pro dashboard
