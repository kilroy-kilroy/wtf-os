// apps/web/components/robot-tim/Deliverable.tsx
import type { Makeover, Node7, Spine } from "@/lib/robot-tim/types";

export default function Deliverable({
  spine,
  makeover,
  node7,
}: {
  spine: Spine;
  makeover: Makeover;
  node7: Node7;
}) {
  return (
    <div className="flex w-full flex-col gap-10 text-white">
      <section className="flex flex-col gap-3">
        <h2 className="font-[Anton] text-3xl">Your Narrative Spine</h2>
        <Field label="Who this is for" value={spine.whoFor} />
        <Field label="Who this is NOT for" value={spine.whoNotFor} />
        <Field label="The problem they think they have" value={spine.problemTheyThink} />
        <Field label="The problem they actually have" value={spine.problemTheyHave} />
        <Field label="The value they did not buy" value={spine.valueNotBought} />
        <List label="Three traps" items={spine.traps} />
        <List label="Three 'am I in the right place' headlines" items={spine.headlines} />
        <Field label="Your VVV one-liner" value={spine.vvvOneLiner} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-[Anton] text-3xl">The Makeover</h2>
        <Field label="Your hero today" value={makeover.beforeHero} />
        <Field label="Your hero, rewritten" value={makeover.afterHero} />
        {makeover.punchList.map((p, i) => (
          <List key={i} label={p.url} items={p.fixes} />
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border-2 border-[#D75A3F] bg-zinc-900 p-6">
        <h2 className="font-[Anton] text-2xl">Node 7 — Rip Me Apart</h2>
        <List label="Where this still does not hold" items={node7.punchList} />
        <p className="mt-2 text-zinc-200">{node7.ladder}</p>
        <a href="https://timkilroy.com/demand-os"
          className="mt-2 inline-block self-start rounded-lg bg-[#D75A3F] px-5 py-2.5 font-semibold text-white">
          When you are ready for the human version →
        </a>
      </section>

      <a href="./export" className="text-sm text-[#00D4FF] underline">Download as PDF</a>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">{label}</p>
      <p className="mt-1 text-lg text-zinc-100">{value}</p>
    </div>
  );
}
function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF]">{label}</p>
      <ul className="mt-1 list-disc pl-6 text-zinc-100">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
