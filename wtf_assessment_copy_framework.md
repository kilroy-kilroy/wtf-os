# WTF Agency Assessment: Copy Framework & Narrative Blocks

## Design System

**Colors:**
- Primary: Cyan #00D4FF (scores, highlights, positive indicators)
- Secondary: Red #E31B23 (warnings, low scores, CTAs)
- Background: Dark #0a0a0f or #111118
- Text: White #FFFFFF, Gray #9ca3af for secondary
- Success: Green #22c55e
- Warning: Yellow/Orange #f59e0b

**Typography:**
- Headlines: Anton (bold, impactful)
- Body: Poppins (clean, readable)

**Score Display:**
- 5/5: Full cyan bar
- 4/5: 80% cyan bar
- 3/5: 60% yellow/orange bar
- 2/5: 40% red bar
- 1/5: 20% red bar (pulsing/attention)

---

## SECTION: OVERALL SCORE HEADER

```
Template:
{company_name}
Business Diagnostic Results

[SCORE BADGE: {overall_score}/5]
{score_label}
{revenue_segment}
```

**Score Labels:**
- 4.5-5.0: "Strong Foundation"
- 3.5-4.4: "Needs Work"
- 2.5-3.4: "Significant Gaps"
- 1.5-2.4: "Critical Issues"
- 1.0-1.4: "Red Alert"

**Revenue Segments:**
- Startup (<$500K)
- Growth ($500K-$2M)
- Scaling ($2M-$5M)
- Established ($5M-$10M)
- Enterprise ($10M+)

---

## SECTION: WTF ZONES HEATMAP

### Revenue Quality

**Score 5:**
```
${revenue_per_fte} per FTE is excellent. You're operating at elite efficiency.
```

**Score 4:**
```
${revenue_per_fte} per FTE is solid. Not elite, but you're not bleeding efficiency.
```

**Score 3:**
```
${revenue_per_fte} per FTE is average. There's room to tighten operations.
```

**Score 2:**
```
${revenue_per_fte} per FTE is below benchmark. You're either overstaffed or underpriced.
```

**Score 1:**
```
${revenue_per_fte} per FTE is a problem. You're running a jobs program, not a business.
```

---

### Profitability

**Score 5:**
```
${net_margin}% net margin is excellent. You've got real leverage for growth or exit.
```

**Score 4:**
```
${net_margin}% net margin is good for your segment. Healthy, sustainable.
```

**Score 3:**
```
${net_margin}% net margin is fine. Not fuck-you money, but you're not drowning.
```

**Score 2:**
```
${net_margin}% net margin is thin. One bad quarter and you're in trouble.
```

**Score 1:**
```
${net_margin}% net margin is a crisis. You're working for free (or worse).
```

---

### Growth vs Churn

**Score 5:**
```
Net growth of ${net_growth}% is excellent. You're outpacing churn by a wide margin.
```

**Score 4:**
```
Net growth of ${net_growth}% is healthy. You're outrunning your losses.
```

**Score 3:**
```
Net growth of ${net_growth}% is okay. You're growing, but churn is eating into it.
```

**Score 2:**
```
Net growth of ${net_growth}% is concerning. Churn is almost matching new business.
```

**Score 1:**
```
Net growth of ${net_growth}%. You're shrinking. Stop everything and fix retention.
```

---

### Lead Engine

**Score 5:**
```
${lead_channels} active channels with ${leads_per_month} leads/month. Diversified and strong.
```

**Score 4:**
```
${lead_channels} active channels with ${leads_per_month} leads/month. Solid foundation.
```

**Score 3:**
```
${lead_channels} active channels with ${leads_per_month} leads/month. Workable, but not bulletproof.
```

**Score 2:**
```
${lead_channels} channels, ${leads_per_month} leads/month. One bad quarter away from panic.
```

**Score 1:**
```
${lead_channels} channel generating ${leads_per_month} leads/month. This is not a lead engine. It's hope.
```

---

### Founder Load

**Score 5:**
```
Delegation avg ${delegation_score}/5. You've built a business, not a job. Congrats.
```

**Score 4:**
```
Delegation avg ${delegation_score}/5 at ${hours_per_week}hrs/week. Getting there. Keep delegating.
```

**Score 3:**
```
Delegation avg ${delegation_score}/5 at ${hours_per_week}hrs/week. You're still too involved in delivery.
```

**Score 2:**
```
Delegation avg ${delegation_score}/5 at ${hours_per_week}hrs/week. You're a bottleneck. The business can't grow past you.
```

**Score 1:**
```
Delegation avg ${delegation_score}/5 at ${hours_per_week}hrs/week. You're the bottleneck. You ARE the business. That's not a flex.
```

---

### Systems Readiness

**Score 5:**
```
All processes documented. You could hand this off tomorrow.
```

**Score 4:**
```
${documented_processes}/${total_processes} processes documented. Most of the playbook exists.
```

**Score 3:**
```
${documented_processes}/${total_processes} processes documented. Getting there, but gaps remain.
```

**Score 2:**
```
${documented_processes}/${total_processes} processes documented. Too much lives in your head.
```

**Score 1:**
```
Zero documented processes. Everything lives in your head. You can't scale this.
```

---

### Content & Positioning

**Score 5:**
```
Posting ${posts_per_week}x/week with strong case studies. Content engine is running.
```

**Score 4:**
```
Posting ${posts_per_week}x/week with few case studies. Good volume, need more proof.
```

**Score 3:**
```
Posting ${posts_per_week}x/week with few case studies. Decent volume, questionable relevance.
```

**Score 2:**
```
Posting ${posts_per_week}x/week. Sporadic at best. Your ICP isn't seeing you.
```

**Score 1:**
```
Posting ${posts_per_week}x/week. You're invisible. That's a choice.
```

---

### Team Visibility

**Score 5:**
```
Team posting ${team_posts_per_week}/week. Your people are building authority alongside you.
```

**Score 4:**
```
Team posting ${team_posts_per_week}/week. Good start on distributed authority.
```

**Score 3:**
```
Team posting ${team_posts_per_week}/week. Some visibility, but room to grow.
```

**Score 2:**
```
Team posting ${team_posts_per_week}/week. Your people are mostly invisible.
```

**Score 1:**
```
Team posts: 0/week. Your people are invisible. That's wasted leverage.
```

---

## SECTION: POSITIONING ANALYSIS

### Score 5:
```
## Positioning Coherence: 5/5

Your positioning is tight.

Your website says "${website_headline}". Your case studies prove exactly that. A ${stated_icp} lands on your site and thinks "these people get me."

No notes.
```

### Score 4:
```
## Positioning Coherence: 4/5

Positioning is solid with minor drift.

You say you serve ${stated_icp}, and mostly you prove it. But ${specific_disconnect} muddies the water. A ${stated_icp} might wonder if you're really focused on them or just taking anyone with a PO.

**Minor fixes needed:**
${list_of_minor_fixes}
```

### Score 3:
```
## Positioning Coherence: 3/5

Here's your problem: you SAY you serve ${stated_icp}, but your proof tells a different story.

**What You Claim:**
- ICP: ${stated_icp}
- Offer: ${stated_offer}
- Differentiator: ${stated_differentiator}

**What Your Proof Shows:**
${case_study_analysis}

**The Disconnect:**
When a ${stated_icp} lands on your site, they're doing mental math: "Are these people for ME?" Right now, the answer is "maybe?"

"Maybe" loses to the agency with proof that screams "we do this exact thing for people exactly like you."

**What Your Proof Actually Attracts:**
${actual_icp_attracted}
```

### Score 2:
```
## Positioning Coherence: 2/5

Your positioning is confused, and it's costing you money.

**What You Say:**
You claim to serve ${stated_icp} with ${stated_offer}. Your differentiator is ${stated_differentiator}.

**What Your Website Shows:**
${website_analysis}

**What Your Case Studies Show:**
${case_study_list}

**The Gap:**
These don't match. A ${stated_icp} checking you out sees proof for a completely different buyer.

You're not positioned. You're just... available.

**What Your Proof Actually Supports:**
${actual_icp_attracted}

**The Fix:**
Either change your ICP claim to match your actual experience, or go get 2-3 clients in your stated ICP and document the hell out of them. You can't have it both ways.
```

### Score 1:
```
## Positioning Coherence: 1/5

I'm going to be direct: you don't have positioning. You have a list of services.

**You told us:**
- ICP: ${stated_icp}
- Offer: ${stated_offer}

**Your website says:** "${website_headline}"

**Your clients include:** ${client_list}

**Your content talks about:** ${content_themes}

None of this aligns. This isn't a messaging problem. It's an identity crisis.

Until you fix this, everything else is just noise. Every marketing dollar, every sales conversation, every piece of content — wasted on a confused message.

**Pick a lane and prove you belong there.**
```

---

## SECTION: CONTENT-MARKET FIT

### Score 5:
```
## Content-Market Fit: 5/5

Your content is locked in.

You're talking about ${icp_problems_addressed}, using their language, building authority in exactly the space you claim to own.

Keep doing this.
```

### Score 4:
```
## Content-Market Fit: 4/5

Content is mostly on target.

You're addressing ${icp_problems_addressed}, which resonates with ${stated_icp}. But ${percentage_off_topic}% of your recent content is off-topic — ${off_topic_themes}.

Every post that isn't for your ICP is a missed rep. Tighten it up.
```

### Score 3:
```
## Content-Market Fit: 3/5

Your content has an identity crisis.

**Who You Say You Serve:**
${stated_icp}

**What ${stated_icp} Actually Cares About:**
${exa_icp_problems}

**What Your Content Talks About:**
${actual_content_themes}

You're addressing maybe ${relevance_percentage}% of what matters to your ICP. The rest is attracting... honestly, I'm not sure who.

**Content That Misses:**
${content_miss_examples}
```

### Score 2:
```
## Content-Market Fit: 2/5

Your content isn't for your ICP. It's for... you? Other agency owners? The void?

**You Say You Serve:**
${stated_icp}

**What ${stated_icp} Actually Worries About:**
${exa_icp_problems}

**What Your Content Talks About (last 30 days):**
${actual_content_themes}

**The Math:**
${relevance_percentage}% of your content is relevant to your stated ICP.

**Who Your Content Actually Attracts:**
${actual_audience}

**Specific Misses:**
| Post | Why It Misses |
|------|---------------|
${content_miss_table}

**What You Should Be Talking About:**
${content_opportunities}
```

### Score 1:
```
## Content-Market Fit: 1/5

You're completely disconnected from your ICP's reality.

**You Claim to Serve:**
${stated_icp}

**What ${stated_icp} Is Worried About:**
${exa_icp_problems}

**What Your Content Talks About:**
${actual_content_themes}

These aren't even in the same universe.

If I didn't know what you sold, I couldn't guess from your LinkedIn. You're basically invisible to the people you want to reach.

**Until you understand what keeps your ICP up at night — and start addressing it — you're just making noise.**
```

---

## SECTION: SOCIAL PROOF ALIGNMENT

### Score 5:
```
## Social Proof Alignment: 5/5

Your proof is airtight.

${stated_icp} sees ${similar_company} in your case studies and thinks "if they did that for them, they can do it for me."

This is how you de-risk the buy.
```

### Score 4:
```
## Social Proof Alignment: 4/5

Strong proof with gaps.

${strongest_proof_point} is exactly right — ${stated_icp} sees themselves in that.

But ${weak_proof_point} is a stretch. You need ${missing_proof_count} more proof points in your core ICP to really lock this down.
```

### Score 3:
```
## Social Proof Alignment: 3/5

Your social proof is working against you.

**You Want to Serve:**
${stated_icp}

**Your Case Studies Feature:**
${case_study_clients}

**Your Testimonials Come From:**
${testimonial_sources}

When a ${stated_icp} looks at your proof, they're doing mental math: "Are these people like me? Will this work for MY situation?"

Right now, the answer is "maybe?" That's not good enough. "Maybe" loses to the agency with proof that screams relevance.

**What's Missing:**
${missing_proof}
```

### Score 2:
```
## Social Proof Alignment: 2/5

You have a proof problem.

**Target:** ${stated_icp}
**Your Case Studies:** ${case_study_clients}

These don't match. And in a market where trust is everything, you're asking ${stated_icp} to take a leap of faith.

Most won't.

**Your Current Testimonials:**
${testimonial_quotes}

These are warm. They're also irrelevant to your stated ICP.

**What You Need:**
${missing_proof}
```

### Score 1:
```
## Social Proof Alignment: 1/5

You have no relevant social proof for your stated ICP.

**You Want:** ${stated_icp}
**Your Proof Shows:** ${actual_proof_clients}

This is a credibility gap you cannot content-market your way out of.

Either:
1. Change your ICP to match your actual clients
2. Go get 2-3 clients in your target ICP and document the hell out of it
3. Accept that you'll lose to competitors who have the proof you don't

Harsh? Yes. But you need to hear it.
```

---

## SECTION: ICP PROBLEM AWARENESS

### Score 5:
```
## ICP Problem Awareness: 5/5

You know your ICP's problems better than they do.

**Problems ${stated_icp} Has:**
${exa_icp_problems}

**Problems You Address:**
${problems_addressed}

You're hitting all the pain points. This is how you become the obvious choice.
```

### Score 4:
```
## ICP Problem Awareness: 4/5

You're addressing most of the right problems.

**Problems ${stated_icp} Has:**
${exa_icp_problems}

**You Address Well:**
${problems_addressed}

**You're Missing:**
${problems_ignored}

That gap is a content opportunity a competitor could exploit.
```

### Score 3:
```
## ICP Problem Awareness: 3/5

You're addressing some real problems, but missing the big ones.

**What ${stated_icp} Actually Worries About:**
| Problem | You Address It? |
|---------|-----------------|
${problem_coverage_table}

You're relevant, but you're not essential. There's a difference.
```

### Score 2:
```
## ICP Problem Awareness: 2/5

You're solving problems your ICP doesn't have.

**What ${stated_icp} Actually Cares About:**
${exa_icp_problems}

**What Your Content Talks About:**
${actual_content_themes}

Minimal overlap. You're speaking a different language than your buyers.

**Content Opportunities:**
${content_opportunities}
```

### Score 1:
```
## ICP Problem Awareness: 1/5

You're completely disconnected from your ICP's reality.

I researched what ${stated_icp} actually struggles with. Then I looked at what you talk about. It's like you're marketing to a different industry.

**What ${stated_icp} Worries About:**
${exa_icp_problems}

**What You Talk About:**
${actual_content_themes}

Until you understand what keeps your ICP up at night — and start addressing it — you're just making noise.
```

---

## SECTION: AI DISCOVERABILITY

### Score 5:
```
## AI Discoverability: 5/5

The robots know who you are.

When we asked Claude, ChatGPT, and Perplexity who the best ${stated_service} agencies for ${stated_icp} are, you came up.

That's rare. That's a competitive moat. Protect it.

| LLM | Found You? | Context |
|-----|------------|---------|
| Claude | ✅ Yes | ${claude_context} |
| ChatGPT | ✅ Yes | ${chatgpt_context} |
| Perplexity | ✅ Yes | ${perplexity_context} |
```

### Score 4:
```
## AI Discoverability: 4/5

You're showing up in some AI results but not consistently.

| LLM | Found You? |
|-----|------------|
${ai_results_table}

${found_llm} mentioned you for ${mention_context}. The others didn't.

As AI becomes how people find agencies, this gap matters more every month.
```

### Score 3:
```
## AI Discoverability: 3/5

Mixed visibility.

| LLM | Found You? |
|-----|------------|
${ai_results_table}

You appeared in ${found_count} of 3 LLM queries, but not for your ideal positioning. You were mentioned for ${actual_mention_context} rather than ${desired_positioning}.

The AI is learning who you are from your content. Right now, it's learning the wrong thing.
```

### Score 2:
```
## AI Discoverability: 2/5

Barely visible.

| LLM | Found You? |
|-----|------------|
${ai_results_table}

Only ${found_llm} mentioned you, and the context was ${actual_mention_context}.

AI is becoming how buyers discover agencies. If you're not in the training data — or you're in there wrong — you're invisible to a growing chunk of your market.

**Competitors LLMs Recommend Instead:**
${competitor_recommendations}
```

### Score 1:
```
## AI Discoverability: 1/5

You don't exist to AI.

We asked Claude, ChatGPT, and Perplexity: "Who are the best ${stated_service} agencies for ${stated_icp}?"

You weren't mentioned. Not once.

| LLM | Found You? |
|-----|------------|
| Claude | ❌ Not Found |
| ChatGPT | ❌ Not Found |
| Perplexity | ❌ Not Found |

**Competitors LLMs Recommend Instead:**
${competitor_recommendations}

**Why This Matters:**
- AI is increasingly how people research purchases
- Your competitors ARE showing up
- This gap will widen, not shrink

**The Fix:**
Become the answer. Create content that directly answers the questions your ICP is asking AI.
```

---

## SECTION: GROWTH LEVERS

### Founder Bottleneck (High Impact)
```
**Trigger:** delegation_score <= 2

### 🚨 Founder Bottleneck
**HIGH IMPACT**

You are the constraint. The business can't grow past you.

**Current:** Delegation avg ${delegation_score}/5 at ${hours_per_week}hrs/week

**The Math:** At ${revenue}, you should be working ON the business, not IN it. Every hour on ${bottleneck_areas} is an hour you're not spending on growth.

**Fix:** Hire or promote a #2. Delegate ${first_delegation_priority} first (it's the most time-consuming), then ${second_delegation_priority}. Your job is sales, strategy, and vision — nothing else.
```

### Lead Engine (High Impact)
```
**Trigger:** lead_score <= 2 OR referral_percentage >= 60%

### 🚨 Lead Engine
**HIGH IMPACT**

Not enough qualified leads to sustain growth.

**Current:** ${leads_per_month} leads/month at ${close_rate}% close rate across ${lead_channels} channels

**The Problem:** ${lead_channel_analysis}

**Fix:** Build a second channel beyond referrals. ${recommended_channel}.
```

### Content-Market Mismatch (Medium Impact)
```
**Trigger:** content_market_fit_score <= 3

### ⚠️ Content-Market Mismatch
**MEDIUM IMPACT**

Your content isn't attracting your ICP.

**Current:** ${posts_per_week} posts/week, ${relevance_percentage}% relevance to ${stated_icp}

**Fix:** Every piece of content should answer one question: "Would a ${stated_icp} find this valuable?" If no, don't post it.
```

### Team Invisibility (Medium Impact)
```
**Trigger:** team_posts_per_week <= 1

### ⚠️ Team Invisibility
**MEDIUM IMPACT**

Your team posts ${team_posts_per_week}x/week.

**Fix:** Get 2-3 team members posting 2x/week about their expertise. Multiplies your reach without multiplying your effort.
```

### Systems Gap (Medium Impact)
```
**Trigger:** systems_score <= 2

### ⚠️ Systems Gap
**MEDIUM IMPACT**

${documented_processes}/${total_processes} processes documented.

**Fix:** Document one process per week. Start with ${first_process_to_document}. You can't delegate what isn't written down.
```

---

## SECTION: FOUNDER OPERATING SYSTEM

```
## Founder Operating System

| Metric | Value | Status |
|--------|-------|--------|
| Delegation Score | ${delegation_score} | ${delegation_assessment} |
| ON vs IN Ratio | ${on_vs_in_percentage}% | ${on_vs_in_assessment} |
| Burnout Risk | ${burnout_risk} | ${burnout_color} |
| Bottleneck Areas | ${bottleneck_count} | ${bottleneck_list} |

**Bottlenecks:** ${bottleneck_areas_list}
```

### Delegation Assessment Copy:

**Score 5:**
```
You've built a machine. The business runs without you in the weeds.
```

**Score 4:**
```
Strong delegation. Stay vigilant about creep.
```

**Score 3:**
```
Getting there, but you're still too involved in day-to-day.
```

**Score 2:**
```
You're doing too much. The business is capped by your capacity.
```

**Score 1:**
```
You ARE the business. That's not leadership, it's martyrdom.
```

### ON vs IN Assessment:

**>50%:**
```
Healthy balance. You're working on growth, not just execution.
```

**30-50%:**
```
Tilted toward execution. Block more strategic time.
```

**<30%:**
```
You're trapped in the business. No time for growth work.
```

### Burnout Risk Labels:
- **low**: <40 hrs/week, delegation >3
- **moderate**: 40-50 hrs/week, delegation 2-3
- **high**: 50-55 hrs/week, delegation <2
- **critical**: >55 hrs/week, delegation <2

---

## SECTION: REALITY CHECKS

These are conditional callouts that appear when specific dangerous patterns are detected.

### Referral Dependency
```
**Trigger:** referral_percentage >= 70%

🚨 **REFERRAL DEPENDENCY ALERT**

${referral_percentage}% of your leads come from referrals.

That sounds great until you realize:
- You don't control it
- It doesn't scale
- One key referrer leaves or retires, and your pipeline craters

Referrals are dessert. You need a main course. Build a channel you control.
```

### Growth Target Mismatch
```
**Trigger:** target_growth > (actual_net_growth * 1.5)

🚨 **REALITY CHECK**

You're targeting ${target_growth}% growth while your net growth rate is ${actual_net_growth}%.

That's not ambition — that's denial.

Either:
1. Fix churn first (you're losing ${monthly_churn} clients/month)
2. Dramatically increase lead gen
3. Adjust your target to reality

Hoping harder isn't a strategy.
```

### Positioning/Proof Mismatch
```
**Trigger:** positioning_score >= 4 AND proof_alignment_score <= 2

🚨 **POSITIONING WITHOUT PROOF**

Your positioning claims ${stated_positioning}. Your proof shows ${actual_proof_summary}.

You've got a great sign on a store that's never open.

Fix your proof or your positioning is just wallpaper.
```

### AI Invisibility
```
**Trigger:** ai_discoverability_score <= 2

🚨 **YOU'RE INVISIBLE TO AI**

When your ICP asks ChatGPT or Claude for ${stated_service} recommendations, you don't exist.

This isn't a future problem. It's a now problem. The agencies showing up are getting mindshare you're not.

Your content strategy needs to change. You need to become the answer.
```

### Founder is Everything
```
**Trigger:** delegation_score == 1 AND bottleneck_count >= 4

🚨 **YOU ARE THE BOTTLENECK**

At ${revenue}, with a delegation score of ${delegation_score}, you ARE the ceiling on this business.

${bottleneck_areas} — that's everything. The business doesn't run without you in every seat.

If you got hit by a bus tomorrow, there's no business left. That's not an asset anyone would buy. It's a job you created for yourself.
```

---

## SECTION: PRIORITY ACTIONS

```
## Priority Actions

Based on everything above, here's what matters in order:

| Priority | Action | Why |
|----------|--------|-----|
| 1 | ${priority_1_action} | ${priority_1_why} |
| 2 | ${priority_2_action} | ${priority_2_why} |
| 3 | ${priority_3_action} | ${priority_3_why} |
| 4 | ${priority_4_action} | ${priority_4_why} |
| 5 | ${priority_5_action} | ${priority_5_why} |
```

### Priority Logic:

**If positioning_score <= 2:**
Priority 1 = "Fix positioning/proof mismatch" | "Everything else is noise until this is solved"

**If delegation_score <= 2 AND revenue > 1000000:**
Priority 2 = "Hire/promote delivery lead" | "Free yourself from ${delegation_hours}+ hrs/week of client work"

**If content_market_fit_score <= 2:**
Priority 3 = "Rebuild content strategy" | "Stop posting generalist content, start owning ${stated_positioning}"

**If referral_percentage >= 70%:**
Priority 4 = "Build second lead channel" | "Reduce referral dependency"

**If systems_score <= 2:**
Priority 5 = "Document your processes" | "You can't delegate what isn't written down"

---

## SECTION: NEXT STEPS CTA

```
## Next Steps

### 60 Minute Roadmap Consultation
**($1,250 Value) — $647**

Let's fix this together. In 60 minutes, we'll:
- Prioritize your positioning fix
- Map your founder escape route
- Build your 90-day action plan

[Book Your Roadmap Call →]

---

### Explore Our Coaching & Consulting Programs
[Learn More →]

---

### Join The Agency Inner Circle
Free Slack community for agency owners who are tired of the bullshit.

[Join Free →]
```

---

## VARIABLE REFERENCE

### From Form Input:
- `company_name`
- `founder_linkedin_url`
- `company_linkedin_url`
- `annual_revenue`
- `target_revenue`
- `net_profit_margin`
- `team_size`
- `avg_monthly_retainer`
- `new_clients_per_month`
- `clients_lost_per_month`
- `current_active_clients`
- `avg_client_lifetime_months`
- `referral_percentage`
- `inbound_percentage`
- `outbound_percentage`
- `paid_ads_percentage`
- `content_percentage`
- `partnerships_percentage`
- `qualified_leads_per_month`
- `close_rate`
- `client_deliverables_score` (1-5)
- `account_management_score` (1-5)
- `marketing_score` (1-5)
- `sales_score` (1-5)
- `weekly_hours`
- `hours_on_strategy`
- `documented_sales_processes`
- `documented_delivery_processes`
- `documented_account_management`
- `documented_marketing_processes`
- `target_client_company_size`
- `target_client_industry`
- `stated_icp` (free text)
- `stated_offer` (free text)
- `stated_differentiator` (free text)
- `founder_posts_per_week`
- `team_posts_per_week`
- `has_case_studies`
- `displays_client_logos`

### From Scraping (Apify):
- `website_headline`
- `website_subheadline`
- `website_services`
- `case_study_clients`
- `case_study_industries`
- `case_study_results`
- `testimonial_quotes`
- `testimonial_sources`
- `client_logo_companies`
- `blog_titles`
- `founder_linkedin_headline`
- `founder_linkedin_about`
- `founder_linkedin_posts`
- `company_linkedin_description`
- `company_linkedin_posts`

### From Research (Exa):
- `exa_icp_problems`
- `exa_icp_buying_criteria`
- `exa_icp_churn_reasons`
- `exa_competitors`
- `exa_competitor_positioning`

### From AI Check (Perplexity):
- `claude_found`
- `claude_context`
- `chatgpt_found`
- `chatgpt_context`
- `perplexity_found`
- `perplexity_context`
- `competitor_recommendations`

### Calculated Scores:
- `overall_score`
- `revenue_quality_score`
- `profitability_score`
- `growth_churn_score`
- `lead_engine_score`
- `founder_load_score`
- `systems_readiness_score`
- `content_positioning_score`
- `team_visibility_score`
- `positioning_coherence_score`
- `content_market_fit_score`
- `social_proof_alignment_score`
- `icp_problem_awareness_score`
- `ai_discoverability_score`

### Calculated Metrics:
- `revenue_per_fte`
- `net_growth_percentage`
- `delegation_score`
- `on_vs_in_ratio`
- `burnout_risk`
- `bottleneck_count`
- `bottleneck_areas`
- `lead_channels_count`
- `documented_processes_count`
- `relevance_percentage`

---

## OUTPUT FORMAT

The final output should be a single-page scrollable report with:

1. **Header** - Company name, overall score badge, segment
2. **WTF Zones Heatmap** - Visual score bars with one-line insights
3. **Positioning Analysis** - Full narrative block
4. **Content-Market Fit** - Full narrative block
5. **Social Proof Alignment** - Full narrative block
6. **AI Discoverability** - Full narrative block with table
7. **Growth Levers** - Prioritized action cards
8. **Founder Operating System** - Metrics table
9. **Reality Checks** - Conditional warning callouts (only show if triggered)
10. **Priority Actions** - Numbered action table
11. **Next Steps CTA** - Consultation + community offers

Color scheme: Dark background (#0a0a0f), cyan accents (#00D4FF), red for warnings/CTAs (#E31B23)
