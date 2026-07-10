import { ImageResponse } from "next/og";
import { getReport } from "@/lib/case-study-lab/db";
import { CARD_SIZES, buildCardModel, type CardSize } from "@/components/case-study-lab/cardModel";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const sizeParam = new URL(req.url).searchParams.get("size") as CardSize | null;
  const size = sizeParam && sizeParam in CARD_SIZES ? sizeParam : "portrait";
  const dims = CARD_SIZES[size];

  const report = await getReport(id);
  if (!report || !report.result) {
    return new Response("Not found", { status: 404 });
  }
  const m = buildCardModel(report);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0b",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* Co-branded header — agency (left) × client (right) */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {m.agencyLogoUrl ? (
            <img
              src={m.agencyLogoUrl}
              alt={m.agencyName ?? "Agency"}
              style={{ height: 72, width: "auto", objectFit: "contain" }}
            />
          ) : m.agencyName ? (
            <div style={{ display: "flex", fontSize: 40, fontWeight: 900, color: "#ffffff" }}>
              {m.agencyName}
            </div>
          ) : null}

          {(m.agencyLogoUrl || m.agencyName) ? (
            <div style={{ display: "flex", fontSize: 44, color: "#4a4a4a" }}>×</div>
          ) : null}

          {m.clientLogoUrl ? (
            <img
              src={m.clientLogoUrl}
              alt={m.clientName}
              style={{ height: 72, width: "auto", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                background: m.accent,
                borderRadius: 12,
                fontSize: 40,
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              {m.clientName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 28, color: "#9aa0a6", display: "flex" }}>{m.clientDescriptor}</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: "#ffffff", lineHeight: 1.05, display: "flex" }}>
            {m.headline}
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {m.topResults.map((r, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: m.accent, display: "flex" }}>{r.value}</div>
              <div style={{ fontSize: 24, color: "#c8c8c8", display: "flex" }}>{r.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {m.quote ? (
            <div style={{ fontSize: 28, color: "#e6e6e6", fontStyle: "italic", display: "flex" }}>
              {`"${m.quote.text}"`}
            </div>
          ) : null}
          <div style={{ fontSize: 26, color: m.accent, fontWeight: 700, display: "flex" }}>{m.cta}</div>
          {/* No Tim/Case Study Lab mark on the downloadable asset — it carries the
              agency's client logo and goes to their prospects. Locked decision
              (see 2026-06-24 spec). The hosted report page keeps the branding. */}
        </div>
      </div>
    ),
    dims
  );
}
