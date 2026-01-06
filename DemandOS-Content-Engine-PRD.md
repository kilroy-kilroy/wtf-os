# DemandOS Content Engine
## Product Requirements Document
**Version 1.1 | January 2025 | Tim Kilroy**

---

## Executive Summary

The DemandOS Content Engine is a content multiplication platform that enables agency leaders and their teams to transform single pieces of content into platform-native assets across LinkedIn, Twitter/X, email, and graphic pull quotes. The core innovation is a **voice-first architecture** where Brand Official content serves as a safety net and starting point, while encouraging individual team members to develop authentic variations that maintain brand coherence without sacrificing personality.

**Philosophy:** Brand Official is the bassline. Everyone else improvises over it. The lumpiness is the product. The variety is what makes it human.

**Important:** This is a writing assistant, not a publishing tool. Nothing leaves the tool automatically. The human is the filter.

---

## V1 Build Sequence

Recommended order for development. Each phase should be functional before moving to next.

### Phase 1: Foundation

1. **Auth + User Profiles:** Supabase auth, basic profile fields (role, department, platform preferences)
2. **Voice Calibration (MVP):** Paste examples + voice description only. LinkedIn scrape and quiz are V1.1.
3. **Org/Team Structure:** Create org, invite members, designate Brand Official

### Phase 2: Content Repository

1. **Manual Content Input:** Paste/upload content, add synopsis, tag with 4E theme
2. **Repository Views:** Browse by theme, source type, recency + full-text search
3. **URL Import:** Paste URL, auto-extract content

### Phase 3: Output Engine

1. **Repurpose Generation:** Transform source → LinkedIn, Twitter, Email, Pull Quotes
2. **Per-Output Controls:** Regenerate button, tone adjustments (spicier/safer/shorter)
3. **Interactive Hub:** Tabbed interface to review all outputs, copy-paste export
4. **Version Tracking:** See others' repurposes of same source content

### Phase 4: Call Integration

1. **Fireflies Integration:** Connect account, pull transcripts (Fireflies first — best API, already in use)
2. **Content Moment Detection:** AI surfaces quotable moments from calls
3. **Clip Selection:** Manual highlight/select from transcript

### Phase 5: Engagement

1. **Simple Nudges:** New content alerts only. Role-matching and performance alerts are V1.1.
2. **Email Digest:** Weekly summary of new content available to repurpose

---

## Onboarding Flow

### Brand Official (First User)

1. Sign up → Create org
2. Basic profile (name, role, platforms)
3. Voice calibration: paste 3-5 content examples + describe voice in free text
4. Add first content piece (paste, upload, or URL)
5. Generate first repurpose → see the magic
6. Invite team members

### Team Member (Invited)

1. Accept invite → create account
2. Basic profile (name, role, department, platforms)
3. Voice calibration (optional for Distributors, encouraged for Creators)
4. Browse repository → pick something to repurpose
5. Generate first repurpose → copy to LinkedIn

---

## Team & Admin Structure

### Roles

- **Owner:** Creates org, manages billing, can do everything
- **Brand Official:** Locked voice profile, content is canonical, can approve variations (optional)
- **Creator:** Can add original content + repurpose
- **Distributor:** Can repurpose only (default for new invites)

### Admin Functions

- Invite members via email
- Assign/change roles
- Designate Brand Official(s)
- Remove members
- View team analytics (V1.1)

### Billing

Owner pays. Team tier includes X seats. Additional seats at $Y/month. Simple.

---

## Problem Statement

- Agency leaders create valuable content that dies after one use
- Team members want to post but don't want to write from scratch
- Employee advocacy tools create corporate ventriloquism—50 people posting the same thing with different adjectives
- Most repurposing tools ignore voice, creating content that sounds like AI read someone's bio
- The best content is already being said in meetings and calls—it's just dying in transcript archives

---

## Core Users

### Brand Official (The Source)

The canonical voice for the organization. Typically the founder, CEO, or head of marketing. Publishes original content that populates the repository. Their voice profile is locked and becomes the reference point for brand coherence.

### Team Distributors (The 95%)

Employees who want to look engaged on LinkedIn without spending 2 hours writing. They pull from Brand Official content, apply light personalization, and post. They're content distributors, not content creators.

### Personal Brand Builders (The 5%)

The smart, creative, or brave ones building their own voice. They pull from Brand Official AND contribute their own originals. Two source pools. They develop their own voice profile that may diverge from Brand Official while maintaining brand coherence.

---

## V1 Features

### 1. User Profiles

**Purpose:** Capture voice DNA and role context for personalized output generation.

#### Profile Fields

- **Role/Title:** Used for context in repurposing (e.g., "Sales Director" vs "Engineer")
- **Department/Team:** For team analytics grouping
- **Content Comfort Level:** Distributor (repurpose only) vs Creator (originals welcome)
- **Platform Preferences:** Which platforms they actually use

#### Voice Calibration (V1 MVP)

- **Paste Examples:** User pastes 3-5 pieces of content they've written that they love
- **Voice Description:** Free-text field: "How would you describe your writing voice?"

#### Voice Calibration (V1.1)

- **LinkedIn Scrape:** Pull their last 10-15 posts, extract patterns
- **Voice Quiz:** Rate sample outputs until the system learns preferences

**Extracted Voice DNA:** Sentence length patterns, vocabulary complexity, emoji frequency, hook style, CTA style, profanity tolerance, formality level.

---

### 2. Brand Official Channel

**Purpose:** The canonical content source. Safety net for the risk-averse, starting point for everyone else.

#### Input Methods

- **URL Import:** Paste a blog post, newsletter, or article URL. System extracts and processes.
- **LinkedIn Sync (V1.1):** Connect LinkedIn, auto-import Brand Official's posts as source content.
- **Manual Upload:** Paste or upload content directly.

#### Brand Official Permissions

- Locked voice profile (no drift over time)
- Can approve/reject team variations before posting (optional, V1.1)
- Becomes canonical voice reference for the org

---

### 3. Content Repository

**Purpose:** Organized database of all content with discoverability and social proof.

#### Content Record Structure

| Field | Description |
|-------|-------------|
| Source URL/Reference | Original content location or call reference |
| Synopsis | AI-generated 2-3 sentence summary |
| 4E Theme | Evidence, Education, Entertainment, or Envision |
| VVV Tags | Vibes, Vision, Values alignment tags |
| Source Type | Article, call, meeting, podcast, original |
| Author | Brand Official or Personal Brand Builder |
| Repurpose Count | How many times team has repurposed this |
| Created Date | For age-based sorting (old stuff falls to back) |

#### Repository Views

- **Full-Text Search:** Search across all content by keyword
- **Browse by Theme:** Filter by 4E category
- **Browse by Source Type:** Filter by article, call, meeting, etc.
- **Browse by Recency:** Newest first (old content naturally deprioritized)
- **See Others' Versions:** Click any content to see how teammates repurposed it
- **One-Click Repurpose:** "Repurpose This" button on every content card

**Visibility Model:** All content is either Draft (only you) or Team (your org can see it). Nothing is public until the human copies it out and posts it themselves.

---

### 4. The 4E Framework

**Purpose:** Content categorization aligned with DemandOS methodology.

| Category | Definition | Example |
|----------|------------|---------|
| **Evidence** | Proof that validates expertise | Case studies, results, testimonials |
| **Education** | Teaching that builds trust | How-tos, frameworks, breakdowns |
| **Entertainment** | Engagement that builds affinity | Stories, humor, hot takes |
| **Envision** | Future state that inspires action | Vision posts, possibility thinking |

**Auto-tagging:** System suggests 4E category on import; user can override.

---

### 5. Authoring Tool

**Purpose:** Create original content that gets added to the repository.

#### Input Modes

- **Write:** Traditional text editor with formatting
- **Speak:** Voice capture (mobile or desktop), transcribed and cleaned up
- **Import:** Paste URL or upload document
- **Pull from Calls:** Extract content moments from connected meeting/call sources

*Voice Capture Note:* Since we're the voice experts, speaking should feel natural. User hits record, rambles for 2 minutes, system extracts the good stuff and structures it.

---

### 6. Meeting & Call Integration

**Purpose:** Extract content gold from conversations that would otherwise die in transcript archives.

#### V1: Fireflies Only

Start with Fireflies.ai — best API, already in use. Additional integrations (Zoom, Gong, Otter, Fathom, Google Meet) in V1.1.

#### Extraction Features

- **Auto-detect Content Moments:** AI identifies rants, analogies, stories, frameworks explained
- **Clip Selection UI:** Scrub through transcript, highlight the good bits manually
- **AI Extraction:** "Find the 5 most quotable moments from this call"
- **Context Tagging:** Tag as client call, team meeting, podcast, sales call, etc.

#### How It Works

A 45-minute call has maybe 3 minutes of content gold. The system surfaces those moments. User selects what to keep. Content goes into the repository like any other source. Team can repurpose.

#### Protection Model

*We're not the safety police. We're the idea extractor.* The human is the filter.

- **Nothing leaves automatically:** This is a writing assistant, not a publishing tool
- **Permissions happen upstream:** Fireflies/Zoom already handles recording consent at time of recording
- **Visibility is binary:** Draft (only you) or Team (your org can see it in repository)
- **Publishing is manual:** Copy-paste to LinkedIn. The human decides what goes live.
- **Naming is editorial:** Poster decides to say "a fintech client" or "Chase." Their call.

---

### 7. Content Structures (Shaping Tools)

**Purpose:** Optional frameworks to help shape content. Available but not required. Hidden by default — shown when user asks for help structuring.

#### Available Structures

- **PROD:** Problem → Result → Obstacle → Decision
- **PES:** Problem → Education → Solution
- **Hook-Story-Offer:** Classic copywriting structure
- **Contrarian:** Common belief → Why it's wrong → Better way
- **Lesson Learned:** Situation → Mistake → Insight

*Usage:* User can apply structure during creation OR use it to reshape existing content during repurposing.

---

### 8. Prompt/Nudge System

**Purpose:** Drive engagement so the repository doesn't become a library nobody visits.

#### V1 Nudges (Simple)

- **New Content Alert:** "Brand Official just published something. Want to riff on it?"
- **Call Gold Alert:** "Your call with Acme had 3 content moments. Want to see them?"
- **Weekly Digest:** Email summary of new content available to repurpose

#### V1.1 Nudges (Smart)

- **Role-Relevant:** "This case study is in your wheelhouse. Your take?"
- **Engagement Reminder:** "You haven't posted in 2 weeks. Here are 3 easy repurposes."
- **Performance Alert:** "Sarah's version of this post crushed. See what she did?"

---

### 9. Output Generation

**Purpose:** Transform source content into platform-native assets.

#### Output Types

- **LinkedIn Post:** Hook-heavy, 150-200 words, native formatting
- **Twitter/X Thread:** 5-7 tweets, punchy, standalone value per tweet
- **Email Teaser:** 75 words max, drives to full content
- **Pull Quotes:** 3 shareable one-liners for graphics

#### Per-Output Controls

- **Regenerate:** Button on each output to get a fresh version
- **Tone Adjustments:** "Make it spicier" / "More professional" / "Shorter"
- **Inline Edit:** Direct text editing while preserving voice

#### V1 Distribution

**Copy-paste or download only.** No native publishing in V1. Interactive artifact with tabs to review all outputs in one place.

---

## Data Model (Supabase)

Core tables for V1. All tables include standard id, created_at, updated_at fields.

| Table | Key Fields |
|-------|------------|
| **orgs** | name, slug, owner_id, billing_status |
| **users** | email, name, org_id, role (owner/brand_official/creator/distributor) |
| **user_profiles** | user_id, title, department, platforms[], comfort_level |
| **voice_profiles** | user_id, examples[], description, extracted_dna (jsonb), is_locked |
| **content_sources** | org_id, author_id, source_url, source_type, raw_content, synopsis, theme_4e, vvv_tags[], visibility |
| **repurposes** | source_id, user_id, platform, content, version, visibility |
| **call_imports** | org_id, user_id, provider, external_id, transcript, extracted_moments (jsonb) |
| **invites** | org_id, email, role, token, expires_at, accepted_at |

---

## V1.1 Features

### 1. Team Analytics

**Purpose:** Visibility into team content activity without creepy leaderboards.

#### Metrics

1. **Activity:** Who's posting, who's not (aggregate, not punitive)
2. **Content Mix:** 4E distribution across team
3. **Source Usage:** Which Brand Official content gets repurposed most
4. **Call Extraction Rate:** How much content is being pulled from meetings vs. written fresh
5. **Variation Quality:** When personal variations outperform Brand Official versions

### 2. Performance Reporting

**Purpose:** Connect content to outcomes.

#### Integration Required

- LinkedIn API for followers, reach, engagement
- Twitter/X API for impressions, engagement
- Manual entry fallback for platforms without API access

#### Reports

- Content performance by 4E category
- Top-performing variations vs. Brand Official baseline
- Team reach amplification (Brand Official reach vs. total team reach)

### 3. Additional Integrations

- Zoom transcripts
- Gong
- Otter.ai
- Fathom
- Google Meet transcripts
- LinkedIn Sync (auto-import Brand Official posts)

### 4. Draft Collaboration

**Purpose:** Optional review before posting.

- Share draft with teammate or Brand Official for feedback
- Comment/suggest edits
- Approve for posting

*Note:* Keep lightweight. This shouldn't become a bottleneck.

---

## Pricing Model (Sketch)

| Tier | Audience | Features |
|------|----------|----------|
| **Free** | Personal creators | Limited repurposes/month, basic voice |
| **Pro** | Personal brand builders | Unlimited, full voice training, structures |
| **Team** | Agencies, small companies | Brand Official + seats, call integrations, analytics |
| **Enterprise** | Multi-division orgs | Multiple Brand Officials, SSO, advanced reporting |

---

## Success Metrics

- **Activation:** % of team members who repurpose within first 7 days
- **Engagement:** Repurposes per user per week
- **Call Extraction:** % of connected calls that generate at least one content piece
- **Creation:** % of users who create originals (not just repurpose)
- **Variation Quality:** When personal variations outperform Brand Official
- **Team Reach Multiplier:** Total team reach / Brand Official solo reach

---

## Open Questions

- How much voice drift is acceptable for team variations before it feels off-brand?
- Should we surface "weird variations that worked" to encourage creative risk-taking?
- What's the right nudge frequency before it becomes annoying?
- Do we need approval workflows for regulated industries, or is that scope creep?

---

## What This Is NOT

1. **Not a scheduling tool** — We stop at copy-paste. Buffer, Later, Hootsuite handle scheduling.
2. **Not a publishing tool** — Nothing auto-posts. Human is the filter.
3. **Not a CRM** — No contact management, deal tracking, or pipeline.
4. **Not an analytics platform** — Light performance tracking only. Not competing with Shield or Sprout.
5. **Not a content calendar** — No editorial planning. That's a different job.
6. **Not employee advocacy software** — No gamification, no leaderboards, no "share this exact post" pressure.
7. **Not a transcription service** — We integrate with them, we don't replace them.

---

## Tech Stack

- **Frontend:** Next.js (monorepo structure)
- **Backend:** Supabase (auth, database, storage)
- **AI:** Anthropic Claude API for voice extraction and content generation
- **Integrations:** Fireflies API (V1), additional transcript providers (V1.1)

---

*Brand Official is the bassline. Everyone else improvises over it. The lumpiness is the product.*
