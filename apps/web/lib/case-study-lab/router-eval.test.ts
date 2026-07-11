// Archetype-router eval harness — Build-sequence step 1.
// (docs/superpowers/specs/2026-07-11-case-study-lab-pro-design.md)
//
// Classifies all 72 labeled case studies with the live router and reports
// agreement with the ground-truth Primary archetype. Per the spec: "The router
// is only trustworthy if it reproduces the labeled set." If accuracy is low,
// STOP and fix the taxonomy before building the rest of Pro.
//
// GATED + LIVE: hits the Anthropic API 72×, so it's skipped unless
// RUN_ROUTER_EVAL=1. It never runs in CI. Run it yourself with:
//
//   RUN_ROUTER_EVAL=1 ANTHROPIC_API_KEY=sk-... \
//     npx vitest run lib/case-study-lab/router-eval.test.ts
//
// Fairness: the router only sees inputs a real owner would give — see the note
// in eval-fixtures.ts. Nothing leaks the answer.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classifyArchetype } from "@/lib/case-study-lab/router";
import { loadLabeledCases, mapPool } from "@/lib/case-study-lab/eval-fixtures";
import { ARCHETYPES, type Archetype } from "@repo/prompts";

const RUN = process.env.RUN_ROUTER_EVAL === "1";
const CONCURRENCY = Number(process.env.ROUTER_EVAL_CONCURRENCY ?? "6");

const CSV_PATH = fileURLToPath(
  new URL("../../../../docs/research/agency-case-studies-72-labeled.csv", import.meta.url)
);

const SHORT: Record<Archetype, string> = {
  proof: "proof",
  transformation: "trans",
  big_idea: "bigid",
  craft: "craft",
  method: "methd",
};

describe.skipIf(!RUN)("archetype router eval (72 labeled studies)", () => {
  it(
    "reproduces the ground-truth Primary archetype",
    async () => {
      const cases = loadLabeledCases(readFileSync(CSV_PATH, "utf8"));
      console.log(`\nRouter eval: ${cases.length} studies, concurrency ${CONCURRENCY}\n`);

      const predictions = await mapPool(cases, CONCURRENCY, async (c) => ({
        c,
        out: await classifyArchetype({ discipline: c.discipline, rawWin: c.rawWin }),
      }));

      let exact = 0; // predicted primary == truth primary
      let lenient = 0; // predicted primary OR secondary == truth primary
      let secondaryHit = 0; // predicted primary == truth's secondary (near-miss)
      const confusion: Record<string, Record<string, number>> = {};
      for (const a of ARCHETYPES) {
        confusion[a] = Object.fromEntries(ARCHETYPES.map((b) => [b, 0])) as Record<string, number>;
      }
      const misses: string[] = [];

      for (const { c, out } of predictions) {
        confusion[c.primary][out.archetype]++;
        const primaryMatch = out.archetype === c.primary;
        if (primaryMatch) exact++;
        if (primaryMatch || out.secondary === c.primary) lenient++;
        if (!primaryMatch && c.secondary !== "none" && out.archetype === c.secondary) secondaryHit++;
        if (!primaryMatch) {
          misses.push(
            `  #${c.n} ${c.agency}/${c.client} [${c.discipline}]\n` +
              `      truth: ${c.primary}(+${c.secondary})  ->  ` +
              `router: ${out.archetype}(+${out.secondary}) [${out.confidence}]\n` +
              `      why: ${out.why}`
          );
        }
      }

      const n = predictions.length;
      const pct = (x: number) => `${((x / n) * 100).toFixed(1)}%`;

      const head = ARCHETYPES.map((a) => SHORT[a].padStart(6)).join("");
      console.log("Confusion matrix (row = truth, col = predicted):");
      console.log(`  truth\\pred ${head}   | total`);
      for (const t of ARCHETYPES) {
        const total = ARCHETYPES.reduce((s, p) => s + confusion[t][p], 0);
        const cells = ARCHETYPES.map((p) => String(confusion[t][p]).padStart(6)).join("");
        console.log(`  ${SHORT[t].padEnd(10)}${cells}   | ${total}`);
      }

      console.log("\nPer-archetype recall (correct / truth-count):");
      for (const t of ARCHETYPES) {
        const total = ARCHETYPES.reduce((s, p) => s + confusion[t][p], 0);
        if (total === 0) continue;
        console.log(
          `  ${SHORT[t].padEnd(10)} ${confusion[t][t]}/${total}  (${((confusion[t][t] / total) * 100).toFixed(0)}%)`
        );
      }

      console.log("\nMisclassifications:");
      console.log(misses.length ? misses.join("\n") : "  (none)");

      console.log(
        `\nSUMMARY  exact=${exact}/${n} (${pct(exact)})   ` +
          `lenient[primary∈{pred,secondary}]=${lenient}/${n} (${pct(lenient)})   ` +
          `truth-secondary caught=${secondaryHit}\n`
      );

      // Real gate: 5-class random baseline is ~20%. A useful router clears this
      // floor; the printed accuracy is the number that decides go/no-go.
      expect(exact / n).toBeGreaterThan(0.5);
    },
    600_000
  );
});
