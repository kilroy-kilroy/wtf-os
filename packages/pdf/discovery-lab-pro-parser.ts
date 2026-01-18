/**
 * Discovery Lab Pro Markdown Parser
 * Extracts structured data from Discovery Lab Pro markdown reports
 */

import type {
  DiscoveryLabProReportData,
  ProbeData,
  HookData,
  CompetitorProData,
  FlowStepData,
  DecisionBranchData,
  GoogleItemData,
  OpeningPartData,
  ActionData,
} from './discovery-lab-pro-html-report';

/**
 * Parse Discovery Lab Pro markdown into structured data
 */
export function parseDiscoveryLabProMarkdown(markdown: string): DiscoveryLabProReportData {
  const data: DiscoveryLabProReportData = {
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
    executive_summary: '',
    service_reframed: '',
    recent_signals: '',
    authority_line: '',
    psychology_success: '',
    psychology_fears: '',
    psychology_need: '',
    psychology_yes: '',
    primary_probes: [],
    secondary_probes: [],
    hooks: [],
    competitors: [],
    emotional_probe: '',
    flow_steps: [],
    decision_branches: [],
    google_items: [],
    opening_parts: [],
    primary_objective: '',
    secondary_objective: '',
    red_flags: '',
    green_lights: '',
    actions: [],
  };

  // Extract Executive Summary
  const execMatch = markdown.match(
    /(?:📊\s*)?Executive Summary\s*\(?PRO\)?\s*([\s\S]+?)(?=(?:🎯|##\s*Authority|$))/i
  );
  if (execMatch) {
    data.executive_summary = execMatch[1].trim();
  }

  // Extract Authority Snapshot
  const authorityMatch = markdown.match(
    /(?:🎯\s*)?Authority Snapshot\s*([\s\S]+?)(?=(?:🧠|##\s*Prospect Psychology|$))/i
  );
  if (authorityMatch) {
    const authorityText = authorityMatch[1];

    const serviceMatch = authorityText.match(/\*?\*?Your Service:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (serviceMatch) data.service_reframed = serviceMatch[1].trim();

    const targetMatch = authorityText.match(/\*?\*?Target Company:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (targetMatch) {
      const targetParts = targetMatch[1].trim();
      const urlMatch = targetParts.match(/(.+?)\s+(https?:\/\/\S+)/);
      if (urlMatch) {
        data.target_company = urlMatch[1].trim();
        data.target_website = urlMatch[2].trim();
      } else {
        data.target_company = targetParts;
      }
    }

    const contactMatch = authorityText.match(/\*?\*?Contact:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (contactMatch) {
      const contactParts = contactMatch[1].trim();
      const nameTitleMatch = contactParts.match(/(.+?)\s*[-–]\s*(.+)/);
      if (nameTitleMatch) {
        data.target_contact = nameTitleMatch[1].trim();
        data.target_title = nameTitleMatch[2].trim();
      } else {
        data.target_contact = contactParts;
      }
    }

    const signalsMatch = authorityText.match(/\*?\*?Recent Signals:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (signalsMatch) data.recent_signals = signalsMatch[1].trim();

    const authorityLineMatch = authorityText.match(
      /\*?\*?Authority Line:?\*?\*?\s*:?\s*([\s\S]+?)(?=\n\n|$)/i
    );
    if (authorityLineMatch) data.authority_line = authorityLineMatch[1].trim();
  }

  // Extract Prospect Psychology
  const psychMatch = markdown.match(
    /(?:🧠\s*)?Prospect Psychology\s*\(?PRO\)?\s*([\s\S]+?)(?=(?:🔍|##\s*Pain|$))/i
  );
  if (psychMatch) {
    const psychText = psychMatch[1];

    const successMatch = psychText.match(/\*?\*?Success Metrics:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (successMatch) data.psychology_success = successMatch[1].trim();

    const fearsMatch = psychText.match(/\*?\*?Fears:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (fearsMatch) data.psychology_fears = fearsMatch[1].trim();

    const needMatch = psychText.match(/\*?\*?What They Need to Hear:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (needMatch) data.psychology_need = needMatch[1].trim();

    const yesMatch = psychText.match(/\*?\*?What Makes Them Say Yes:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (yesMatch) data.psychology_yes = yesMatch[1].trim();
  }

  // Extract Pain / Impact Probes
  const probesMatch = markdown.match(
    /(?:🔍\s*)?Pain\s*\/?\s*Impact Probes?\s*\(?\d*\s*total[^)]*\)?\s*([\s\S]+?)(?=(?:🎣|##\s*Market|$))/i
  );
  if (probesMatch) {
    const probesText = probesMatch[1];
    const { primary, secondary } = extractProbesPro(probesText);
    data.primary_probes = primary;
    data.secondary_probes = secondary;
  }

  // Extract Market & Competitor Hooks
  const hooksMatch = markdown.match(
    /(?:🎣\s*)?Market\s*&?\s*Competitor Hooks?\s*\(?\d*-?\d*[^)]*\)?\s*([\s\S]+?)(?=(?:🥊|##\s*Competitor|$))/i
  );
  if (hooksMatch) {
    data.hooks = extractHooks(hooksMatch[1]);
  }

  // Extract Competitor Set (Pro has more structured format)
  const competitorsMatch = markdown.match(
    /(?:🥊\s*)?Competitor (?:Set|Positioning)\s*\(?\w*\s*\d*[^)]*\)?\s*([\s\S]+?)(?=(?:❤️|##\s*Emotional|$))/i
  );
  if (competitorsMatch) {
    data.competitors = extractCompetitorsPro(competitorsMatch[1]);
  }

  // Extract Emotional / Identity Probe
  const emotionalMatch = markdown.match(
    /(?:❤️\s*)?Emotional\s*\/?\s*Identity Probe\s*\(?PRO\)?\s*([\s\S]+?)(?=(?:⚡|##\s*Quick Discovery|$))/i
  );
  if (emotionalMatch) {
    const quoteMatch = emotionalMatch[1].match(/[""]([^""]+)[""]/);
    if (quoteMatch) {
      data.emotional_probe = quoteMatch[1].trim();
    } else {
      data.emotional_probe = emotionalMatch[1].trim();
    }
  }

  // Extract Quick Discovery Flow
  const flowMatch = markdown.match(
    /(?:⚡\s*)?Quick Discovery Flow\s*\(?\d*\s*Steps?[^)]*\)?\s*([\s\S]+?)(?=(?:🗺️|##\s*Conversation|$))/i
  );
  if (flowMatch) {
    data.flow_steps = extractFlowSteps(flowMatch[1]);
  }

  // Extract Conversation Decision Tree
  const decisionMatch = markdown.match(
    /(?:🗺️\s*)?Conversation Decision Tree\s*\(?PRO\)?\s*([\s\S]+?)(?=(?:🔍.*Google|##\s*What They|$))/i
  );
  if (decisionMatch) {
    data.decision_branches = extractDecisionBranches(decisionMatch[1]);
  }

  // Extract What They'll Google
  const googleMatch = markdown.match(
    /(?:🔍\s*)?What They['']ll Google\s*\(?PRO\)?\s*([\s\S]+?)(?=(?:🎬|##\s*Opening|$))/i
  );
  if (googleMatch) {
    data.google_items = extractGoogleItems(googleMatch[1]);
  }

  // Extract Opening 60 Seconds
  const openingMatch = markdown.match(
    /(?:🎬\s*)?Opening 60 Seconds?\s*\(?PRO\)?\s*([\s\S]+?)(?=(?:👉|##\s*Call Objective|$))/i
  );
  if (openingMatch) {
    data.opening_parts = extractOpeningParts(openingMatch[1]);
  }

  // Extract Call Objective & Success Metrics
  const objectivesMatch = markdown.match(
    /(?:👉\s*)?Call Objective\s*&?\s*Success Metrics?\s*\(?PRO\)?\s*([\s\S]+?)(?=(?:📋|##\s*Post-?Call|$))/i
  );
  if (objectivesMatch) {
    const objText = objectivesMatch[1];

    const primaryMatch = objText.match(/\*?\*?Primary Objective:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (primaryMatch) data.primary_objective = primaryMatch[1].trim();

    const secondaryMatch = objText.match(/\*?\*?Secondary Objective:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (secondaryMatch) data.secondary_objective = secondaryMatch[1].trim();

    const redMatch = objText.match(/\*?\*?Red Flags:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (redMatch) data.red_flags = redMatch[1].trim();

    const greenMatch = objText.match(/\*?\*?Green Lights:?\*?\*?\s*:?\s*(.+?)(?:\n|$)/i);
    if (greenMatch) data.green_lights = greenMatch[1].trim();
  }

  // Extract Post-Call Actions
  const actionsMatch = markdown.match(
    /(?:📋\s*)?Post-?Call Actions?\s*\(?PRO\)?\s*([\s\S]+?)(?=$)/i
  );
  if (actionsMatch) {
    data.actions = extractActions(actionsMatch[1]);
  }

  return data;
}

/**
 * Extract probes with primary/secondary split
 */
function extractProbesPro(text: string): { primary: ProbeData[]; secondary: ProbeData[] } {
  const primary: ProbeData[] = [];
  const secondary: ProbeData[] = [];

  // Split by primary/secondary headers if present
  const primarySection = text.match(/Primary\s*Probes?\s*[\[\(]?\d*[\]\)]?\s*([\s\S]+?)(?=Secondary|$)/i);
  const secondarySection = text.match(/Secondary\s*Probes?\s*[\[\(]?\d*[\]\)]?\s*([\s\S]+?)$/i);

  if (primarySection) {
    primary.push(...extractProbesFromSection(primarySection[1], 'PRIMARY'));
  }
  if (secondarySection) {
    secondary.push(...extractProbesFromSection(secondarySection[1], 'SECONDARY'));
  }

  // Fallback: if no sections found, try to extract all
  if (primary.length === 0 && secondary.length === 0) {
    const allProbes = extractProbesFromSection(text, 'PRIMARY');
    const split = Math.ceil(allProbes.length * 0.625); // 5 primary, 3 secondary for 8 total
    primary.push(...allProbes.slice(0, split));
    secondary.push(
      ...allProbes.slice(split).map((p) => ({ ...p, tag: 'SECONDARY' }))
    );
  }

  return { primary, secondary };
}

function extractProbesFromSection(text: string, defaultTag: string): ProbeData[] {
  const probes: ProbeData[] = [];

  const probeRegex =
    /(\d+)\.\s*\*?\*?\[?(Primary|Secondary)\]?\*?\*?\s*(.+?)(?:→|->|Follow-?up:?)\s*(.+?)(?=\n\d+\.|$)/gis;

  let match;
  while ((match = probeRegex.exec(text)) !== null) {
    probes.push({
      tag: (match[2] || defaultTag).toUpperCase(),
      question: match[3].trim().replace(/^\*\*|\*\*$/g, ''),
      followup: match[4].trim(),
    });
  }

  return probes;
}

/**
 * Extract hooks
 */
function extractHooks(text: string): HookData[] {
  const hooks: HookData[] = [];
  const hookRegex = /\*\*(.+?)\*\*\s*(.+?)(?=\*\*|$)/gs;

  let match;
  while ((match = hookRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const description = match[2].trim();
    if (name && description) {
      hooks.push({ name, description });
    }
  }

  return hooks;
}

/**
 * Extract competitors with Pro format
 */
function extractCompetitorsPro(text: string): CompetitorProData[] {
  const competitors: CompetitorProData[] = [];

  // Match competitor blocks
  const competitorBlocks = text.split(/\*\*\[?([A-Za-z][^\]]*?)\]?\*\*/g).filter(Boolean);

  for (let i = 0; i < competitorBlocks.length; i += 2) {
    const name = competitorBlocks[i]?.trim();
    const content = competitorBlocks[i + 1];

    if (!name || !content) continue;

    const strengthMatch = content.match(/(?:What they'?r?e? good at|Good at):?\s*(.+?)(?:\n|$)/i);
    const weaknessMatch = content.match(/(?:Where they fall short|Falls? short):?\s*(.+?)(?:\n|$)/i);
    const positionMatch = content.match(/(?:How to position|Position):?\s*(.+?)(?:\n|$)/i);
    const questionMatch = content.match(/(?:The question|Question):?\s*[""]?(.+?)[""]?(?:\n|$)/i);

    competitors.push({
      name,
      strength: strengthMatch?.[1]?.trim() || '',
      weakness: weaknessMatch?.[1]?.trim() || '',
      positioning: positionMatch?.[1]?.trim() || '',
      question: questionMatch?.[1]?.trim() || '',
    });
  }

  return competitors;
}

/**
 * Extract flow steps
 */
function extractFlowSteps(text: string): FlowStepData[] {
  const steps: FlowStepData[] = [];
  const stepRegex = /(\d+)\.\s*\*\*(.+?)\*\*\s*(?:[""](.+?)[""]|(.+?))(?=\n\d+\.|$)/gs;

  let match;
  while ((match = stepRegex.exec(text)) !== null) {
    steps.push({
      title: match[2].trim(),
      script: (match[3] || match[4] || '').trim(),
    });
  }

  return steps;
}

/**
 * Extract decision tree branches
 */
function extractDecisionBranches(text: string): DecisionBranchData[] {
  const branches: DecisionBranchData[] = [];

  // Match "If they..." patterns
  const branchRegex =
    /\*\*If they['']?r?e?\s*(.+?)\.\.\.\*\*\s*(?:[-•]?\s*Guidance:?\s*(.+?))?\s*(?:[-•]?\s*Script:?\s*)?[""](.+?)[""]/gis;

  let match;
  while ((match = branchRegex.exec(text)) !== null) {
    branches.push({
      condition: `If they ${match[1].trim()}...`,
      guidance: match[2]?.trim() || '',
      script: match[3].trim(),
    });
  }

  return branches;
}

/**
 * Extract Google items
 */
function extractGoogleItems(text: string): GoogleItemData[] {
  const items: GoogleItemData[] = [];

  const searchMatch = text.match(/What they['']ll search(?: for)?:?\s*(.+?)(?:\n|$)/i);
  if (searchMatch) {
    items.push({ label: "WHAT THEY'LL SEARCH", value: searchMatch[1].trim() });
  }

  const findMatch = text.match(/What you want them to find:?\s*(.+?)(?:\n|$)/i);
  if (findMatch) {
    items.push({ label: 'WHAT YOU WANT THEM TO FIND', value: findMatch[1].trim() });
  }

  const seedsMatch = text.match(/Seeds to plant:?\s*(.+?)(?:\n|$)/i);
  if (seedsMatch) {
    items.push({ label: 'SEEDS TO PLANT', value: seedsMatch[1].trim() });
  }

  return items;
}

/**
 * Extract opening script parts
 */
function extractOpeningParts(text: string): OpeningPartData[] {
  const parts: OpeningPartData[] = [];

  const authorityMatch = text.match(/\*?\*?Authority Frame[^:]*:?\*?\*?\s*[""]?(.+?)[""]?(?:\n|$)/i);
  if (authorityMatch) {
    parts.push({ label: 'AUTHORITY FRAME (15 sec)', script: authorityMatch[1].trim() });
  }

  const reasonMatch = text.match(/\*?\*?Reason for (?:Call|reaching out)[^:]*:?\*?\*?\s*[""]?(.+?)[""]?(?:\n|$)/i);
  if (reasonMatch) {
    parts.push({ label: 'REASON FOR CALL (15 sec)', script: reasonMatch[1].trim() });
  }

  const permissionMatch = text.match(/\*?\*?Permission Question[^:]*:?\*?\*?\s*[""]?(.+?)[""]?(?:\n|$)/i);
  if (permissionMatch) {
    parts.push({ label: 'PERMISSION QUESTION (10 sec)', script: permissionMatch[1].trim() });
  }

  const transitionMatch = text.match(/\*?\*?Transition[^:]*:?\*?\*?\s*[""]?(.+?)[""]?(?:\n|$)/i);
  if (transitionMatch) {
    parts.push({ label: 'TRANSITION (10 sec)', script: transitionMatch[1].trim() });
  }

  return parts;
}

/**
 * Extract post-call actions
 */
function extractActions(text: string): ActionData[] {
  const actions: ActionData[] = [];

  const actionRegex = /(\d+)\.\s*\*?\*?(.+?):?\*?\*?\s*(?:\[(.+?)\]|:)\s*(.+?)(?=\n\d+\.|$)/gis;

  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    const timing = match[2]?.trim() || match[3]?.trim() || '';
    const action = match[4]?.trim() || '';

    if (timing && action) {
      actions.push({ timing, action });
    }
  }

  // Fallback simpler pattern
  if (actions.length === 0) {
    const simpleRegex = /(\d+)\.\s*(.+?):\s*(.+?)(?=\n\d+\.|$)/gs;
    while ((match = simpleRegex.exec(text)) !== null) {
      actions.push({
        timing: match[2].trim(),
        action: match[3].trim(),
      });
    }
  }

  return actions;
}
