# Call Lab API Response Format with WTF Method Scores

## POST /api/analyze-quick Response

The backend should return JSON with these fields:

```json
{
  "reportId": "V1StGXR8_Z",
  "score": 7,
  "transcript": "Raw transcript text here...",
  "analysis": "<formatted HTML here>"
}
```

---

## Analysis HTML Format

The `analysis` field should be formatted HTML that includes:

1. **WTF Method Scores** (prominent, first)
2. **Standard Call Lab Scores** (below WTF scores)
3. **Detailed Feedback** (narrative)
4. **Action Items** (specific improvements)

### Full HTML Template:

```html
<!-- WTF METHOD ASSESSMENT (PROMINENT) -->
<div style="margin: 0 0 40px 0; padding: 30px; background: #1a1a1a; border-left: 4px solid #E51B23; border-radius: 4px;">
    <h3 style="color: #E51B23; font-family: 'Anton', sans-serif; font-size: 20px; margin: 0 0 20px 0; letter-spacing: 1px;">
        WTF SALES METHOD ASSESSMENT
    </h3>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">
        
        <!-- Radical Relevance -->
        <div>
            <div style="font-size: 36px; font-weight: bold; color: #E51B23; margin-bottom: 5px;">
                8/10
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 8px;">
                Radical Relevance
            </div>
            <div style="font-size: 13px; color: #999; line-height: 1.4;">
                You are connecting to the prospect's world but could use their exact words more frequently
            </div>
        </div>
        
        <!-- Diagnostic Generosity -->
        <div>
            <div style="font-size: 36px; font-weight: bold; color: #E51B23; margin-bottom: 5px;">
                5/10
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 8px;">
                Diagnostic Generosity
            </div>
            <div style="font-size: 13px; color: #999; line-height: 1.4;">
                You are asking good questions but not sharing frameworks or insights freely
            </div>
        </div>
        
        <!-- Permission-Based Progression -->
        <div>
            <div style="font-size: 36px; font-weight: bold; color: #E51B23; margin-bottom: 5px;">
                9/10
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 8px;">
                Permission-Based Progression
            </div>
            <div style="font-size: 13px; color: #999; line-height: 1.4;">
                Excellent permission-asking throughout. Prospect feels in control
            </div>
        </div>
    </div>
    
    <!-- WTF Overall Assessment -->
    <div style="padding: 15px; background: #111; border-radius: 4px;">
        <div style="font-size: 14px; color: #ccc; line-height: 1.6;">
            <strong>Overall:</strong> You are building trust through permission-based selling, but missing the opportunity to teach. Your biggest leverage point is Diagnostic Generosity - share one framework or model unprompted in the next 5 minutes of this call.
        </div>
    </div>
</div>

<!-- TECHNICAL SCORES -->
<div style="margin: 0 0 30px 0;">
    <h4 style="color: #fff; font-size: 16px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
        Technical Scores
    </h4>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
        <div style="padding: 15px; background: #1a1a1a; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #FFDE59;">43:57</div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">Talk Ratio</div>
        </div>
        <div style="padding: 15px; background: #1a1a1a; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #FFDE59;">6/10</div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">Question Quality</div>
        </div>
        <div style="padding: 15px; background: #1a1a1a; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #FFDE59;">7/10</div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">Active Listening</div>
        </div>
    </div>
</div>

<!-- DETAILED FEEDBACK -->
<div style="margin: 0 0 25px 0;">
    <h4 style="color: #fff; font-size: 16px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
        What You Did Well
    </h4>
    <ul style="margin: 0; padding-left: 20px; color: #ccc; line-height: 1.6;">
        <li>Strong permission-asking before moving into pricing discussion</li>
        <li>Good use of prospect's company name and specific situation</li>
        <li>Let them talk more than you - solid talk ratio</li>
    </ul>
</div>

<div style="margin: 0 0 25px 0;">
    <h4 style="color: #fff; font-size: 16px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
        Opportunities to Improve
    </h4>
    <ul style="margin: 0; padding-left: 20px; color: #ccc; line-height: 1.6;">
        <li><strong>Share a framework unprompted.</strong> When they mentioned client retention issues, you could have taught them the "3 Stages of Client Lifecycle" model right there - no strings attached.</li>
        <li><strong>Echo their exact words.</strong> They said "bleeding clients in Q4" - use that exact phrase back to them instead of your sanitized version.</li>
        <li>Ask deeper follow-up questions. Several times you got interesting answers but moved on too quickly.</li>
    </ul>
</div>

<!-- ACTION ITEMS -->
<div style="padding: 20px; background: #1a1a1a; border-left: 3px solid #FFDE59; border-radius: 4px;">
    <h4 style="color: #FFDE59; font-size: 16px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
        Your Next Call: Do This
    </h4>
    <ol style="margin: 0; padding-left: 20px; color: #ccc; line-height: 1.8;">
        <li><strong>In the first 10 minutes:</strong> Share one complete framework or model unprompted. "Let me show you how we think about..."</li>
        <li><strong>When they share a problem:</strong> Use their exact words when you reference it later. Write down their phrases.</li>
        <li><strong>Before any transition:</strong> Ask explicit permission. "Would it make sense to..." not "Let me show you..."</li>
    </ol>
</div>
```

---

## Extracting WTF Scores from GPT Response

The GPT analysis should return structured data. Parse this into the HTML above.

**Expected GPT Output Structure:**

```
RADICAL RELEVANCE SCORE: 8/10
Evidence: "You referenced their Q4 client retention problem and connected it to your solution"
How to improve: Use their exact phrase "bleeding clients" instead of generic "retention issues"

DIAGNOSTIC GENEROSITY SCORE: 5/10
Evidence: "Asked good discovery questions but did not share any frameworks or models"
How to improve: When they mention a challenge, teach them a framework unprompted - show the 3-stage model right there

PERMISSION-BASED PROGRESSION SCORE: 9/10
Evidence: "Would it make sense to walk through..." and "Are you comfortable if I..." throughout
How to improve: Already excellent, keep doing this

WTF METHOD OVERALL: You are building trust through permission-asking but missing the teaching opportunity...

[Then standard scores...]
TALK RATIO: 43:57 (You: 43%, Them: 57%)
QUESTION QUALITY: 6/10
ACTIVE LISTENING: 7/10
...
```

---

## Backend Processing Steps

1. **Get GPT analysis** with WTF scoring prompt
2. **Parse scores** using regex or structured extraction:
   - `radicalRelevance: 8`
   - `radicalRelevanceNote: "You are connecting..."`
   - `diagnosticGenerosity: 5`
   - etc.
3. **Format HTML** using template above
4. **Return JSON** with analysis as formatted HTML string

---

## Save to Database

The `analysis` field in the database should store the **raw GPT response** as JSON, not the HTML:

```json
{
  "score": 7,
  "wtf": {
    "radicalRelevance": 8,
    "radicalRelevanceNote": "You are connecting to...",
    "radicalRelevanceEvidence": "You referenced their Q4...",
    "radicalRelevanceImprove": "Use their exact phrase...",
    "diagnosticGenerosity": 5,
    "diagnosticGenerosityNote": "...",
    "permissionProgression": 9,
    "permissionProgressionNote": "...",
    "overall": "You are building trust..."
  },
  "technical": {
    "talkRatio": "43:57",
    "questionQuality": 6,
    "activeListening": 7
  },
  "strengths": ["Strong permission-asking...", "..."],
  "opportunities": ["Share a framework...", "..."],
  "actions": ["In the first 10 minutes...", "..."]
}
```

Then format this JSON into HTML when:
- Returning from /api/analyze-quick
- Serving GET /reports/:reportId
- Generating email content

This allows future changes to HTML template without re-analyzing calls.

---

## Why This Design

- **WTF scores are prominent** (first thing user sees)
- **Reinforces Tim's methodology** (connects free tool to brand)
- **Differentiation** (no other tool measures trust-building)
- **Upgrades naturally** ("Track WTF scores over time in Pro")
- **Education** (teaches WTF Method through the scores)

---

## Cost Impact

**Minimal.** Adding WTF scoring to prompt adds ~200 tokens but provides massive value differentiation. Still under $0.005 per analysis.
