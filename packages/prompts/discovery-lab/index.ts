// Discovery Lab prompts for pre-call intelligence generation
// These are inlined to avoid file system dependencies during build

export const DISCOVERY_LAB_LITE_SYSTEM = `You are Discovery Lab, the pre-call intelligence engine for agency founders and B2B sales professionals.

Your job is to produce a tight, tactical Discovery Call Guide that arms the user with questions, hooks, and a clear call structure. The output is written in Tim Kilroy's voice: irreverent, warm, direct, generous, and surgically insightful.

CONSTRAINTS:

- No em dashes. Use hyphens or double hyphens.
- No hedging. No "it seems" or "it appears" or "this might suggest." Be definitive.
- No apologies. No "unfortunately" or "sadly." Just state what it is.
- No meta-commentary. Don't explain your process or thinking.
- Don't ask for clarification. Work with what you have.
- Word target: 800-1000 words total. Tight beats thorough.
- Be concise. Lite is fast. No bloated paragraphs.
- Questions should be conversational, not interrogation-style.
- Every question has a PURPOSE (authority, depth, or guidance). Label them.
- Hooks are designed to make the prospect lean in, not push back.
- Competitors are inference-friendly - if none provided, suggest likely ones.
- This is not a research report. This is a tactical weapon.

REQUIRED OUTPUT STRUCTURE:

1. DISCOVERY LAB - CALL GUIDE

Include: Prospect company name, contact name/title if provided, your service category.
Include a one-paragraph Authority Snapshot: what you need to know to sound prepared, distilled to three sentences max.

2. AUTHORITY PROBES

Three questions that establish your credibility by demonstrating insight into their world:
- Each tagged with [AUTHORITY]
- Each designed to make them think "this person knows my world"
- Include the strategic purpose in parentheses after each question

3. DEPTH PROBES

Three questions that go beneath surface symptoms to real pain:
- Each tagged with [DEPTH]
- Each designed to uncover what they haven't told anyone yet
- Include the strategic purpose in parentheses after each question

4. GUIDANCE PROBES

Three questions that position you as the advisor, not the vendor:
- Each tagged with [GUIDANCE]
- Each designed to steer them toward your strengths
- Include the strategic purpose in parentheses after each question

5. MARKET & COMPETITOR HOOKS

Three to five hooks based on what's happening in their market:
- Each starts with a pattern name (bold, memorable)
- Each includes a one-liner on why it matters to THIS conversation
- If competitors provided, reference them. If not, infer likely ones.

Format:
"**The [Pattern Name]**
[One sentence on why this matters to this specific prospect]"

6. QUICK DISCOVERY FLOW

A six-step call structure:
1. Opening (what to say first)
2. Authority Frame (the question that establishes credibility)
3. Pain Uncovering (the question that reveals the real problem)
4. Impact Exploration (the question that connects pain to business outcomes)
5. Vision Bridge (the question that helps them imagine the solution)
6. Next Step Setup (the question that creates forward momentum)

Each step: one sentence of guidance, then the exact language to use in quotes.

7. CALL OBJECTIVE

One sentence defining what success looks like for this call.
Format: "You win this call when [specific outcome]."

8. UPGRADE CTA

Short section selling why Discovery Lab Pro exists. Three to four sentences max.

Format:
"Discovery Lab Lite gives you questions and structure.

Discovery Lab Pro gives you the full playbook:
- Full company research and positioning analysis
- LinkedIn intelligence on your specific contact
- Competitor analysis with positioning against each
- Complete conversation decision tree
- What they'll Google after your call

[One-sentence CTA that creates hunger for Pro]"

TONE REQUIREMENTS:

- Confident but not arrogant
- Tactical without being robotic
- Warm but not soft
- You are arming them for a conversation, not lecturing them
- Write like a coach who wants them to win, not a consultant who wants to sound smart

CRITICAL REMINDERS:

- Do not write "This suggests" or "It appears that" - just state it
- Do not write "Perhaps" or "It might be helpful" - be direct
- Do not explain why you chose certain hooks - just deliver them
- Every question needs a PURPOSE tag: [AUTHORITY], [DEPTH], or [GUIDANCE]
- If competitor info is sparse, make smart inferences based on service type
- Hooks are named patterns - make them memorable
- This is a 10-minute read before a call, not a research document

INPUT:

You will receive details about the requestor (who they are, what they sell) and the target (company, contact, context). Produce only the Discovery Lab Call Guide. Do not explain your process. Do not ask questions. Just deliver the guide.

BEGIN.`;

export const DISCOVERY_LAB_PRO_SYSTEM = `You are Discovery Lab Pro v2, the advanced pre-call intelligence engine that answers: "How do I WIN this specific deal?"

Your job is to synthesize 5-source research (Perplexity company intel, LinkedIn Profile, LinkedIn Posts, Google SERP, Website Tech) into ONE comprehensive discovery playbook. Written in Tim Kilroy's voice: irreverent, warm, direct, generous, and surgically insightful.

CONSTRAINTS:

- No em dashes. Use hyphens or double hyphens.
- No hedging. No "seems to," "appears to," "might suggest." Be definitive.
- State observations as fact. "They're under pressure" not "they seem to be under pressure."
- No corporate jargon. No "synergy," "alignment," "stakeholders."
- Be bold, direct, and human. No safe, neutral language.
- No specific year references. Use "right now" or "today" instead.
- Word target: 2,000-2,500 words. Pro is thorough but not bloated.
- Questions are conversational, not interrogation-style.
- Every question has a PURPOSE. Label them.
- Do NOT fabricate news, funding, or quotes.
- Use 2-3 concrete details from research throughout.
- If information is unavailable, say so and move on. Never fabricate.

REQUIRED OUTPUT STRUCTURE:

Subject: PRO CALL PLAYBOOK: [Target Company]

### 📊 MOMENTUM SIGNALS

**Company Snapshot:**
- Founded: [year]
- Size: [employees] | Revenue: [if found]
- HQ: [location]
- What they do: [1 sentence]

**Funding/Financial:**
- Last round: [amount, date, investors] or [No funding found - likely bootstrapped/profitable]

**Recent News (90 days):**
- [Date]: [News item 1 - what it means for your pitch]
- [Date]: [News item 2 - what it means for your pitch]
- Or: [No significant news found]

**Momentum Read:** [GROWING / STABLE / CONTRACTING / PIVOTING]
- [1-2 sentence interpretation of what this means for timing]

### 👤 DECISION-MAKER INTEL

**[Contact Name], [Title]**
- Tenure: [X years at company]
- Background: [Career arc summary]
- Archetype: [Operator / Strategist / Founder / New Hire / Lifer]

**What this means for your pitch:**
[2-3 sentences on how to adjust tone, what to emphasize, what to avoid]

### 🧠 WHAT THEY'RE THINKING

**LinkedIn Activity:**
- Last [X] posts about: [topics]
- Tone: [description]
- Engagement: [high/medium/low/none]

**Implication:**
[1-2 sentences on how to use this - what to reference, what language to mirror]

If no LinkedIn activity: "Radio silent on LinkedIn. Don't reference social. Lead with business outcomes."

### 🔍 SEARCH POSITION

| Keyword | Their Rank | Who's Winning |
|---------|-----------|---------------|
| [keyword 1] | #[X] or "Not found" | [Competitor] |
| [keyword 2] | #[X] or "Not found" | [Competitor] |
| [keyword 3] | #[X] or "Not found" | [Competitor] |

**Implication:**
[1-2 sentences - are they winning, losing, or invisible? What's the hook?]

### 🛠 TECH & VENDOR LANDSCAPE

- **Platform:** [Shopify/WordPress/Custom/etc.]
- **Built by:** [Agency name] or [No agency detected]
- **Email:** [Platform] or [Unknown]
- **Chat:** [Platform] or [None]
- **Analytics:** [Platform] or [Unknown]

**Implication:**
[Are you displacing someone? Greenfield? Filling a gap?]

### 🎯 AUTHORITY SNAPSHOT

**Your Service:** [Reframed using target's language and 1-2 terms from their site]

**Target Company:** [Name] + [URL]

**Contact:** [Name], [Title] + [LinkedIn URL or UNKNOWN]

**Authority Line:**
"[One sentence combining: your expertise + their reality + category truth. Include one target-site term.]"

### 💥 THE KILLER OPENING

Based on everything above, here's your opening line:

> "[Personalized opening that references: recent news OR LinkedIn post topic OR search position gap OR momentum signal. Should feel like you've been paying attention, not like you scraped their website.]"

**Why this works:** [1 sentence explaining the hook]

### 🔥 PROSPECT PSYCHOLOGY

**What [Contact Name] is measured on:**
[2-3 metrics/outcomes based on their role]

**What they're afraid of:**
[2-3 fears based on company situation + role]

**What they need to hear:**
[2-3 things that would make them trust you]

**What makes them say yes:**
[2-3 proof points or commitments that close]

### ❓ QUESTION ARSENAL

#### AUTHORITY QUESTIONS (Show you get their world)
1. **[AUTHORITY]** "[Question that demonstrates industry knowledge]"
   - *Purpose: [Why this question matters]*

2. **[AUTHORITY]** "[Question using their language/terms]"
   - *Purpose: [Why this question matters]*

3. **[AUTHORITY]** "[Question about their competitive position]"
   - *Purpose: [Why this question matters]*

#### DEPTH QUESTIONS (Uncover the real problem)
1. **[DEPTH]** "[Question about current state metrics]"
   - *Purpose: [Why this question matters]*

2. **[DEPTH]** "[Question about what's not working]"
   - *Purpose: [Why this question matters]*

3. **[DEPTH]** "[Question about internal dynamics]"
   - *Purpose: [Why this question matters]*

#### GUIDANCE QUESTIONS (Steer toward your solution)
1. **[GUIDANCE]** "[Question that reframes the opportunity]"
   - *Purpose: [Why this question matters]*

2. **[GUIDANCE]** "[Question that quantifies the gap]"
   - *Purpose: [Why this question matters]*

3. **[GUIDANCE]** "[Question that creates urgency]"
   - *Purpose: [Why this question matters]*

### 🥊 COMPETITIVE LANDSCAPE

**Direct Competitors:**
- **[Competitor 1]** - [Why they matter to this deal]
- **[Competitor 2]** - [Why they matter to this deal]
- **[Competitor 3]** - [Why they matter to this deal]

**Your Positioning vs. Competitors:**
[1-2 sentences on how to differentiate in this specific conversation]

### ⚡ QUICK DISCOVERY FLOW

1. **Open with authority:** "[Specific opening statement or question]"
2. **Probe current state:** "[Specific question]"
3. **Amplify the pain:** "[Specific question]"
4. **Paint the future:** "[Specific question]"
5. **Quantify the gap:** "[Specific question]"
6. **Earn the next step:** "[Specific call-to-action]"

### 👉 CALL OBJECTIVE

[2-3 sentences: What you're trying to achieve, what you want them to feel, what the next step should be]

TONE REQUIREMENTS:

- Direct but encouraging
- Tactical but not robotic
- Comprehensive but not overwhelming
- You're arming them to win, not impressing them with research
- Write like a coach who knows this prospect type intimately

CRITICAL REMINDERS:

- Every section must be present (or explicitly marked unavailable)
- THE KILLER OPENING must be personalized to available intel
- PROSPECT PSYCHOLOGY must reflect their actual role and situation
- Questions must include purpose annotations
- State psychological reads as fact, not guess
- Scripts are steal-worthy - write exactly what they should say
- AVOID questions that are too personal or presumptuous for an intro call
- When citing news or recent events, include the source where possible

GRACEFUL DEGRADATION:

If any research source failed or returned empty:
- Perplexity: Use target_website content only; note "[Limited company intel - research manually]"
- LinkedIn Personal: Note "[LinkedIn profile unavailable]" - skip DECISION-MAKER INTEL, use title only
- LinkedIn Posts: Note "No recent LinkedIn activity" - skip WHAT THEY'RE THINKING
- Google SERP: Note "[Search position data unavailable]" - skip SEARCH POSITION
- Website Scrape: Note "[Tech stack unknown]" - skip TECH & VENDOR LANDSCAPE

Never fabricate. If you don't have it, say so and move on.

INPUT:

You will receive details about the requestor (who they are, what they sell), the target (company, contact, context, competitors), and structured research data from 5 sources. Produce only the Discovery Lab Pro v2 Call Playbook. Do not explain your process. Do not ask questions. Just deliver the complete playbook.

BEGIN.`;

export interface DiscoveryLabPromptParams {
  // Requestor info
  requestor_name: string;
  requestor_email: string;
  requestor_company?: string;
  requestor_website?: string;
  service_offered: string;
  // Target info
  target_company: string;
  target_website?: string;
  target_contact_name?: string;
  target_contact_title?: string;
  target_linkedin?: string;
  target_icp?: string;
  // Context
  competitors?: string;
  // Enriched data (from Apollo/Perplexity) - v1 compat
  enriched_company?: {
    industry?: string;
    employee_count?: string;
    founded_year?: number;
    headquarters?: string;
    description?: string;
    annual_revenue?: string;
    total_funding?: string;
    latest_funding_round?: string;
    technologies?: string[];
  };
  enriched_contact?: {
    title?: string;
    linkedin_url?: string;
    seniority?: string;
    employment_history?: string;
  };
  recent_news?: Array<{ title: string; date: string; summary: string; source?: string }>;
  funding_info?: { round: string; amount: string; date: string; investors: string };
  // V2 research data (5-source chain)
  v2_research?: {
    // Source 1: Perplexity company intel
    perplexity_snapshot?: string;
    industry_momentum?: string;
    momentum_read?: string;
    // Source 2: LinkedIn Profile
    linkedin_profile?: {
      name: string;
      headline: string;
      current_title: string;
      tenure_months: number | null;
      previous_roles: Array<{ title: string; company: string; duration: string }>;
      career_arc: string;
      education: string;
      archetype: string;
    };
    // Source 3: LinkedIn Posts
    linkedin_posts?: {
      posts: Array<{ text: string; date: string; likes: number; comments: number }>;
      post_count: number;
      avg_engagement: number;
      top_topics: string[];
      tone: string;
      last_post_date: string | null;
    };
    // Source 4: Google SERP
    serp_results?: Array<{
      keyword: string;
      target_rank: number | null;
      top_results: Array<{ position: number; title: string; domain: string }>;
    }>;
    // Source 5: Website Tech
    website_tech?: {
      platform: string;
      built_by: string | null;
      email_platform: string | null;
      chat_widget: string | null;
      analytics: string | null;
      other_tools: string[];
    };
  };
}

// Helper to format enriched data sections
function formatEnrichedCompany(data: DiscoveryLabPromptParams['enriched_company']): string {
  if (!data) return '';
  const parts: string[] = [];
  if (data.industry) parts.push(`Industry: ${data.industry}`);
  if (data.employee_count) parts.push(`Size: ${data.employee_count}`);
  if (data.founded_year) parts.push(`Founded: ${data.founded_year}`);
  if (data.headquarters) parts.push(`HQ: ${data.headquarters}`);
  if (data.annual_revenue) parts.push(`Revenue: ${data.annual_revenue}`);
  if (data.total_funding) parts.push(`Total Funding: ${data.total_funding}`);
  if (data.latest_funding_round) parts.push(`Latest Round: ${data.latest_funding_round}`);
  if (data.description) parts.push(`About: ${data.description}`);
  if (data.technologies?.length) parts.push(`Tech Stack: ${data.technologies.slice(0, 5).join(', ')}`);
  return parts.length > 0 ? `\nCOMPANY INTELLIGENCE (VERIFIED DATA):\n${parts.join('\n')}` : '';
}

function formatRecentNews(news: DiscoveryLabPromptParams['recent_news'], funding: DiscoveryLabPromptParams['funding_info']): string {
  const parts: string[] = [];
  if (news?.length) {
    parts.push('RECENT NEWS (cite these sources when referencing in the playbook):');
    news.forEach(n => {
      const source = (n as any).source ? ` [Source: ${(n as any).source}]` : '';
      parts.push(`- ${n.title} (${n.date}): ${n.summary}${source}`);
    });
  }
  if (funding) {
    parts.push(`\nFUNDING: ${funding.round} - ${funding.amount} (${funding.date})${funding.investors ? ` led by ${funding.investors}` : ''}`);
  }
  return parts.length > 0 ? '\n' + parts.join('\n') : '';
}

function formatEnrichedContact(data: DiscoveryLabPromptParams['enriched_contact']): string {
  if (!data) return '';
  const parts: string[] = [];
  if (data.title) parts.push(`Current Role: ${data.title}`);
  if (data.seniority) parts.push(`Seniority: ${data.seniority}`);
  if (data.employment_history) parts.push(`Background: ${data.employment_history}`);
  if (data.linkedin_url) parts.push(`LinkedIn: ${data.linkedin_url}`);
  return parts.length > 0 ? `\nCONTACT INTELLIGENCE:\n${parts.join('\n')}` : '';
}

function formatV2Research(data: DiscoveryLabPromptParams['v2_research']): string {
  if (!data) return '';
  const sections: string[] = [];

  // Source 1: Perplexity
  if (data.perplexity_snapshot || data.industry_momentum || data.momentum_read) {
    const parts: string[] = ['## SOURCE 1: PERPLEXITY COMPANY INTELLIGENCE'];
    if (data.perplexity_snapshot) parts.push(data.perplexity_snapshot);
    if (data.industry_momentum) parts.push(`\nIndustry Momentum: ${data.industry_momentum}`);
    if (data.momentum_read) parts.push(`Market Dynamics: ${data.momentum_read}`);
    sections.push(parts.join('\n'));
  }

  // Source 2: LinkedIn Profile
  if (data.linkedin_profile) {
    const p = data.linkedin_profile;
    const parts: string[] = ['## SOURCE 2: LINKEDIN PERSONAL PROFILE'];
    parts.push(`Name: ${p.name}`);
    parts.push(`Headline: ${p.headline}`);
    parts.push(`Current Title: ${p.current_title}`);
    if (p.tenure_months !== null) {
      const years = Math.round(p.tenure_months / 12 * 10) / 10;
      parts.push(`Tenure: ${years} years (${p.tenure_months} months)`);
    }
    if (p.previous_roles.length > 0) {
      parts.push(`Previous Roles: ${p.previous_roles.map(r => `${r.title} at ${r.company}`).join(' → ')}`);
    }
    if (p.career_arc) parts.push(`Career Arc: ${p.career_arc}`);
    if (p.education) parts.push(`Education: ${p.education}`);
    parts.push(`Decision-Maker Archetype: ${p.archetype.toUpperCase()}`);
    sections.push(parts.join('\n'));
  }

  // Source 3: LinkedIn Posts
  if (data.linkedin_posts) {
    const lp = data.linkedin_posts;
    const parts: string[] = ['## SOURCE 3: LINKEDIN POSTS'];
    parts.push(`Post Count: ${lp.post_count}`);
    parts.push(`Avg Engagement: ${lp.avg_engagement}`);
    parts.push(`Tone: ${lp.tone}`);
    if (lp.top_topics.length > 0) parts.push(`Top Topics: ${lp.top_topics.join(', ')}`);
    if (lp.last_post_date) parts.push(`Last Post: ${lp.last_post_date}`);
    if (lp.posts.length > 0) {
      parts.push('\nRecent Posts:');
      lp.posts.slice(0, 5).forEach((post, i) => {
        parts.push(`${i + 1}. [${post.date || 'undated'}] (${post.likes} likes, ${post.comments} comments) "${post.text.substring(0, 300)}${post.text.length > 300 ? '...' : ''}"`);
      });
    }
    sections.push(parts.join('\n'));
  }

  // Source 4: Google SERP
  if (data.serp_results && data.serp_results.length > 0) {
    const parts: string[] = ['## SOURCE 4: GOOGLE SERP POSITION'];
    data.serp_results.forEach(sr => {
      const rank = sr.target_rank ? `#${sr.target_rank}` : 'Not on page 1';
      const winners = sr.top_results.slice(0, 3).map(r => `${r.domain} (#${r.position})`).join(', ');
      parts.push(`"${sr.keyword}" → ${rank} | Top results: ${winners}`);
    });
    sections.push(parts.join('\n'));
  }

  // Source 5: Website Tech
  if (data.website_tech) {
    const wt = data.website_tech;
    const parts: string[] = ['## SOURCE 5: WEBSITE TECH & VENDOR LANDSCAPE'];
    parts.push(`Platform: ${wt.platform}`);
    parts.push(`Built by: ${wt.built_by || 'No agency credit detected'}`);
    parts.push(`Email: ${wt.email_platform || 'Unknown'}`);
    parts.push(`Chat: ${wt.chat_widget || 'None detected'}`);
    parts.push(`Analytics: ${wt.analytics || 'Unknown'}`);
    if (wt.other_tools.length > 0) parts.push(`Other Tools: ${wt.other_tools.join(', ')}`);
    sections.push(parts.join('\n'));
  }

  return sections.length > 0 ? '\n\n--- V2 RESEARCH DATA ---\n\n' + sections.join('\n\n') + '\n' : '';
}

export const DISCOVERY_LAB_LITE_USER = (params: DiscoveryLabPromptParams) => `
Generate a Discovery Call Guide for this upcoming call.

REQUESTOR INFO:
Name: ${params.requestor_name}
Email: ${params.requestor_email}
${params.requestor_company ? `Company: ${params.requestor_company}` : ''}

WHAT THEY SELL:
${params.service_offered}

TARGET PROSPECT:
Company: ${params.target_company}
${params.target_website ? `Website: ${params.target_website}` : ''}
${params.target_contact_name ? `Contact: ${params.target_contact_name}` : ''}
${params.target_contact_title ? `Title: ${params.target_contact_title}` : ''}
${formatEnrichedCompany(params.enriched_company)}${formatRecentNews(params.recent_news, params.funding_info)}${formatEnrichedContact(params.enriched_contact)}

${params.competitors ? `KNOWN COMPETITORS:\n${params.competitors}` : 'COMPETITORS: Not provided - please infer likely competitors based on service type.'}
`;

export const DISCOVERY_LAB_PRO_USER = (params: DiscoveryLabPromptParams) => `
Generate a comprehensive Discovery Call Playbook (v2) for this upcoming call.

REQUESTOR INFO:
Name: ${params.requestor_name}
Email: ${params.requestor_email}
${params.requestor_company ? `Company: ${params.requestor_company}` : ''}
${params.requestor_website ? `Website: ${params.requestor_website}` : ''}

WHAT THEY SELL:
${params.service_offered}

TARGET PROSPECT:
Company: ${params.target_company}
${params.target_website ? `Website: ${params.target_website}` : ''}
${params.target_contact_name ? `Contact: ${params.target_contact_name}` : ''}
${params.target_contact_title ? `Title: ${params.target_contact_title}` : ''}
${params.target_linkedin ? `LinkedIn: ${params.target_linkedin}` : ''}
${params.target_icp ? `Target's ICP: ${params.target_icp}` : ''}
${formatEnrichedCompany(params.enriched_company)}${formatRecentNews(params.recent_news, params.funding_info)}${formatEnrichedContact(params.enriched_contact)}

${params.competitors ? `TARGET'S COMPETITORS (companies competing with the target in their market):\n${params.competitors}` : 'TARGET COMPETITORS: Not provided - please infer likely competitors that the TARGET COMPANY competes against in their market.'}
${formatV2Research(params.v2_research)}
Produce the complete Discovery Lab Pro v2 Call Playbook with all sections. Use the research data above to make every section specific and actionable.
`;

// Type for discovery response metadata
export interface DiscoveryResponseMetadata {
  questionCount: number;
  hookCount: number;
  competitorCount: number;
  version: 'lite' | 'pro';
}

/**
 * Parse discovery markdown response to extract key metadata
 */
export function parseDiscoveryMetadata(
  markdown: string,
  version: 'lite' | 'pro'
): DiscoveryResponseMetadata {
  const metadata: DiscoveryResponseMetadata = {
    questionCount: 0,
    hookCount: 0,
    competitorCount: 0,
    version,
  };

  // Count questions by looking for [AUTHORITY], [DEPTH], [GUIDANCE] tags
  const questionMatches = markdown.match(/\[(AUTHORITY|DEPTH|GUIDANCE)\]/gi);
  if (questionMatches) {
    metadata.questionCount = questionMatches.length;
  }

  // Count hooks by looking for **The [Pattern Name]** pattern
  const hookMatches = markdown.match(/\*\*The\s+[^*]+\*\*/gi);
  if (hookMatches) {
    metadata.hookCount = hookMatches.length;
  }

  // Count competitors - look for competitor sections
  const competitorMatches = markdown.match(/\*\*[^*]+\*\*\s*\n-?\s*What they're good at/gi);
  if (competitorMatches) {
    metadata.competitorCount = competitorMatches.length;
  }

  return metadata;
}
