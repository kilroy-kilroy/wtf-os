import { ConsolePanel, ConsoleHeading } from "@/components/console";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function ScoreCard({
  score,
  verdict,
  url,
}: {
  score: number;
  verdict: string;
  url: string;
}) {
  const hostname = hostnameOf(url);
  // ≥70 = fail (red), 40-69 = warn (yellow), <40 = pass (green)
  const tone =
    score >= 70
      ? "text-scorecard-fail"
      : score >= 40
      ? "text-scorecard-warn"
      : "text-scorecard-pass";

  return (
    <ConsolePanel className="w-full text-center">
      <p className="font-anton uppercase tracking-widest text-[#B3B3B3] text-sm">
        Wah-Wah Score — {hostname}
      </p>
      <p className={`font-anton tabular-nums leading-none my-4 text-8xl ${tone}`}>
        {score}
        <span className="text-5xl align-top">%</span>
      </p>
      <ConsoleHeading level={2} className="mx-auto max-w-xl normal-case">
        {verdict}
      </ConsoleHeading>
    </ConsolePanel>
  );
}
