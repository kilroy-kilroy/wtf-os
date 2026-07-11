// Shared eval plumbing for the Case Study Lab Pro router + scorer evals.
// PURE functions only (no fs / no import.meta) so this type-checks as a normal
// lib module; the *.test.ts files read the CSV and pass its text in. It is only
// ever imported by the gated *-eval.test.ts files, never by app code.
//
// The single honest input path both evals share: each labeled study is turned
// into the plain-notes "win" a real agency owner would paste, built from
// FACTUAL columns only (problem, insight, deliverables, metrics, timeline,
// quote/before-after presence). It never exposes the graded or label columns
// (POV grade, Buying-Committee, Why-Us, Overall Score, Primary/Secondary
// Archetype) — nothing leaks the router's or scorer's answer.

import type { Archetype } from "@repo/prompts";

export type LabeledCase = {
  n: string;
  agency: string;
  client: string;
  category: string;
  service: string;
  discipline: string; // Category + Service — what a real user tells the router
  rawWin: string; // factual plain-notes reconstruction of the win
  primary: Archetype; // ground-truth Primary archetype
  secondary: Archetype | "none"; // ground-truth Secondary archetype
  overallScore: number | null; // ground-truth 1-10 (scorer eval target)
};

// Minimal RFC-4180 CSV parser (quoted fields, "" escapes, commas in quotes).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (c === "\r") {
      // ignore; \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "");
}

const LABEL_TO_ARCHETYPE: Record<string, Archetype> = {
  "proof machine": "proof",
  "transformation story": "transformation",
  "big idea": "big_idea",
  "craft showcase": "craft",
  "method demonstration": "method",
};

export function toArchetype(label: string): Archetype | "none" | null {
  const key = label.trim().toLowerCase();
  if (key === "" || key === "none" || key === "n/a") return "none";
  return LABEL_TO_ARCHETYPE[key] ?? null;
}

// "Y: 2.5 yrs" -> {yes,"2.5 yrs"}; "N"/"N(paraphrased)" -> {no}; "Y" -> {yes}.
function presence(raw: string): { yes: boolean; detail: string } {
  const v = (raw ?? "").trim();
  if (/^n\b/i.test(v) || v === "" || /^no\b/i.test(v)) return { yes: false, detail: "no" };
  const m = v.match(/^y\s*[:\-]?\s*(.*)$/i);
  if (m) return { yes: true, detail: m[1].trim() || "yes" };
  return { yes: true, detail: v };
}

// The plain-notes "win" a real owner would paste — factual fields only.
function buildRawWin(get: (col: string) => string): string {
  const mkt = presence(get("Marketing Metrics"));
  const biz = presence(get("Business Metrics"));
  const timeline = presence(get("Timeline"));
  const quote = presence(get("Client Quote"));
  const beforeAfter = presence(get("Before/After"));
  return [
    `What the client was struggling with: ${get("Specific Problem") || "(not stated)"}`,
    `Our strategic insight / approach: ${get("Strategic Insight") || "(not stated)"}`,
    `What we delivered: ${get("Deliverables Shown") || "(not stated)"}`,
    `Marketing metrics we can show: ${mkt.yes ? mkt.detail : "none"}`,
    `Business metrics we can show: ${biz.yes ? biz.detail : "none"}`,
    `Timeline / duration: ${timeline.yes ? timeline.detail : "not a factor / short"}`,
    `Do we have a verbatim client quote? ${quote.yes ? "yes" : "no"}`,
    `Can we show a before/after? ${beforeAfter.yes ? "yes" : "no"}`,
  ].join("\n");
}

// Parse the labeled CSV into fully-built cases. Rows with an unknown or missing
// Primary archetype are skipped (logged), since every study must have a primary.
export function loadLabeledCases(csvText: string): LabeledCase[] {
  const raw = parseCsv(csvText);
  const header = raw[0].map((h) => h.trim());
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`CSV column not found: "${name}"`);
    return i;
  };
  const cases: LabeledCase[] = [];
  for (const r of raw.slice(1)) {
    const get = (name: string) => (r[col(name)] ?? "").trim();
    const primary = toArchetype(get("Primary Archetype"));
    if (primary === null) {
      console.warn(`Skipping row #${get("#")}: unknown Primary "${get("Primary Archetype")}"`);
      continue;
    }
    if (primary === "none") continue;
    const scoreN = parseInt(get("Overall Score"), 10);
    cases.push({
      n: get("#"),
      agency: get("Agency"),
      client: get("Client"),
      category: get("Category"),
      service: get("Service"),
      discipline: [get("Category"), get("Service")].filter(Boolean).join(" — "),
      rawWin: buildRawWin(get),
      primary,
      secondary: (toArchetype(get("Secondary Archetype")) as Archetype | "none") ?? "none",
      overallScore: Number.isFinite(scoreN) ? scoreN : null,
    });
  }
  return cases;
}

// Bounded-concurrency map — run API-bound work N-at-a-time, preserving order.
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
