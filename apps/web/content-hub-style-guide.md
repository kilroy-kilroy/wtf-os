# Content Hub UI Style Guide
## For Claude Code Implementation

---

## Brand Foundation

Content Hub is part of the WTF Growth OS (formerly DemandOS) product family. The UI should feel **bold but clean** — Tim Kilroy's brand energy on a light, breathable canvas.

**Design Philosophy:** High contrast accents on white. The product should feel like a premium tool, not a toy — but with personality baked in.

---

## Color System

```css
:root {
  /* Primary Brand Colors */
  --brand-red: #E51B23;
  --brand-yellow: #FFDE59;
  --brand-black: #000000;
  --brand-white: #FFFFFF;
  
  /* UI Colors */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8F8F8;
  --bg-tertiary: #F3F3F3;
  
  --border-light: #E5E5E5;
  --border-medium: #D1D1D1;
  
  --text-primary: #000000;
  --text-secondary: #666666;
  --text-muted: #999999;
  
  /* 4E Theme Colors */
  --evidence-primary: #3B82F6;
  --evidence-bg: #DBEAFE;
  --evidence-text: #1E40AF;
  
  --education-primary: #10B981;
  --education-bg: #DCFCE7;
  --education-text: #166534;
  
  --entertainment-primary: #F59E0B;
  --entertainment-bg: #FEF3C7;
  --entertainment-text: #92400E;
  
  --envision-primary: #EC4899;
  --envision-bg: #FCE7F3;
  --envision-text: #9D174D;
  
  /* State Colors */
  --success: #22C55E;
  --error: #EF4444;
  --warning: #F59E0B;
}
```

---

## Typography

### Font Stack

```css
/* Headlines - Anton */
@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');

/* Body - Poppins */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

:root {
  --font-headline: 'Anton', sans-serif;
  --font-body: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Type Scale

| Element | Font | Size | Weight | Case | Letter Spacing |
|---------|------|------|--------|------|----------------|
| Page Title | Anton | 42px | 400 | UPPERCASE | 1px |
| Section Header | Anton | 28px | 400 | UPPERCASE | 0.5px |
| Card Title | Poppins | 20px | 700 | Title Case | 0 |
| Subsection | Anton | 24px | 400 | UPPERCASE | 0.5px |
| Body | Poppins | 15px | 400 | Sentence | 0 |
| Body Small | Poppins | 14px | 400 | Sentence | 0 |
| Label | Poppins | 13px | 500 | UPPERCASE | 0.5px |
| Caption | Poppins | 12px | 400 | Sentence | 0 |
| Badge | Poppins | 12px | 600 | Title Case | 0 |

### Usage Rules

- **Anton** is ONLY for headlines and numbers that should feel like achievements (metrics, counts)
- **Poppins** is everything else — body, buttons, labels, captions
- Headlines are always uppercase with Anton
- Never use Anton for body text or buttons

---

## Component Patterns

### Navigation Bar

```css
.nav-bar {
  background: var(--brand-white);
  border-bottom: 3px solid var(--brand-red);
  height: 64px;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-logo {
  font-family: var(--font-headline);
  font-size: 22px;
  color: var(--brand-black);
  letter-spacing: 0.5px;
}

.nav-logo-icon {
  width: 36px;
  height: 36px;
  background: var(--brand-red);
  border-radius: 4px;
  /* Contains "CH" in Anton, white */
}

.nav-item {
  padding: 8px 20px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.nav-item--active {
  background: var(--brand-red);
  color: var(--brand-white);
}

.nav-item--inactive {
  background: transparent;
  color: var(--brand-black);
}
```

### Primary Button (Add Content)

```css
.btn-primary {
  padding: 10px 24px;
  background: var(--brand-black);
  border: none;
  border-radius: 4px;
  color: var(--brand-white);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: #222222;
}
```

### Secondary Button

```css
.btn-secondary {
  padding: 12px 28px;
  background: var(--brand-white);
  border: 2px solid var(--brand-black);
  border-radius: 6px;
  color: var(--brand-black);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}
```

### Action Button (Generate All)

```css
.btn-action {
  padding: 12px 24px;
  background: var(--brand-red);
  border: none;
  border-radius: 6px;
  color: var(--brand-white);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action:hover {
  background: #CC171F;
}
```

### Content Card

```css
.content-card {
  background: var(--brand-white);
  border-radius: 12px;
  border: 2px solid var(--border-light);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.content-card:hover {
  border-color: var(--border-medium);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* RED ACCENT BAR - This is the signature element */
.content-card__accent {
  height: 4px;
  background: var(--brand-red);
  width: 100%;
}

.content-card__body {
  padding: 24px;
}

.content-card__footer {
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-card__repurpose-count {
  color: var(--brand-red);
  font-weight: 600;
  font-size: 13px;
}
```

### 4E Theme Badge

```css
.theme-badge {
  display: inline-block;
  padding: 6px 14px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
}

.theme-badge--evidence {
  background: var(--evidence-bg);
  color: var(--evidence-text);
}

.theme-badge--education {
  background: var(--education-bg);
  color: var(--education-text);
}

.theme-badge--entertainment {
  background: var(--entertainment-bg);
  color: var(--entertainment-text);
}

.theme-badge--envision {
  background: var(--envision-bg);
  color: var(--envision-text);
}
```

### Filter Pills

```css
.filter-pill {
  padding: 10px 18px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-pill--inactive {
  background: var(--brand-white);
  border: 2px solid var(--border-light);
  color: var(--brand-black);
}

.filter-pill--active {
  /* Use the corresponding 4E color */
  background: var(--evidence-primary); /* or education, etc */
  border: 2px solid transparent;
  color: var(--brand-white);
}

/* "All" filter uses brand red when active */
.filter-pill--all.filter-pill--active {
  background: var(--brand-red);
}
```

### Search Input

```css
.search-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  border: 2px solid var(--border-light);
  border-radius: 8px;
  font-family: var(--font-body);
  font-size: 15px;
  background: var(--brand-white);
  outline: none;
  transition: border-color 0.15s ease;
}

.search-input:focus {
  border-color: var(--brand-red);
}

.search-input::placeholder {
  color: var(--text-muted);
}
```

### Metric Card (Dashboard)

```css
.metric-card {
  background: var(--brand-white);
  border-radius: 12px;
  padding: 24px;
  border-top: 4px solid var(--brand-red);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.metric-card__label {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.metric-card__value {
  font-family: var(--font-headline);
  font-size: 36px;
  color: var(--brand-black);
}

/* Variation: Yellow accent for "This Week" */
.metric-card--highlight {
  border-top-color: var(--brand-yellow);
}

/* Variation: Black accent for neutral metrics */
.metric-card--neutral {
  border-top-color: var(--brand-black);
}
```

### Synopsis Box

```css
.synopsis-box {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid var(--brand-red);
}

.synopsis-box__text {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--brand-black);
  line-height: 1.7;
}

.synopsis-box__link {
  color: var(--brand-red);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  margin-top: 12px;
  display: inline-block;
}
```

### Output Tabs (LinkedIn, Twitter, etc)

```css
.output-tabs {
  display: flex;
  border-bottom: 2px solid var(--border-light);
}

.output-tab {
  padding: 14px 24px;
  font-family: var(--font-body);
  font-size: 14px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.output-tab--active {
  color: var(--brand-black);
  font-weight: 600;
  border-bottom-color: var(--brand-red);
}

.output-tab--inactive {
  color: var(--text-secondary);
  font-weight: 400;
}
```

---

## Layout Specifications

### Page Container
```css
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
}
```

### Content Grid
```css
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}
```

### Metric Grid (Dashboard)
```css
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* Responsive */
@media (max-width: 1024px) {
  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Spacing System

Use 4px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight gaps |
| --space-2 | 8px | Icon gaps, small margins |
| --space-3 | 12px | Badge margins |
| --space-4 | 16px | Card padding, small gaps |
| --space-5 | 20px | Section padding |
| --space-6 | 24px | Card body padding |
| --space-8 | 32px | Page padding, section gaps |
| --space-10 | 40px | Large section separators |
| --space-12 | 48px | Major section breaks |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | 4px | Badges, small buttons, logo icon |
| --radius-md | 6px | Buttons, inputs |
| --radius-lg | 8px | Input fields, synopsis boxes |
| --radius-xl | 12px | Cards, containers |
| --radius-full | 50px | Filter pills |

---

## Shadows

```css
:root {
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

---

## Signature Elements (Non-Negotiable)

1. **Red accent bar (3px) under nav** — This is the brand signature. Always present.

2. **Red accent bar (4px) on top of cards** — Every content card, metric card, and major container gets this.

3. **Red left border (4px) on synopsis/highlight boxes** — Draws attention to key content.

4. **Anton for headlines, UPPERCASE** — Page titles and section headers only.

5. **Red for repurpose counts and action metrics** — Draws the eye to the "action" number.

6. **Red active states** — Nav items, filter pills (except 4E-specific colors).

---

## Logo Usage in App

For the nav bar logo mark, use a simplified version:
- 36x36px red square with 4px border radius
- "CH" in white Anton font, centered
- Or use the full "Content Hub" lockup from the provided assets (yellow "CONTENT", red "HUB" stacked)

For loading states or splash screens, the full stacked logo works well on white background.

---

## What NOT to Do

❌ Don't use the muted terracotta/coral color from the current UI — it's not your brand  
❌ Don't use rounded pill shapes for nav items — too soft  
❌ Don't put accent bars on the bottom of cards — they go on TOP  
❌ Don't use Inter, Roboto, or system fonts — Anton + Poppins only  
❌ Don't use gray for repurpose counts — they're red to draw attention  
❌ Don't skip the red accent bar on cards — it's the visual signature  
❌ Don't use lowercase for Anton headlines — it looks wrong  

---

## Implementation Checklist

- [ ] Import Anton and Poppins fonts
- [ ] Set up CSS variables for colors
- [ ] Nav bar with 3px red bottom border
- [ ] Content cards with 4px red top accent
- [ ] Anton headlines in UPPERCASE
- [ ] Red active states on nav/filters
- [ ] 4E color-coded badges and filters
- [ ] Red repurpose count text
- [ ] Synopsis boxes with red left border
- [ ] Metric cards with colored top borders

---

## Questions?

If Claude Code isn't sure about something, default to:
- More red accent, not less
- Anton for big text, Poppins for everything else
- White backgrounds with plenty of breathing room
- The accent bar goes on TOP of things
