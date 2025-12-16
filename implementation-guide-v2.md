# Call Lab Instant Recorder - Complete Implementation Guide

## Overview

This guide covers backend implementation for the Call Lab Instant Recorder, including:
1. Audio transcription with OpenAI Whisper
2. AI analysis with existing Call Lab logic
3. Database schema for saving reports
4. Permanent report URLs
5. Email delivery integration

---

## Architecture

**Flow:**
1. User records 30-sec audio in browser
2. Frontend sends audio to `POST /api/analyze-quick`
3. Backend transcribes → analyzes → **saves to database** → returns reportId + analysis
4. Frontend displays analysis
5. User enters email
6. Frontend sends email + reportId to `POST /api/capture-lead`
7. Backend sends Email 1 with permanent report link
8. Backend queues Emails 2-7 in Beehiiv

**Key Change from Original:** Reports are now saved with permanent URLs instead of being ephemeral.

---

## Database Schema

### `reports` Table

```sql
CREATE TABLE reports (
  id VARCHAR(12) PRIMARY KEY,              -- nanoid(10), e.g., 'V1StGXR8_Z'
  email VARCHAR(255),                      -- Set when user captures email
  audio_url TEXT,                          -- Optional S3 URL
  transcript TEXT NOT NULL,                
  analysis TEXT NOT NULL,                  -- JSON string
  score INTEGER NOT NULL,                  -- 1-10
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP,                     
  view_count INTEGER DEFAULT 0,            
  
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
);
```

**Analysis JSON Format:**
```json
{
  "score": 6,
  "summary": "You opened with...",
  "what_worked": ["Specific client reference", "Clear value prop"],
  "what_to_watch": ["Too much jargon", "Rushed the close"],
  "one_move": "Next time, slow down at 0:18 and let the value sink in before moving to pricing."
}
```

**See:** `database-schema.md` for full details and optional `leads` table.

---

## Required Backend Routes

### 1. POST /api/analyze-quick

**Purpose:** Transcribe audio, analyze, save to database, return results

**Request:**
```
Content-Type: multipart/form-data
Body:
  - audio: <audio blob> (webm or mp3)
  - duration: <number> (optional, for validation)
```

**Implementation:**

```javascript
// Using nanoid for short IDs
const { nanoid } = require('nanoid');

async function analyzeQuick(req, res) {
  try {
    const audioFile = req.files.audio; // however your framework handles uploads
    
    // Step 1: Transcribe with OpenAI Whisper
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
      filename: 'recording.webm',
      contentType: audioFile.mimetype
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    
    const transcriptResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!transcriptResponse.ok) {
      throw new Error('Whisper transcription failed');
    }
    
    const { text: transcript } = await transcriptResponse.json();
    
    // Step 2: Analyze with your existing Call Lab logic
    const analysisResult = await analyzeCallTranscript(transcript);
    // Returns: { score: 6, feedback: { summary, what_worked, what_to_watch, one_move } }
    
    // Step 3: Generate unique report ID
    const reportId = nanoid(10);
    
    // Step 4: Save to database
    await db.query(
      `INSERT INTO reports (id, transcript, analysis, score, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [
        reportId,
        transcript,
        JSON.stringify(analysisResult.feedback),
        analysisResult.score
      ]
    );
    
    // Step 5: Return results
    res.json({
      reportId: reportId,
      score: analysisResult.score,
      analysis: analysisResult.feedback
    });
    
  } catch (error) {
    console.error('Analyze quick error:', error);
    res.status(500).json({ 
      error: 'Analysis failed. Please try again.' 
    });
  }
}
```

**OpenAI Whisper Details:**
- Endpoint: `https://api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1`
- Cost: $0.006 per minute → **$0.003 per 30-second recording**
- Accepts: webm, mp3, mp4, mpeg, mpga, m4a, wav (max 25MB)
- Returns: Plain text transcript

**Error Handling:**
- Audio file too large → Return 400 with helpful message
- Whisper fails → Return 500, log error
- Database save fails → Return 500, log error (transcript already consumed cost)

---

### 2. POST /api/capture-lead

**Purpose:** Link email to report, send Email 1, queue drip sequence

**Request:**
```json
{
  "email": "tim@example.com",
  "reportId": "V1StGXR8_Z"
}
```

**Implementation:**

```javascript
async function captureLead(req, res) {
  try {
    const { email, reportId } = req.body;
    
    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    // Validate reportId exists
    const report = await db.query(
      'SELECT id FROM reports WHERE id = ?',
      [reportId]
    );
    
    if (!report || report.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Update report with email
    await db.query(
      'UPDATE reports SET email = ? WHERE id = ?',
      [email, reportId]
    );
    
    // Generate permanent URL
    const reportUrl = `https://app.timkilroy.com/reports/${reportId}`;
    
    // Send Email 1 (immediate delivery via transactional email)
    await sendEmail({
      to: email,
      subject: 'Your Call Lab Report + WTF Sales Guide',
      template: 'email_1_thank_you',
      variables: {
        reportUrl: reportUrl,
        wtfGuideUrl: 'https://timkilroy.com/wtf-sales-guide',
        upgradeUrl: 'https://timkilroy.com/call-lab'
      },
      attachments: [] // No PDF needed - guide is hosted page
    });
    
    // Add to Beehiiv for drip sequence (Emails 2-7)
    await addToBeehiiv({
      email: email,
      tags: ['call-lab-user', 'report-generated'],
      customFields: {
        reportUrl: reportUrl
      }
    });
    
    res.json({
      success: true,
      reportUrl: reportUrl
    });
    
  } catch (error) {
    console.error('Capture lead error:', error);
    res.status(500).json({ 
      error: 'Failed to save email. Please try again.' 
    });
  }
}
```

**Email Integration:**
- Use transactional email service (SendGrid, Postmark, etc.)
- Template: `email_1_thank_you.html` (provided)
- No attachments needed - WTF Guide is hosted page
- Link directly to `timkilroy.com/wtf-sales-guide`

**Beehiiv Integration:**
- Add subscriber via API
- Tag: `call-lab-user` triggers drip automation
- Store `reportUrl` in custom field for email personalization

---

### 3. GET /reports/:reportId (NEW ROUTE)

**Purpose:** Display permanent, shareable report page

**Request:**
```
GET /reports/V1StGXR8_Z
```

**Implementation:**

```javascript
async function getReport(req, res) {
  const { reportId } = req.params;
  
  try {
    // Fetch report from database
    const report = await db.query(
      `SELECT id, transcript, analysis, score, created_at, email 
       FROM reports WHERE id = ?`,
      [reportId]
    );
    
    if (!report || report.length === 0) {
      return res.status(404).send('Report not found');
    }
    
    const reportData = report[0];
    
    // Track view
    await db.query(
      `UPDATE reports 
       SET view_count = view_count + 1,
           viewed_at = COALESCE(viewed_at, NOW())
       WHERE id = ?`,
      [reportId]
    );
    
    // Parse analysis JSON
    const analysis = JSON.parse(reportData.analysis);
    
    // Render HTML template
    res.send(renderReportTemplate({
      reportId: reportData.id,
      score: reportData.score,
      summary: analysis.summary,
      whatWorked: analysis.what_worked,
      whatToWatch: analysis.what_to_watch,
      oneMove: analysis.one_move,
      createdAt: reportData.created_at,
      upgradeUrl: 'https://timkilroy.com/call-lab',
      tryAgainUrl: 'https://timkilroy.com/call-lab-instant'
    }));
    
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).send('Error loading report');
  }
}
```

**Report Template Features:**
- Display score prominently
- Show all analysis sections
- CTA: "Upgrade to Call Lab Pro" 
- CTA: "Analyze Another Call"
- Optional: Social share buttons
- Footer: Tim Kilroy branding

**Template:** Create based on current analysis display in `quick-analyze-app.html` but as standalone page.

---

## Frontend Updates Required

### In `quick-analyze-app.html`:

**1. Update API call to save reportId:**

```javascript
// After successful analysis
const response = await fetch('/api/analyze-quick', {
  method: 'POST',
  body: formData
});

const data = await response.json();

// Store reportId for later email capture
window.currentReportId = data.reportId;

// Display results as before
displayAnalysis(data.score, data.analysis);
```

**2. Update email capture to include reportId:**

```javascript
emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value;
  
  try {
    const response = await fetch('/api/capture-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        reportId: window.currentReportId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show success message with report URL
      showSuccess(`Check your email! Your report: ${data.reportUrl}`);
    }
  } catch (err) {
    showError('Failed to save email. Please try again.');
  }
});
```

---

## Cost Analysis

**Per 30-Second Recording:**
- Whisper transcription: $0.003
- GPT-4 analysis: ~$0.0015 (500 tokens @ $0.003/1K)
- **Total:** ~$0.0045 per report

**Per 1,000 Newsletter Readers:**
- Assume 10% conversion (100 recordings)
- Cost: 100 × $0.0045 = **$0.45**

**ROI:**
- If 1 person upgrades to Pro ($19/mo)
- $19 / $0.45 = **42x ROI** on first month

---

## Testing Checklist

### Backend Tests

- [ ] POST /api/analyze-quick with valid audio → returns reportId + analysis
- [ ] POST /api/analyze-quick with invalid audio → returns 400 error
- [ ] POST /api/analyze-quick saves to database correctly
- [ ] POST /api/capture-lead with valid email + reportId → sends email
- [ ] POST /api/capture-lead with invalid reportId → returns 404
- [ ] GET /reports/:reportId displays saved report
- [ ] GET /reports/invalid-id → returns 404
- [ ] View count increments on each page load

### Frontend Tests

- [ ] Record 30 seconds → see analysis display
- [ ] Submit email → see success message
- [ ] Check email → receive Email 1 with links
- [ ] Click report link → see permanent report page
- [ ] Click "Upgrade to Pro" → goes to /call-lab

### Integration Tests

- [ ] Record → analyze → capture email → receive email → view report (full flow)
- [ ] Multiple reports from same email → all reports saved
- [ ] Report URLs shareable → work when opened by different user
- [ ] Beehiiv receives subscriber with correct tags

---

## Deployment Steps

### Phase 1: Database Setup
1. Run migration to create `reports` table
2. Test INSERT and SELECT queries
3. Verify indexes created

### Phase 2: API Endpoints
1. Deploy `POST /api/analyze-quick` with database saving
2. Deploy `POST /api/capture-lead` with email sending
3. Deploy `GET /reports/:reportId`
4. Test all endpoints in staging

### Phase 3: Frontend
1. Deploy updated `quick-analyze-app.html` to `app.timkilroy.com/quick-analyze`
2. Deploy landing page to `timkilroy.com/call-lab-instant`
3. Deploy WTF Guide page to `timkilroy.com/wtf-sales-guide`

### Phase 4: Email Setup
1. Configure transactional email service
2. Upload `email_1_thank_you.html` template
3. Test email delivery
4. Set up Beehiiv automation for Emails 2-7

### Phase 5: Newsletter Integration
1. Update newsletter link to point to `timkilroy.com/call-lab-instant`
2. Send test blast to small segment (500 people)
3. Monitor: time on page, email conversion rate, recording completion
4. Scale to full list once validated

---

## Monitoring & Analytics

**Key Metrics to Track:**

1. **Conversion Funnel:**
   - Newsletter clicks → Landing page views
   - Landing page views → Recordings started
   - Recordings started → Recordings completed
   - Recordings completed → Email captured
   - Email captured → Report viewed
   - Report viewed → Pro upgrade

2. **Database Queries:**
```sql
-- Daily report generation
SELECT DATE(created_at) as date, COUNT(*) as reports
FROM reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Email capture rate
SELECT 
  COUNT(*) as total_reports,
  COUNT(email) as emails_captured,
  (COUNT(email) / COUNT(*) * 100) as capture_rate
FROM reports;

-- Report engagement
SELECT 
  AVG(view_count) as avg_views,
  COUNT(CASE WHEN view_count = 0 THEN 1 END) as never_viewed,
  COUNT(CASE WHEN view_count >= 3 THEN 1 END) as highly_engaged
FROM reports;
```

3. **Cost Tracking:**
   - Monitor OpenAI API usage
   - Calculate cost per lead
   - Track ROI on newsletter blast

---

## Security Considerations

1. **Rate Limiting:**
   - Limit recordings per IP: 5 per hour
   - Prevents abuse and cost overruns

2. **Input Validation:**
   - Validate audio file size (max 5MB)
   - Validate email format
   - Sanitize reportId for SQL injection

3. **Database:**
   - Use parameterized queries (shown in examples)
   - Don't expose raw database errors to users

4. **CORS:**
   - Allow requests from `app.timkilroy.com` and `timkilroy.com` only

---

## Support & Troubleshooting

**Common Issues:**

1. **Whisper transcription fails**
   - Check audio format is supported
   - Verify file size < 25MB
   - Check OpenAI API key is valid

2. **Analysis returns low-quality results**
   - Audio too quiet → prompt user to speak louder
   - Background noise → recommend quiet environment
   - Non-English → specify language parameter

3. **Email not delivered**
   - Check spam folder
   - Verify transactional email service configured
   - Check email template variables populated

4. **Report not found**
   - Verify reportId saved to database
   - Check database connection
   - Verify URL format correct

---

## Next Steps

After successful deployment:

1. **A/B Test:** Try different CTA copy on email capture
2. **Optimize:** Improve analysis prompt based on user feedback
3. **Expand:** Add more scenario types beyond the 4 current ones
4. **Scale:** If newsletter blast converts well, build full Call Lab Pro product

---

## Files Provided

- `quick-analyze-app.html` - Recorder app page
- `call-lab-instant-landing.html` - Marketing landing page
- `wtf-sales-guide-page.html` - Public WTF Sales Method page
- `email_1_thank_you.html` - Email template
- `database-schema.md` - Full database schema details
- `implementation-guide.md` - This file

---

**Questions?** Re-read this guide. Everything you need is here.

**Ready to deploy?** Follow the deployment steps in order. Test each phase before moving to the next.

**Good luck.** 🚀
