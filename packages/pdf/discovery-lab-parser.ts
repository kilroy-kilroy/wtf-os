/**
 * Discovery Lab Markdown Parser
 * Extracts structured data from Discovery Lab markdown reports
 */

import type {
  DiscoveryLabReportData,
  ProbeData,
  HookData,
  CompetitorData,
  FlowStepData,
} from './discovery-lab-html-report';

/**
 * Parse Discovery Lab markdown into structured data
 */
export function parseDiscoveryLabMarkdown(markdown: string): DiscoveryLabReportData {
  const data: DiscoveryLabReportData = {
    date: new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }),
    requestor_name: '',
    requestor_company: '',
    target_company: '',
    target_website: '',
    target_contact: '',
    target_title: '',
    service_reframed: '',
    authority_line: '',
    probes: [],
    hooks: [],
    competitors: [],
    emotional_probe: '',
    flow_steps: [],
    call_objective: '',
  };

  // Extract Authority Snapshot section
  const authorityMatch = markdown.match(
    /(?:🎯\s*)?Authority Snapshot\s*([\s\S]+?)(?=(?:🔍|##\s*Pain|$))/i
  );
  if (authorityMatch) {
    const authorityText = authorityMatch[1];

    // Extract service
    const serviceMatch = authorityText.match(
      /\*?\*?Your Service:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i
    );
    if (serviceMatch) {
      data.service_reframed = serviceMatch[1].trim();
    }

    // Extract target company
    const targetMatch = authorityText.match(
      /\*?\*?Target Company:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i
    );
    if (targetMatch) {
      const targetParts = targetMatch[1].trim();
      // Try to extract URL if present
      const urlMatch = targetParts.match(/(.+?)\s+(https?:\/\/\S+)/);
      if (urlMatch) {
        data.target_company = urlMatch[1].trim();
        data.target_website = urlMatch[2].trim();
      } else {
        data.target_company = targetParts;
      }
    }

    // Extract contact
    const contactMatch = authorityText.match(
      /\*?\*?Contact:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i
    );
    if (contactMatch) {
      const contactParts = contactMatch[1].trim();
      // Try to split name and title
      const nameTitleMatch = contactParts.match(/(.+?)\s*[-–]\s*(.+)/);
      if (nameTitleMatch) {
        data.target_contact = nameTitleMatch[1].trim();
        data.target_title = nameTitleMatch[2].trim();
      } else {
        data.target_contact = contactParts;
      }
    }

    // Extract authority line
    const authorityLineMatch = authorityText.match(
      /\*?\*?Authority Line:?\*?\*?\s*:?\s*([\s\S]+?)(?=\n\n|$)/i
    );
    if (authorityLineMatch) {
      data.authority_line = authorityLineMatch[1].trim();
    }
  }

  // Extract Pain / Impact Probes
  const probesMatch = markdown.match(
    /(?:🔍\s*)?Pain\s*\/?\s*Impact Probes?\s*\(?\d*\)?\s*([\s\S]+?)(?=(?:🎣|##\s*Market|$))/i
  );
  if (probesMatch) {
    data.probes = extractProbes(probesMatch[1]);
  }

  // Extract Market & Competitor Hooks
  const hooksMatch = markdown.match(
    /(?:🎣\s*)?Market\s*&?\s*Competitor Hooks?\s*\(?\d*-?\d*\)?\s*([\s\S]+?)(?=(?:🥊|##\s*Competitor Set|$))/i
  );
  if (hooksMatch) {
    data.hooks = extractHooks(hooksMatch[1]);
  }

  // Extract Competitor Set
  const competitorsMatch = markdown.match(
    /(?:🥊\s*)?Competitor Set\s*\(?\w*\s*\d*\)?\s*([\s\S]+?)(?=(?:❤️|##\s*Emotional|$))/i
  );
  if (competitorsMatch) {
    data.competitors = extractCompetitors(competitorsMatch[1]);
  }

  // Extract Emotional / Identity Probe
  const emotionalMatch = markdown.match(
    /(?:❤️\s*)?Emotional\s*\/?\s*Identity Probe\s*([\s\S]+?)(?=(?:⚡|##\s*Quick Discovery|$))/i
  );
  if (emotionalMatch) {
    // Extract the quoted question
    const quoteMatch = emotionalMatch[1].match(/[""]([^""]+)[""]/);
    if (quoteMatch) {
      data.emotional_probe = quoteMatch[1].trim();
    } else {
      data.emotional_probe = emotionalMatch[1].trim();
    }
  }

  // Extract Quick Discovery Flow
  const flowMatch = markdown.match(
    /(?:⚡\s*)?Quick Discovery Flow\s*\(?\d*\s*Steps?\)?\s*([\s\S]+?)(?=(?:👉|##\s*Call Objective|$))/i
  );
  if (flowMatch) {
    data.flow_steps = extractFlowSteps(flowMatch[1]);
  }

  // Extract Call Objective
  const objectiveMatch = markdown.match(
    /(?:👉\s*)?Call Objective\s*([\s\S]+?)(?=(?:🚀|##\s*UPGRADE|$))/i
  );
  if (objectiveMatch) {
    data.call_objective = objectiveMatch[1]
      .trim()
      .replace(/^You win this call when\s*/i, 'You win this call when ');
  }

  return data;
}

/**
 * Extract probe data from section text
 */
function extractProbes(text: string): ProbeData[] {
  const probes: ProbeData[] = [];

  // Match numbered probes with tags
  const probeRegex =
    /(\d+)\.\s*\*?\*?\[?(Primary|Secondary)\]?\*?\*?\s*(.+?)(?:→|->|Follow-?up:?)\s*(.+?)(?=\n\d+\.|$)/gis;

  let match;
  while ((match = probeRegex.exec(text)) !== null) {
    probes.push({
      tag: match[2].toUpperCase(),
      question: match[3].trim().replace(/^\*\*|\*\*$/g, ''),
      followup: match[4].trim(),
    });
  }

  // Fallback: try simpler pattern
  if (probes.length === 0) {
    const simpleRegex =
      /\[?(PRIMARY|SECONDARY)\]?\s*(.+?)(?:→|->)\s*(.+?)(?=\[|$)/gis;
    while ((match = simpleRegex.exec(text)) !== null) {
      probes.push({
        tag: match[1].toUpperCase(),
        question: match[2].trim(),
        followup: match[3].trim(),
      });
    }
  }

  return probes;
}

/**
 * Extract hook data from section text
 */
function extractHooks(text: string): HookData[] {
  const hooks: HookData[] = [];

  // Match hooks with bold names
  const hookRegex = /\*\*(.+?)\*\*\s*(.+?)(?=\*\*|$)/gs;

  let match;
  while ((match = hookRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const description = match[2].trim();

    if (name && description) {
      hooks.push({ name, description });
    }
  }

  // Fallback: try bullet points
  if (hooks.length === 0) {
    const bulletRegex = /[-•]\s*(?:Hook \d+:?\s*)?(.+?)[-–:]\s*(.+?)(?=\n[-•]|$)/gs;
    while ((match = bulletRegex.exec(text)) !== null) {
      hooks.push({
        name: match[1].trim(),
        description: match[2].trim(),
      });
    }
  }

  return hooks;
}

/**
 * Extract competitor data from section text
 */
function extractCompetitors(text: string): CompetitorData[] {
  const competitors: CompetitorData[] = [];

  // Match competitor entries
  const competitorRegex =
    /[-•]\s*(?:\*\*)?([^*\n—-]+?)(?:\*\*)?\s*[-–—]\s*(.+?)(?=\n[-•]|$)/gs;

  let match;
  while ((match = competitorRegex.exec(text)) !== null) {
    competitors.push({
      name: match[1].trim(),
      why: match[2].trim(),
    });
  }

  // Fallback: try simpler format
  if (competitors.length === 0) {
    const lines = text.split('\n').filter((l) => l.trim());
    for (const line of lines) {
      const parts = line.match(/^[-•]?\s*(.+?)[-–—:]\s*(.+)$/);
      if (parts) {
        competitors.push({
          name: parts[1].trim().replace(/^\*\*|\*\*$/g, ''),
          why: parts[2].trim(),
        });
      }
    }
  }

  return competitors;
}

/**
 * Extract flow steps from section text
 */
function extractFlowSteps(text: string): FlowStepData[] {
  const steps: FlowStepData[] = [];

  // Match numbered steps with bold titles
  const stepRegex =
    /(\d+)\.\s*\*\*(.+?)\*\*\s*(?:[""](.+?)[""]|(.+?))(?=\n\d+\.|$)/gs;

  let match;
  while ((match = stepRegex.exec(text)) !== null) {
    steps.push({
      title: match[2].trim(),
      script: (match[3] || match[4] || '').trim(),
    });
  }

  // Fallback: try simpler pattern
  if (steps.length === 0) {
    const simpleRegex = /\d+\.\s*(.+?)\s*[""](.+?)[""]/gs;
    while ((match = simpleRegex.exec(text)) !== null) {
      steps.push({
        title: match[1].trim(),
        script: match[2].trim(),
      });
    }
  }

  return steps;
}

/**
 * Check if markdown is a Discovery Lab report
 */
export function isDiscoveryLabMarkdown(markdown: string): boolean {
  return (
    markdown.includes('DISCOVERY LAB') ||
    markdown.includes('Discovery Lab') ||
    markdown.includes('Authority Snapshot') ||
    markdown.includes('Pain / Impact Probes') ||
    markdown.includes('Quick Discovery Flow')
  );
}

/**
 * Check if markdown is a Discovery Lab Pro report
 */
export function isDiscoveryLabProMarkdown(markdown: string): boolean {
  return (
    isDiscoveryLabMarkdown(markdown) &&
    (markdown.includes('DISCOVERY LAB PRO') ||
      markdown.includes('Discovery Lab Pro') ||
      markdown.includes('Executive Summary') ||
      markdown.includes('Prospect Psychology') ||
      markdown.includes('Conversation Decision Tree') ||
      markdown.includes("What They'll Google") ||
      markdown.includes('Opening 60 Seconds'))
  );
}
