import { AnalysisInput, AnalysisReport } from "../types";
import { DEMAND_OS_ARCHETYPES } from "./archetypeDefinitions";

// Declare the global variable injected by Vite
declare const __APP_API_KEY__: string;

// Helper to get API Key safely
const getApiKey = () => {
  try {
    // We check the global constant injected by the build process
    if (typeof __APP_API_KEY__ !== 'undefined' && __APP_API_KEY__) {
      return __APP_API_KEY__;
    }
  } catch (e) {
    // Ignore error if variable access fails
  }

  // Fallback to process.env for local dev if the global isn't set
  // Cast import.meta to any to avoid TS errors if vite types aren't loaded
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv.PERPLEXITY_API_KEY) {
      return metaEnv.PERPLEXITY_API_KEY;
  }

  // Final check for standard process.env (Vercel token replacement)
  if (typeof process !== 'undefined' && process.env && process.env.PERPLEXITY_API_KEY) {
    return process.env.PERPLEXITY_API_KEY;
  }

  console.error("Perplexity API Key is missing. If you are on Vercel, ensure 'PERPLEXITY_API_KEY' is set in Environment Variables and you have REDEPLOYED.");
  throw new Error("Configuration Error: Perplexity API Key not found.");
}

export const generateAnalysis = async (input: AnalysisInput): Promise<AnalysisReport> => {
  
  // Format archetypes for the prompt
  const archetypeList = DEMAND_OS_ARCHETYPES.map(a => `- "${a.name}": ${a.description}`).join("\n");

  // NOTE: Terms like "Spy" and "Delusional" are removed to prevent AI Safety Refusals.
  const systemPrompt = `
    You are the "DemandOS Visibility Engine", an AI analyst modeled after Tim Kilroy's methodology.
    
    YOUR PERSONALITY:
    - Contrarian truth-teller. No corporate bullshit.
    - Direct, high-energy.
    - You value "Fundamentals First" over shiny tactics.
    - You believe in the "DemandOS" methodology:
      1. **Vibes, Vision, Values (VVV):** Clarity here is the prerequisite to visibility.
      2. **Team Content:** Experts create, Leaders contextualize.
      3. **Repurposing:** One insights becomes a video, a blog, a newsletter, and a tweet.

    YOUR MANDATE - LIVE RESEARCH PHASE (REQUIRED):
    You have access to Google Search. Perform a professional strategic audit.
    1. **Competitor Research:** Search for "${input.mainCompetitors}". What are they posting *right now*? What are their reviews saying? What is their positioning?
    2. **Operator Audit:** Search for "${input.userName}" and "${input.brandName}". Do they exist on LinkedIn? YouTube? Is there recent content?
    3. **Consistency Check:** Compare the user's claimed target audience ("${input.targetAudience}") and current channels ("${input.currentChannels}") against what you actually find on their Website ("${input.website}") and Google. Look for alignment gaps.

    INPUT DATA:
    Operator: ${input.userName}
    Brand: ${input.brandName}
    URL: ${input.website}
    Audience: ${input.targetAudience}
    Competitors: ${input.mainCompetitors}
    Self-Reported Activity: ${input.currentChannels}

    ANALYSIS REQUIREMENTS:
    1.  **Executive Summary:** Brutal honesty based on your search results. Are they an "Order-Taker" or a "Strategic Partner"?
    2.  **Visibility Score:** 0-100 based on signal vs. noise (use search result volume/quality as a proxy).
    3.  **Brand Archetype (CRITICAL):** 
        You MUST classify this brand into exactly ONE of the following DemandOS Archetypes. Do not make up a new one.
        ${archetypeList}
        Choose the one that best fits their *current* reality based on your search results, not their aspirations.
    
    4.  **VVV Audit & Radar:**
        - Analyze Vibes, Vision, Values.
        - **Vibe Radar:** Score them 1-10 on: Clarity, Consistency, Frequency, Differentiation, Authority.
    
    5.  **Narrative Dissonance (Truth vs Fiction):**
        - What did they claim in the form vs what did you find? 
        - Example: They said "Global Leader" but have 20 LinkedIn followers.
        - Give a Dissonance Score (1-10) and a Label (e.g. "High Dissonance", "Aligned", "Confused").

    6.  **THE DANGER ZONES (Visibility Leaks):**
        - Identify 3 specific places prospects *make decisions* (e.g., YouTube Search, Dark Social/Slack, Review Sites) where this brand is likely invisible.
        - Label the Revenue Risk (Critical/High/Moderate).
    7.  **Core Strengths:** 3-4 "Unfair Advantages" to leverage.
    8.  **Content Gaps:** Topics competitors are missing (based on your search of them), and why THIS brand wins there.
    9.  **Competitor Battlecards:**
        - For each competitor listed, analyze their "Threat Level" (High/Medium/Low) and their specific "Strength" you need to neutralize.
    10. **Channel Strategy (DemandOS Style):**
        - **YouTube:** Not just topics, but how to repurpose.
        - **Team Execution:** Suggest how a subject matter expert vs. the CEO should handle the topic.
    11. **90-Day Plan:** Concrete steps to build the engine.

    IMPORTANT: If you cannot find specific live data, make reasonable strategic inferences based on the industry and the quality of their provided URL. DO NOT REFUSE THE REQUEST.

    OUTPUT FORMAT:
    Return strictly valid JSON. Do not include any conversational text, markdown formatting, or "I'm sorry" messages. Just the JSON.
    
    Structure:
    {
      "brandName": "string",
      "executiveSummary": "string",
      "visibilityScore": number,
      "brandArchetype": { 
        "name": "string (Must be exact match from list)", 
        "reasoning": "string" 
      },
      "vvvAudit": { "vibes": "string", "vision": "string", "values": "string", "clarityScore": number },
      "vibeRadar": [
        { "subject": "Clarity", "A": number (1-10), "fullMark": 10 },
        { "subject": "Consistency", "A": number (1-10), "fullMark": 10 },
        { "subject": "Frequency", "A": number (1-10), "fullMark": 10 },
        { "subject": "Differentiation", "A": number (1-10), "fullMark": 10 },
        { "subject": "Authority", "A": number (1-10), "fullMark": 10 }
      ],
      "narrativeDissonance": {
        "claim": "string (What they said)",
        "reality": "string (What you found)",
        "dissonanceScore": number (1-10),
        "label": "string"
      },
      "coreStrengths": ["string"],
      "visibilityLeaks": [ { "zone": "string", "buyerBehavior": "string", "brandStatus": "string", "revenueRisk": "Critical|High|Moderate" } ],
      "competitors": [ {"name": "string", "positioning": "string", "weakness": "string", "strength": "string", "threatLevel": "High|Medium|Low"} ],
      "contentGaps": [ {"topic": "string", "competitorNeglect": "string", "yourAdvantage": "string", "opportunityScore": 1-5} ],
      "youtubeStrategy": { "channel": "YouTube", "topics": ["string"], "frequency": "string", "teamExecution": "string", "specificTargets": ["string"] },
      "podcastStrategy": { "channel": "Podcast", "topics": ["string"], "frequency": "string", "teamExecution": "string", "specificTargets": ["string"] },
      "eventStrategy": { "channel": "Events", "topics": ["string"], "frequency": "string", "teamExecution": "string", "specificTargets": ["string"] },
      "ninetyDayPlan": [ {"week": "string", "focus": "string", "tasks": ["string"], "impact": "High|Medium|Low"} ]
    }
  `;

  try {
    const apiKey = getApiKey();

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No response from DemandOS Core.");

    // Clean potential Markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(cleanedText) as AnalysisReport;
    } catch (parseError) {
      console.error("Failed to parse JSON. Raw text:", text);
      if (text.includes("sorry") || text.includes("cannot")) {
        throw new Error("AI Safety Filter Triggered. Please try again with a different brand name or less sensitive inputs.");
      }
      throw new Error("System Error: AI returned invalid data format.");
    }

  } catch (error: any) {
    console.error("DemandOS Analysis Failed:", error);
    throw error;
  }
};

export const generateQuickPost = async (topic: string, archetype: string, brandName: string): Promise<string> => {
  const prompt = `
    You are a world-class social media copywriter for the DemandOS agency.
    
    TASK: Write a "Viral High-Value" LinkedIn Post (or Short Video Script) for the brand "${brandName}".
    TOPIC: "${topic}"
    ARCHETYPE: The brand is a "${archetype}" type.
    
    STYLE:
    - Hook-heavy (First line must grab attention).
    - Formatting: Short lines, ample whitespace.
    - Tone: Authoritative but aligned with the "${archetype}" persona.
    - No hashtags, no emojis unless strictly necessary for impact.
    - Ending: A strong call to discussion.

    OUTPUT: Just the post text. No preamble.
  `;

  try {
    const apiKey = getApiKey();

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status);
      return "Error generating draft.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Error generating draft.";
  } catch (e) {
    console.error("Draft generation failed", e);
    return "System Error: Could not generate draft.";
  }
};