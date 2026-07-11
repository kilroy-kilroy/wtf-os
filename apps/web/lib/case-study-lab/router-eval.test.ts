// Archetype-router eval harness — Build-sequence step 1.
// (docs/superpowers/specs/2026-07-11-case-study-lab-pro-design.md)
//
// Classifies all 72 labeled case studies with the live router and reports
// agreement with the ground-truth Primary archetype. Per the spec: "The router
// is only trustworthy if it reproduces the labeled set." If accuracy is low,
// STOP and fix the taxonomy before building the rest of Pro.
//
// GATED + LIVE: this hits the Anthropic API 72× and costs money, so it is
// skipped unless RUN_ROUTER_EVAL=1. It never runs in CI. Run it yourself with:
//
//   RUN_ROUTER_EVAL=1 ANTHROPIC_API_KEY=sk-... \
//     npx vitest run lib/case-study-lab/router-eval.test.ts
//
// FAIRNESS NOTE: the router only ever sees inputs a real agency owner would
// give — the discipline (Category + Service) and a plain-notes reconstruction of
// the win built from FACTUAL columns only (problem, insight, deliverables,
// metrics, timeline, quote/before-after presence). It never sees the graded or
// label columns (POV grade, Buying-Committee, Why-Us, Overall Score, and of
// course Primary/Secondary Archetype). Nothing leaks the answer.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classifyArchetype } from "@/lib/case-study-lab/router";
import { ARCHETYPES, type Archetype } from "@repo/prompts";

const RUN = process.env.RUN_ROUTER_EVAL === "1";
const CONCURRENCY = Number(process.env.ROUTER_EVAL_CONCURRENCY ?? "6");

const CSV_PATH = fileURLToPath(
  new URL(
    "../../../../docs/research/agency-case-studies-72-labeled.csv",
    import.meta.url
  )
);

// ── Minimal RFC-4180 CSV parser (quoted fields, "" escapes, commas in quotes) ──
function parseCsv(text: string): string[][] {
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

function toArchetype(label: string): Archetype | "none" | null {
  const key = label.trim().toLowerCase();
  if (key === "" || key === "none" || key === "n/a") return "none";
  return LABEL_TO_ARCHETYPE[key] ?? null;
}

// "Y: 2.5 yrs" -> "2.5 yrs"; "N", "N(CEO paraphrased)" -> "no"; "Y" -> "yes".
function presence(raw: string): { yes: boolean; detail: string } {
  const v = (raw ?? "").trim();
  if (/^n\b/i.test(v) || v === "" || /^no\b/i.test(v)) return { yes: false, detail: "no" };
  const m = v.match(/^y\s*[:\-]?\s*(.*)$/i);
  if (m) return { yes: true, detail: m[1].trim() || "yes" };
  return { yes: true, detail: v };
}

// Build the plain-notes "win" a real owner would paste — factual fields only.
function buildRawWin(get: (col: string) => string): string {
  const mkt = presence(get("Marketing Metrics"));
  const biz = presence(get("Business Metrics"));
  const timeline = presence(get("Timeline"));
  const quote = presence(get("Client Quote"));
  const beforeAfter = presence(get("Before/After"));
  const lines = [
    `What the client was struggling with: ${get("Specific Problem") || "(not stated)"}`,
    `Our strategic insight / approach: ${get("Strategic Insight") || "(not stated)"}`,
    `What we delivered: ${get("Deliverables Shown") || "(not stated)"}`,
    `Marketing metrics we can show: ${mkt.yes ? mkt.detail : "none"}`,
    `Business metrics we can show: ${biz.yes ? biz.detail : "none"}`,
    `Timeline / duration: ${timeline.yes ? timeline.detail : "not a factor / short"}`,
    `Do we have a verbatim client quote? ${quote.yes ? "yes" : "no"}`,
    `Can we show a before/after? ${beforeAfter.yes ? "yes" : "no"}`,
  ];
  return lines.join("\n");
}

async function mapPool<T, R>(
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

describe.skipIf(!RUN)("archetype router eval (72 labeled studies)", () => {
  it(
    "reproduces the ground-truth Primary archetype",
    async () => {
      const raw = parseCsv(readFileSync(CSV_PATH, "utf8"));
      const header = raw[0].map((h) => h.trim());
      const idx = (col: string) => {
        const i = header.indexOf(col);
        if (i === -1) throw new Error(`CSV column not found: "${col}"`);
        return i;
      };
      const rows = raw.slice(1);

      type Case = {
        n: string;
        agency: string;
        client: string;
        discipline: string;
        rawWin: string;
        truthPrimary: Archetype;
        truthSecondary: Archetype | "none";
      };

      const cases: Case[] = [];
      for (const r of rows) {
        const get = (col: string) => (r[idx(col)] ?? "").trim();
        const truth = toArchetype(get("Primary Archetype"));
        if (truth === null) {
          console.warn(`Skipping row #${get("#")}: unknown Primary "${get("Primary Archetype")}"`);
          continue;
        }
        if (truth === "none") continue; // every study should have a primary
        cases.push({
          n: get("#"),
          agency: get("Agency"),
          client: get("Client"),
          discipline: [get("Category"), get("Service")].filter(Boolean).join(" — "),
          rawWin: buildRawWin(get),
          truthPrimary: truth,
          truthSecondary: (toArchetype(get("Secondary Archetype")) as Archetype | "none") ?? "none",
        });
      }

      console.log(`\nRouter eval: ${cases.length} studies, concurrency ${CONCURRENCY}\n`);

      const predictions = await mapPool(cases, CONCURRENCY, async (c) => {
        const out = await classifyArchetype({ discipline: c.discipline, rawWin: c.rawWin });
        return { c, out };
      });

      // ── Metrics ────────────────────────────────────────────────────────────
      let exact = 0; // predicted primary == truth primary
      let lenient = 0; // predicted primary OR secondary == truth primary
      let secondaryHit = 0; // predicted primary == truth's secondary (near-miss)
      const confusion: Record<string, Record<string, number>> = {};
      for (const a of ARCHETYPES) {
        confusion[a] = Object.fromEntries(ARCHETYPES.map((b) => [b, 0])) as Record<string, number>;
      }
      const misses: string[] = [];

      for (const { c, out } of predictions) {
        confusion[c.truthPrimary][out.archetype]++;
        const primaryMatch = out.archetype === c.truthPrimary;
        if (primaryMatch) exact++;
        if (primaryMatch || out.secondary === c.truthPrimary) lenient++;
        if (!primaryMatch && c.truthSecondary !== "none" && out.archetype === c.truthSecondary)
          secondaryHit++;
        if (!primaryMatch) {
          misses.push(
            `  #${c.n} ${c.agency}/${c.client} [${c.discipline}]\n` +
              `      truth: ${c.truthPrimary}(+${c.truthSecondary})  ->  ` +
              `router: ${out.archetype}(+${out.secondary}) [${out.confidence}]\n` +
              `      why: ${out.why}`
          );
        }
      }

      const n = predictions.length;
      const pct = (x: number) => `${((x / n) * 100).toFixed(1)}%`;

      // ── Confusion matrix (rows = truth, cols = predicted) ────────────────────
      const short: Record<Archetype, string> = {
        proof: "proof",
        transformation: "trans",
        big_idea: "bigid",
        craft: "craft",
        method: "methd",
      };
      const head = ARCHETYPES.map((a) => short[a].padStart(6)).join("");
      console.log("Confusion matrix (row = truth, col = predicted):");
      console.log(`  truth\\pred ${head}   | total`);
      for (const t of ARCHETYPES) {
        const total = ARCHETYPES.reduce((s, p) => s + confusion[t][p], 0);
        const cells = ARCHETYPES.map((p) => String(confusion[t][p]).padStart(6)).join("");
        console.log(`  ${short[t].padEnd(10)}${cells}   | ${total}`);
      }

      // ── Per-class recall ─────────────────────────────────────────────────────
      console.log("\nPer-archetype recall (correct / truth-count):");
      for (const t of ARCHETYPES) {
        const total = ARCHETYPES.reduce((s, p) => s + confusion[t][p], 0);
        if (total === 0) continue;
        const correct = confusion[t][t];
        console.log(`  ${short[t].padEnd(10)} ${correct}/${total}  (${((correct / total) * 100).toFixed(0)}%)`);
      }

      console.log("\nMisclassifications:");
      console.log(misses.length ? misses.join("\n") : "  (none)");

      console.log(
        `\nSUMMARY  exact=${exact}/${n} (${pct(exact)})   ` +
          `lenient[primary∈{pred,secondary}]=${lenient}/${n} (${pct(lenient)})   ` +
          `truth-secondary caught=${secondaryHit}\n`
      );

      // Real gate: 5-class random baseline is ~20%. A useful router must clear a
      // low floor here; the printed accuracy is the number that decides go/no-go.
      expect(exact / n).toBeGreaterThan(0.5);
    },
    600_000
  );
});
