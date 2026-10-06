/** Render the complete saved result; never silently drop sections via legacy parsers. */
export function exportMarkdown(saved: string): string {
 let report: any;
 try { const parsed=JSON.parse(saved); report=parsed.report || parsed; } catch { return saved; }
 if (!report.snapTake) return saved;
 return [
  '# CALL LAB PRO',
  `**Score:** ${report.meta?.overallScore ?? 'Not observed'} / 100`,
  '## THE ONE THING', report.nextSteps?.actions?.[0] || report.snapTake.tldr,
  '## CALL REVIEW', report.snapTake.tldr, report.snapTake.analysis,
  '## OBSERVED SCORES', ...Object.entries(report.scores || {}).map(([k,v])=>`- ${k}: ${v ?? 'Not observed'}`),
  '## PATTERNS', ...(report.patterns || []).map((p:any)=>`### ${p.patternName}\n${p.tldr || ''}\n${(p.recommendedFixes || []).join('\n')}`),
  '## PRACTICE', ...(report.tacticalRewrites?.items || []).map((x:any)=>`### ${x.context}\n${x.evidenceType === 'verbatim' ? `Verbatim, line ${x.sourceLine}` : 'Paraphrase / unverified wording'}: ${x.whatYouSaid}\n\n${x.whyItMissed}\n\nTry: ${x.strongerAlternative}`),
  '## NEXT STEPS', ...(report.nextSteps?.actions || []),
  '## FOLLOW-UP DRAFT',report.followUpEmail?.subject || '',report.followUpEmail?.body || '',
 ].join('\n\n');
}
export const escapeHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function exportHtml(markdown: string): string {
 // Escaped text blocks keep source URLs and every section. No external assets.
 const body=markdown.split('\n').map(line=> {
  const heading=line.match(/^(#{1,3})\s+(.*)$/);
  if (heading) return `<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`;
  return `<div class="line">${escapeHtml(line).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>') || '&nbsp;'}</div>`;
 }).join('\n');
 return `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:20mm}body{font:14px/1.5 Arial;color:#222;max-width:760px;margin:0 auto}h1{border-bottom:3px solid #e51b23;padding-bottom:12px}h2{margin-top:24px;color:#b01520}.line{white-space:pre-wrap;overflow-wrap:anywhere}h1,h2,h3{break-after:avoid}</style></head><body>${body}</body></html>`;
}
