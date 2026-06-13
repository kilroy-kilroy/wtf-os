import { ImageResponse } from "next/og";
import { getAnalysis } from "@/lib/wah-wah/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  const score = analysis?.score ?? 0;
  let hostname = "";
  try {
    hostname = analysis ? new URL(analysis.url).hostname : "";
  } catch {
    hostname = analysis?.url ?? "";
  }
  // Brand score colors: ≥70 red, 40-69 yellow, <40 green.
  const color = score >= 70 ? "#E51B23" : score >= 40 ? "#FFDE59" : "#22c55e";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          gap: 24,
        }}
      >
        {/* Satori requires a single text child per div unless display:flex is explicit */}
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#B3B3B3", textTransform: "uppercase" }}>
          {`Wah-Wah Score — ${hostname}`}
        </div>
        <div style={{ fontSize: 220, fontWeight: 900, color }}>{`${score}%`}</div>
        <div style={{ fontSize: 32, color: "#ffffff" }}>
          How much of your homepage says absolutely nothing
        </div>
        <div style={{ fontSize: 24, color: "#808080" }}>wah-wah by timkilroy.com</div>
      </div>
    ),
    size
  );
}
