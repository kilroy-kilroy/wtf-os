# Call Lab Database Schema

## Tables Required

### 1. `reports` Table
Stores all quick analysis reports generated from the instant recorder.

```sql
CREATE TABLE reports (
  id VARCHAR(36) PRIMARY KEY,              -- UUID v4 (e.g., 'abc123-def456-...')
  email VARCHAR(255) NOT NULL,             -- User's email
  audio_url TEXT,                          -- S3/storage URL for audio file
  transcript TEXT NOT NULL,                -- Full transcript from Whisper
  analysis TEXT NOT NULL,                  -- JSON-formatted analysis result
  score INTEGER NOT NULL,                  -- 1-10 score
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP,                     -- When user first viewed the report
  view_count INTEGER DEFAULT 0,            -- How many times report was viewed
  
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
);
```

**Field Details:**

- `id`: Short unique identifier for URL (e.g., `reports/a1b2c3d4`)
- `email`: Required for sending report link
- `audio_url`: Optional - can store or delete after transcription
- `transcript`: Full text from OpenAI Whisper
- `analysis`: JSON string containing:
  ```json
  {
    "score": 6,
    "summary": "You opened with...",
    "what_worked": ["Specific client reference", "Clear value prop"],
    "what_to_watch": ["Too much jargon", "Rushed the close"],
    "one_move": "Next time, slow down at 0:18..."
  }
  ```
- `score`: 1-10 integer for display
- `created_at`: When report was generated
- `viewed_at`: First view timestamp (for tracking engagement)
- `view_count`: Total views (for analytics)

---

### 2. `leads` Table (Optional - if you want to track lead progression separately)
Tracks email captures and their journey through the funnel.

```sql
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  source VARCHAR(50) DEFAULT 'call-lab-instant',  -- Where they came from
  
  -- Report they generated
  first_report_id VARCHAR(36),
  
  -- Email sequence tracking
  welcome_sent_at TIMESTAMP,
  pro_pitch_sent_at TIMESTAMP,
  
  -- Conversion tracking
  subscribed_to_newsletter BOOLEAN DEFAULT TRUE,
  upgraded_to_pro BOOLEAN DEFAULT FALSE,
  upgraded_at TIMESTAMP,
  
  -- Meta
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_source (source),
  FOREIGN KEY (first_report_id) REFERENCES reports(id)
);
```

**Simpler Alternative:** Just use the `reports` table and key everything off email.

---

## ID Generation Strategy

**For Report IDs:**
Use short, URL-friendly IDs (8-12 characters) instead of full UUIDs:

```javascript
// Node.js example
const { nanoid } = require('nanoid');
const reportId = nanoid(10); // e.g., 'V1StGXR8_Z'
```

**URL Format:**
```
app.timkilroy.com/reports/V1StGXR8_Z
```

Clean, short, shareable.

---

## Required Backend Routes

### 1. `POST /api/analyze-quick`
**Current:** Just returns analysis
**New:** Save to database and return report ID

```javascript
// Request
{
  audioBlob: <binary>,
  duration: 30
}

// Response
{
  reportId: "V1StGXR8_Z",  // NEW
  score: 6,
  analysis: { ... }
}
```

**Process:**
1. Receive audio
2. Upload to S3 (optional)
3. Transcribe with Whisper
4. Generate analysis with GPT-4
5. **Save to database** (new step)
6. Return reportId + analysis

---

### 2. `POST /api/capture-lead`
**Current:** Just captures email
**New:** Link email to report, send emails

```javascript
// Request
{
  email: "tim@example.com",
  reportId: "V1StGXR8_Z"
}

// Response
{
  success: true,
  reportUrl: "https://app.timkilroy.com/reports/V1StGXR8_Z"
}
```

**Process:**
1. Validate email
2. Update `reports` table with email (if not set)
3. Create/update `leads` table entry
4. Send Email 1 (report + WTF guide)
5. Queue Email 2-7 for Beehiiv
6. Return success + report URL

---

### 3. `GET /reports/:reportId` (NEW ROUTE)
Displays saved report in permanent, shareable format.

```javascript
// URL
app.timkilroy.com/reports/V1StGXR8_Z

// Response (HTML page)
Renders report with:
- Score
- Analysis sections
- Upgrade CTA to Pro
- Share buttons (optional)
```

**Process:**
1. Query database for reportId
2. If not found → 404
3. If found:
   - Increment `view_count`
   - Set `viewed_at` if first view
   - Render HTML template with data

**Template:** Similar to current analysis display, but as standalone page with:
- Header/footer
- Upgrade CTA
- "Analyze another call" button
- Optional: Social share buttons

---

## Email Integration

### Email 1: Immediate (sent from `/api/capture-lead`)
**Subject:** Your Call Lab Report + WTF Sales Guide

**Content:**
- Link to permanent report: `app.timkilroy.com/reports/{{reportId}}`
- Link to WTF Sales Guide: `timkilroy.com/wtf-sales-guide`
- Intro to Agency Inner Circle
- Soft pitch for Pro

**Send via:** Transactional email (SendGrid, Postmark, etc.)

### Emails 2-7: Drip Sequence (queued via Beehiiv API)
After capturing lead, push to Beehiiv with tags:
```javascript
{
  email: "tim@example.com",
  tags: ["call-lab-user", "report-generated"],
  custom_fields: {
    reportUrl: "https://app.timkilroy.com/reports/V1StGXR8_Z"
  }
}
```

Then Beehiiv automation triggers:
- Day 1: Email 2 (Pro vs Lite)
- Day 3: Email 3 (Tracking compounds)
- Day 5: Email 4 (Early bird)
- Day 7: Email 5 (WTF method)
- Day 9: Email 6 (Method comparison)
- Day 12: Email 7 (Final ask)

---

## Cost Tracking

Add to `reports` table (optional):
```sql
ALTER TABLE reports ADD COLUMN cost_cents INTEGER DEFAULT 0;
```

Calculate:
- Transcription: $0.006/min = $0.003 per 30-sec = 0.3 cents
- Analysis: ~500 tokens @ $0.003/1K = 0.15 cents
- **Total:** ~0.5 cents per report

Store as `cost_cents: 50` (50 = $0.50)

Useful for ROI tracking later.

---

## Analytics Queries

**Conversion rate:**
```sql
SELECT 
  COUNT(*) as total_reports,
  COUNT(DISTINCT email) as unique_leads,
  (COUNT(DISTINCT email) / COUNT(*) * 100) as email_capture_rate
FROM reports
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY);
```

**Popular times:**
```sql
SELECT 
  HOUR(created_at) as hour,
  COUNT(*) as reports_generated
FROM reports
GROUP BY HOUR(created_at)
ORDER BY reports_generated DESC;
```

**View engagement:**
```sql
SELECT 
  COUNT(*) as total_reports,
  AVG(view_count) as avg_views,
  COUNT(CASE WHEN view_count = 0 THEN 1 END) as never_viewed
FROM reports;
```

---

## Implementation Priority

1. **Phase 1:** Just `reports` table + save logic
2. **Phase 2:** Add `GET /reports/:id` route
3. **Phase 3:** Email integration
4. **Phase 4:** `leads` table + funnel tracking
5. **Phase 5:** Analytics dashboard

Start simple. Scale as needed.
