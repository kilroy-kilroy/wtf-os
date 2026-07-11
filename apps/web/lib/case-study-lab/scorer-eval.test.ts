// Scorer eval harness — Build-sequence step 2.
// (docs/superpowers/specs/2026-07-11-case-study-lab-pro-design.md)
//
// Scores all 72 labeled studies with the live scorer and compares each predicted
// 1-10 against the ground-truth "Overall Score". Uses each row's ground-truth
// Primary archetype (NOT the router) so this measures the SCORER in isolation.
//
// GATED + LIVE: hits the Anthropic API 72×, so it's skipped unless
// RUN_SCORER_EVAL=1. It never runs in CI. Run it yourself with:
//
//   RUN_SCORER_EVAL=1 ANTHROPIC_API_KEY=sk-... \
//     npx vitest run lib/case-study-lab/scorer-eval.test.ts
//
// Fairness note: the scorer grades the same factual reconstruction the router
// sees (eval-fixtures.ts) — presence of metrics/quote/timeline/etc., not the
// rendered prose or the human's quality grades. So this measures whether
// component-presence scoring TRACKS holistic human scores; expect meaningful
// correlation and a low error, not a perfect match (execution quality isn't in
// the inputs). The correlation + MAE are the go/no-go signal.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scoreDraft } from "@/lib/case-study-lab/score";
import { loadLabeledCases, mapPool } from "@/lib/case-study-lab/eval-fixtures";

const RUN = process.env.RUN_SCORER_EVAL === "1";
const CONCURRENCY = Number(process.env.SCORER_EVAL_CONCURRENCY ?? "6");

const CSV_PATH = fileURLToPath(
  new URL("../../../../docs/research/agency-case-studies-72-labeled.csv", import.meta.url)
);

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? NaN : num / den;
}

describe.skipIf(!RUN)("scorer eval (72 labeled studies)", () => {
  it(
    "predicted quality tracks the ground-truth Overall Score",
    async () => {
      const cases = loadLabeledCases(readFileSync(CSV_PATH, "utf8")).filter(
        (c) => c.overallScore !== null
      );
      console.log(`\nScorer eval: ${cases.length} studies with a ground-truth score, concurrency ${CONCURRENCY}\n`);

      const preds = await mapPool(cases, CONCURRENCY, async (c) => ({
        c,
        result: await scoreDraft({ archetype: c.primary, draft: c.rawWin }),
      }));

      const rows = preds.map(({ c, result }) => ({
        n: c.n,
        agency: c.agency,
        client: c.client,
        archetype: c.primary,
        truth: c.overallScore as number,
        pred: result.score,
        delta: result.score - (c.overallScore as number),
      }));

      const n = rows.length;
      const truths = rows.map((r) => r.truth);
      const predsN = rows.map((r) => r.pred);
      const mae = rows.reduce((s, r) => s + Math.abs(r.delta), 0) / n;
      const rmse = Math.sqrt(rows.reduce((s, r) => s + r.delta * r.delta, 0) / n);
      const within1 = rows.filter((r) => Math.abs(r.delta) <= 1).length;
      const within2 = rows.filter((r) => Math.abs(r.delta) <= 2).length;
      const bias = predsN.reduce((a, b) => a + b, 0) / n - truths.reduce((a, b) => a + b, 0) / n;
      const r = pearson(predsN, truths);
      const pct = (x: number) => `${((x / n) * 100).toFixed(1)}%`;

      // Worst 15 misses (largest |delta|) to eyeball where the rubric drifts.
      const worst = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 15);
      console.log("Largest score gaps (truth vs predicted):");
      console.log("  #     truth  pred  Δ     archetype        who");
      for (const w of worst) {
        console.log(
          `  ${w.n.padEnd(5)} ${String(w.truth).padStart(5)} ${String(w.pred).padStart(5)} ` +
            `${(w.delta > 0 ? "+" + w.delta : String(w.delta)).padStart(5)}  ${w.archetype.padEnd(15)}  ${w.agency}/${w.client}`
        );
      }

      // Predicted-vs-truth distribution, to catch a scorer that flattens to the mean.
      const meanTruth = truths.reduce((a, b) => a + b, 0) / n;
      const meanPred = predsN.reduce((a, b) => a + b, 0) / n;
      console.log(
        `\nMeans  truth=${meanTruth.toFixed(2)}  pred=${meanPred.toFixed(2)}  ` +
          `(bias ${bias >= 0 ? "+" : ""}${bias.toFixed(2)})`
      );

      console.log(
        `\nSUMMARY  n=${n}  MAE=${mae.toFixed(2)}  RMSE=${rmse.toFixed(2)}  ` +
          `Pearson r=${r.toFixed(2)}  within±1=${within1}/${n} (${pct(within1)})  ` +
          `within±2=${within2}/${n} (${pct(within2)})\n`
      );

      // Real gates: the scorer must be usefully calibrated, not noise.
      // 1-10 scale, dataset SD ~1.3 — a coach that's off by >2 on average is not
      // trustworthy. The printed MAE + r are the numbers that decide go/no-go.
      expect(mae).toBeLessThan(2.0);
      expect(r).toBeGreaterThan(0.3);
    },
    600_000
  );
});
