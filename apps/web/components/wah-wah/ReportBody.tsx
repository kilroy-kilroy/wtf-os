import { ConsolePanel, ConsoleHeading } from "@/components/console";

type Flag = { phrase: string; context: string; underneath: string };
export type WahWahResult = { flags: Flag[]; rewrite_teaser: string };

export default function ReportBody({ result }: { result: WahWahResult }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <ConsoleHeading level={2} variant="yellow">
        The {result.flags.length} worst offenders, and what a prospect actually hears
      </ConsoleHeading>
      {result.flags.map((f, i) => (
        <ConsolePanel key={i}>
          <p className="font-mono text-lg font-bold text-[#E51B23]">
            &ldquo;{f.phrase}&rdquo;
          </p>
          <p className="mt-1 font-poppins text-sm text-[#B3B3B3]">…{f.context}…</p>
          <p className="mt-3 font-poppins text-white">{f.underneath}</p>
        </ConsolePanel>
      ))}
      <ConsolePanel variant="red-highlight">
        <p className="font-anton uppercase tracking-widest text-white/80 text-sm">
          What you could say instead
        </p>
        <p className="mt-2 font-poppins text-xl font-medium text-white">
          {result.rewrite_teaser}
        </p>
        <p className="mt-4 font-poppins text-white/90">
          That one line came from a robot that read your homepage for 30 seconds.
          Imagine what comes out when the robot interviews you the way Tim does — your
          favorite clients, the one who made you want to quit, the thing clients got
          from you that was never on the invoice — then crawls your whole site and hands
          you the rewrite. That is Robot-Tim, and he is coming soon. The human version
          is taking clients now.
        </p>
        <a
          href="https://timkilroy.com/demand-os"
          className="mt-5 inline-block rounded bg-black px-5 py-2.5 font-anton uppercase tracking-wide text-white"
        >
          See how the human version works →
        </a>
      </ConsolePanel>
    </div>
  );
}
