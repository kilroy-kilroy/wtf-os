import { ImageResponse } from "next/og";
import type { CaseStudy } from "@repo/prompts";
import { getReport } from "@/lib/case-study-lab/db";
import { buildCardModel } from "@/components/case-study-lab/cardModel";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  const headline = report?.result ? (report.result as CaseStudy).headline : "Case Study";
  const accent = report?.result ? buildCardModel(report).accent : "#E51B23";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0b0b0b",
          padding: 64,
          gap: 16,
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#9aa0a6", textTransform: "uppercase" }}>
          Case Study
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, color: accent, lineHeight: 1.05 }}>{headline}</div>
        <div style={{ fontSize: 22, color: "#808080" }}>Built with Case Study Lab · timkilroy.com</div>
      </div>
    ),
    size
  );
}
