// packages/pdf/robot-tim-html-report.ts
export interface RobotTimReportData {
  hostname: string;
  spine: {
    whoFor: string; whoNotFor: string; problemTheyThink: string; problemTheyHave: string;
    valueNotBought: string; traps: string[]; headlines: string[]; vvvOneLiner: string;
  };
  makeover: { beforeHero: string; afterHero: string; punchList: { url: string; fixes: string[] }[] };
  node7: { punchList: string[]; ladder: string };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

export function generateRobotTimHTML(data: RobotTimReportData): string {
  const { spine, makeover, node7 } = data;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.5}
    h1{font-size:28px} h2{font-size:20px;margin-top:32px;border-bottom:2px solid #D75A3F;padding-bottom:4px}
    .label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;margin-top:16px}
    .val{font-size:15px;margin-top:2px}
  </style></head><body>
    <h1>Robot-Tim Positioning Spine — ${esc(data.hostname)}</h1>
    <h2>Your Narrative Spine</h2>
    <p class="label">Who this is for</p><p class="val">${esc(spine.whoFor)}</p>
    <p class="label">Who this is NOT for</p><p class="val">${esc(spine.whoNotFor)}</p>
    <p class="label">The problem they think they have</p><p class="val">${esc(spine.problemTheyThink)}</p>
    <p class="label">The problem they actually have</p><p class="val">${esc(spine.problemTheyHave)}</p>
    <p class="label">The value they did not buy</p><p class="val">${esc(spine.valueNotBought)}</p>
    <p class="label">Three traps</p>${ul(spine.traps)}
    <p class="label">Three headlines</p>${ul(spine.headlines)}
    <p class="label">Your VVV one-liner</p><p class="val">${esc(spine.vvvOneLiner)}</p>
    <h2>The Makeover</h2>
    <p class="label">Your hero today</p><p class="val">${esc(makeover.beforeHero)}</p>
    <p class="label">Your hero, rewritten</p><p class="val">${esc(makeover.afterHero)}</p>
    ${makeover.punchList.map((p) => `<p class="label">${esc(p.url)}</p>${ul(p.fixes)}`).join("")}
    <h2>Node 7 — Rip Me Apart</h2>
    ${ul(node7.punchList)}
    <p class="val">${esc(node7.ladder)}</p>
  </body></html>`;
}
